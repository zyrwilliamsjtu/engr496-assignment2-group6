#!/usr/bin/env node
/**
 * Merge Group 6 analysis (claims + patch) into project-group6.json.
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const {
  loadJson,
  P4_LEGAL_REASON_APPEND,
  deadWeightReport,
  formatDeadWeightFactIds,
} = require("./dossier-lib.js");

const root = path.join(__dirname, "..");
const projectPath =
  process.argv[2] || path.join(__dirname, "fixtures", "project-group6.json");
const claimsPath =
  process.argv[3] || path.join(__dirname, "dossier", "group6-claims.json");
const patchPath =
  process.argv[4] || path.join(__dirname, "dossier", "group6-patch.json");

const VERDICT_ENUM = new Set([
  "Unassessed",
  "Supported",
  "Contested",
  "Not established",
]);

const GAP_VERDICT = new Set([
  "Not yet assessed",
  "A gap may exist",
  "No gap established",
  "Insufficient information",
]);

const GAP_TYPE = new Set([
  "Not specified",
  "Causal attribution",
  "Legal liability / compensation",
  "Forward-looking duty allocation",
]);

const GAP_STAGE = new Set([
  "Not specified",
  "Design / training",
  "Testing / validation",
  "Deployment",
  "Use / monitoring",
  "Incident response / compensation",
]);

const GAP_MECHANISM = new Set([
  "Not specified",
  "Duty has no named owner",
  "Knowledge and authority are separated",
  "Unclear or failed handoff",
  "Missing records or causal evidence",
  "Uncertain legal coverage or liability",
  "Existing duty was not fulfilled",
  "No gap identified",
  "Other — explain below",
]);

const CASE_FIELD_KEYS = [
  "answer1",
  "answer4",
  "answer5",
  "comparison",
  "conclusion",
  "gapVerdict",
  "gapType",
  "gapStage",
  "gapMechanism",
  "gapTask",
  "gapPeople",
  "gapReason",
  "repair",
  "gapCheck",
];

function applyPatch(claims, patch) {
  claims.caseFields.answer4 = patch.answer4;
  for (const row of patch.actorAssessments || []) {
    const a = claims.actorAssessments.find((x) => x.actor === row.actor);
    if (!a) throw new Error(`Patch actor ${row.actor} not in claims`);
    if (row.next !== undefined) a.next = row.next;
    if (row.nextReason !== undefined) a.nextReason = row.nextReason;
  }
  Object.assign(claims.caseFields, patch.caseFields || {});
  return claims;
}

function applyP4Claims(claims) {
  const a9 = claims.actorAssessments.find((x) => x.actor === "A9");
  if (!a9) throw new Error("P4: A9 missing from actorAssessments");
  a9.legal = "Contested";
  if (typeof a9.payment === "string" && a9.payment.startsWith("Supported:")) {
    a9.payment = "Contested:" + a9.payment.slice("Supported:".length);
  }
  if (!a9.legalReason.includes(P4_LEGAL_REASON_APPEND)) {
    a9.legalReason = (a9.legalReason || "").trim();
    if (a9.legalReason) a9.legalReason += " ";
    a9.legalReason += P4_LEGAL_REASON_APPEND;
  }
  return claims;
}

function assertEnums(claims) {
  let ok = true;
  const cf = claims.caseFields;
  const checks = [
    ["caseFields.gapVerdict", cf.gapVerdict, GAP_VERDICT],
    ["caseFields.gapType", cf.gapType, GAP_TYPE],
    ["caseFields.gapStage", cf.gapStage, GAP_STAGE],
    ["caseFields.gapMechanism", cf.gapMechanism, GAP_MECHANISM],
  ];
  for (const [name, val, set] of checks) {
    const pass = set.has(val);
    console.log(`${pass ? "PASS" : "FAIL"} ${name}: ${JSON.stringify(val)}`);
    if (!pass) ok = false;
  }
  for (const a of claims.actorAssessments) {
    for (const key of ["causeVerdict", "legal", "next"]) {
      const pass = VERDICT_ENUM.has(a[key]);
      console.log(
        `${pass ? "PASS" : "FAIL"} actorAssessments[${a.actor}].${key}: ${JSON.stringify(a[key])}`
      );
      if (!pass) ok = false;
    }
  }
  const a9 = claims.actorAssessments.find((x) => x.actor === "A9");
  const layer3Contested =
    /A9 is "Contested"/i.test(cf.answer4) ||
    /assessment is Contested rather than Supported/i.test(cf.answer4);
  const a9ok = !layer3Contested || a9?.legal === "Contested";
  console.log(
    `${a9ok ? "PASS" : "FAIL"} A9 consistency invariant (answer4 Layer 3 vs legal)`
  );
  if (!a9ok) ok = false;
  if (!ok) process.exit(1);
}

function mergeAnalysis(project, claims) {
  for (const k of Object.keys(claims.models)) {
    project.models[k] = claims.models[k].conclusion;
    project.modelEvidence[k] = claims.models[k].evidence;
  }
  project.claims = JSON.parse(JSON.stringify(claims.claims));
  for (const key of CASE_FIELD_KEYS) {
    if (claims.caseFields[key] !== undefined) {
      project.fields[key] = claims.caseFields[key];
    }
  }
  const actorMap = new Map(project.actors.map((a) => [a.id, a]));
  for (const row of claims.actorAssessments) {
    const actor = actorMap.get(row.actor);
    if (!actor) throw new Error(`Unknown actor ${row.actor}`);
    actor.cause = row.cause;
    actor.causeVerdict = row.causeVerdict;
    actor.legal = row.legal;
    actor.legalReason = row.legalReason;
    actor.nextVerdict = row.next;
    actor.next = row.nextReason;
    actor.payment = row.payment;
  }
  return project;
}

function validateMerged(project, claims) {
  const v = [];
  const actorIds = new Set(project.actors.map((a) => a.id));
  const factIds = new Set(project.facts.map((f) => f.id));
  const sourceIds = new Set(project.sources.map((s) => s.id));
  for (const row of claims.actorAssessments) {
    if (!actorIds.has(row.actor)) {
      v.push(`actorAssessments unknown actor ${row.actor}`);
    }
  }
  for (const a of project.actors) {
    if (!VERDICT_ENUM.has(a.nextVerdict)) {
      v.push(`${a.id} nextVerdict not a verdict: ${a.nextVerdict}`);
    }
    if (VERDICT_ENUM.has(a.next)) {
      v.push(`${a.id} next must be prose but is verdict string ${a.next}`);
    }
  }
  for (const c of project.claims) {
    if (!actorIds.has(c.actor)) v.push(`claim ${c.id} unknown actor ${c.actor}`);
    for (const fid of c.facts || []) {
      if (!factIds.has(fid)) v.push(`claim ${c.id} unknown fact ${fid}`);
    }
    for (const sid of c.sources || []) {
      if (!sourceIds.has(sid)) v.push(`claim ${c.id} unknown source ${sid}`);
    }
  }
  return v;
}

function main() {
  if (!fs.existsSync(projectPath)) {
    console.error("Missing project fixture; run import-dossier.js first");
    process.exit(1);
  }
  const project = loadJson(projectPath).data;
  let claims = loadJson(claimsPath).data;
  const patch = loadJson(patchPath).data;
  console.log("Parsed claims and patch OK");

  claims = applyPatch(claims, patch);
  claims = applyP4Claims(claims);
  assertEnums(claims);

  const merged = mergeAnalysis(project, claims);
  const violations = validateMerged(merged, claims);
  if (violations.length) {
    console.error("Merge validation violations:");
    violations.forEach((line) => console.error("  " + line));
    process.exit(1);
  }

  const json = JSON.stringify(merged, null, 2) + "\n";
  fs.writeFileSync(projectPath, json, "utf8");
  const hash = crypto.createHash("sha256").update(json).digest("hex");
  console.log("Wrote", projectPath);
  console.log("sha256 (project):", hash);
  console.log(
    "claims sha256:",
    crypto
      .createHash("sha256")
      .update(fs.readFileSync(claimsPath))
      .digest("hex")
  );
  console.log("claims count:", merged.claims.length);
  const dead = deadWeightReport(
    {
      facts: merged.facts,
      actors: merged.actors,
      links: merged.links,
    },
    merged.claims
  );
  console.log(
    "Dead-weight facts (no link or claim refs):",
    formatDeadWeightFactIds(dead.orphanFacts)
  );

  const a9 = merged.actors.find((a) => a.id === "A9");
  if (!a9) {
    console.error("A9 assertion failed: actor A9 missing after merge");
    process.exit(1);
  }
  if (a9.legal !== "Contested") {
    console.error(
      `A9 assertion failed: legal must be "Contested", got ${JSON.stringify(a9.legal)}`
    );
    process.exit(1);
  }
  if (!String(a9.payment || "").startsWith("Contested")) {
    console.error(
      `A9 assertion failed: payment must start with "Contested", got ${JSON.stringify(a9.payment?.slice(0, 40))}…`
    );
    process.exit(1);
  }
  console.log("A9 post-merge assertion: PASS");
}

main();
