#!/usr/bin/env node
/**
 * Merge Group 6 case dossier into a loadable v2 project fixture.
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const {
  loadJson,
  verifyRelayIntegrity,
  assertDossierPatchesPresent,
  printCountAssertion,
  readActorAndSourceEnums,
  collectReferentialViolations,
  deadWeightReport,
  formatDeadWeightFactIds,
} = require("./dossier-lib.js");

const root = path.join(__dirname, "..");
const engine = require(path.join(root, "src", "engine.js"));
const { CASES, FIELDS, emptyActor } = engine;

const inPath =
  process.argv[2] || path.join(__dirname, "dossier", "group6-case.json");
const outPath =
  process.argv[3] ||
  path.join(__dirname, "fixtures", "project-group6.json");
const htmlPath = path.join(root, "src", "index.html");

function buildBaseState() {
  const fields = Object.fromEntries(FIELDS.map((k) => [k, ""]));
  fields.title = "AI medical recommendation: subgroup harm after model update";
  fields.description = CASES[1][1];
  return {
    version: 2,
    preset: 1,
    fields,
    actors: [],
    links: [],
    facts: [],
    timeline: [],
    models: Object.fromEntries(
      Object.keys(engine.MODELS).map((k) => [k, ""])
    ),
    modelEvidence: { causal: "", hierarchical: "", future: "" },
    modelSourceIds: { causal: [], hierarchical: [], future: [] },
    caseSourceIds: [],
    claims: [],
    sources: [],
    legacyNotes: {},
  };
}

function mergeDossier(state, dossier) {
  const defaults = emptyActor();
  state.sources = JSON.parse(JSON.stringify(dossier.sources));
  state.facts = JSON.parse(JSON.stringify(dossier.facts));
  state.timeline = JSON.parse(JSON.stringify(dossier.timeline));
  state.links = JSON.parse(JSON.stringify(dossier.links)).map((l) => ({
    ...l,
    factIds: l.factIds ?? [],
  }));
  state.actors = dossier.actors.map((a) => {
    const merged = { ...defaults, ...a };
    for (const k of Object.keys(defaults)) {
      if (merged[k] === undefined || merged[k] === null) merged[k] = defaults[k];
    }
    return merged;
  });
  return state;
}

function runOnce() {
  const { data: dossier } = loadJson(inPath);
  console.log("Parsed case dossier OK");
  if (!verifyRelayIntegrity(dossier)) {
    console.error("HARD STOP: relay integrity check failed");
    process.exit(1);
  }
  assertDossierPatchesPresent(dossier);
  printCountAssertion(dossier);
  const enums = readActorAndSourceEnums(htmlPath);
  const violations = collectReferentialViolations(dossier, enums);
  if (violations.length) {
    console.error("Referential integrity violations:");
    violations.forEach((line) => console.error("  " + line));
    process.exit(1);
  }
  console.log("Referential integrity: PASS");

  const state = mergeDossier(buildBaseState(), dossier);
  const json = JSON.stringify(state, null, 2) + "\n";
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, json, "utf8");
  const hash = crypto.createHash("sha256").update(json).digest("hex");
  console.log("Wrote", outPath);
  console.log("sha256:", hash);
  console.log("Counts imported:", {
    sources: state.sources.length,
    facts: state.facts.length,
    timeline: state.timeline.length,
    actors: state.actors.length,
    links: state.links.length,
  });
  const dead = deadWeightReport(dossier);
  console.log("Dead-weight orphan actors (no fact knownBy, no link):", dead.orphanActors);
  console.log(
    "Dead-weight facts (no link factIds):",
    formatDeadWeightFactIds(dead.orphanFacts)
  );

  const round = JSON.parse(fs.readFileSync(outPath, "utf8"));
  if (JSON.stringify(round) !== JSON.stringify(state)) {
    console.error("Round-trip deep-equal FAILED");
    process.exit(1);
  }
  console.log("Round-trip deep-equal: PASS");
  return json;
}

function main() {
  const first = runOnce();
  const second = runOnce();
  if (first !== second) {
    console.error("Idempotency FAILED: output differed between runs");
    process.exit(1);
  }
  console.log("Idempotency: PASS");
}

main();
