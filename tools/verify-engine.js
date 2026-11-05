/**
 * Golden baseline for engine outputs (evaluateAnalysis, buildReflection, report).
 * Use --write to regenerate tools/engine-golden.json after intentional rubric changes.
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const goldenPath = path.join(__dirname, "engine-golden.json");
const writeMode = process.argv.includes("--write");

const {
  evaluateAnalysis,
  buildReflection,
  report,
  FIELDS,
} = require(path.join(root, "src", "engine.js"));

function buildSyntheticState() {
  const actor = (id, name, extra) => ({
    id,
    name,
    kind: "Person",
    role: "",
    connections: "",
    cause: "",
    knowledge: "",
    control: "Unassessed",
    controlReason: "",
    legal: "Unassessed",
    legalReason: "",
    payment: "",
    next: "",
    causeVerdict: "Unassessed",
    nextVerdict: "Unassessed",
    ...extra,
  });

  const fields = Object.fromEntries(FIELDS.map((k) => [k, ""]));
  Object.assign(fields, {
    title: "Golden harness case",
    description:
      "Synthetic state for engine golden baseline; pedestrian collision scenario.",
    facts:
      "Pedestrian Maria was injured when the vehicle failed to stop. Supervisor Chen had under three seconds to react per E1.",
    answer1:
      "The perception module contributed because it failed to classify the obstacle, which led to the collision with Maria.",
    answer4:
      "Under a hypothetical duty-of-care rule, the operator may be liable if evidence shows negligent oversight; liability remains uncertain.",
    answer5:
      "The manufacturer should investigate within two weeks, publish findings, and assign an audit panel to verify completion.",
    comparison:
      "Causal analysis names the perception failure; hierarchy shows split authority between vendor and operator; forward-looking assigns investigation duties.",
    conclusion:
      "Maria the pedestrian was harmed because the autonomous system failed to detect her. Operator Chen shares causal contribution. Legal responsibility depends on hypothetical negligence rules and may be unresolved. The manufacturer must investigate and document results within two weeks.",
    gapVerdict: "A gap may exist",
    gapType: "Forward-looking duty allocation",
    gapReason:
      "Knowledge and authority are separated between the vendor team and the on-site supervisor, creating a missing handoff for validation records.",
    gapTask: "Validate software updates before deployment on public roads",
    gapStage: "Testing / validation",
    gapMechanism: "Duty has no named owner",
    gapPeople: "Safety engineer Riley could own validation with authority from the regulator.",
    repair:
      "Riley should run regression tests on update bundles and deliver a signed report before the next deployment deadline.",
    gapCheck:
      "Accepted test report and review panel sign-off recorded in the project log.",
    references: "S1, S2",
  });

  return {
    version: 2,
    preset: 0,
    fields,
    actors: [
      actor("actor-001", "Maria Santos", {
        kind: "Affected stakeholder",
        role: "Pedestrian injured in the collision scenario",
        connections:
          "Maria was in the crosswalk when the vehicle approached; she depended on the operator for safe deployment.",
        cause:
          "Maria did not contribute to the harm; she was lawfully crossing when the vehicle failed to stop.",
        legalReason:
          "Maria bears no legal liability as an affected party under hypothetical tort rules.",
        next: "Maria should receive compensation funded by liable parties after investigation.",
        causeVerdict: "Not established",
        nextVerdict: "Supported",
      }),
      actor("actor-002", "Chen Wei", {
        kind: "Person",
        role: "Human supervisor with monitoring duty during road tests",
        connections:
          "Chen supervised the fleet operator team and reported to the safety director Riley.",
        cause:
          "Chen had limited time to intervene because the warning arrived too late, which contributed to the outcome.",
        legalReason:
          "Chen may breach a supervisory duty if records show inadequate monitoring under hypothetical employment law.",
        next: "Chen should preserve logs and cooperate with the audit within one week.",
        causeVerdict: "Supported",
      }),
      actor("actor-003", "AutoDrive Perception", {
        kind: "Technical system",
        role: "Onboard perception stack classifying obstacles",
        connections:
          "The perception module fed the planner; vendor engineers maintained the model weights.",
        cause:
          "The perception module misclassified the pedestrian obstacle, therefore the planner did not brake in time.",
        causeVerdict: "Supported",
      }),
      actor("actor-004", "Riley Park", {
        kind: "Organization",
        role: "Safety director with authority over validation gates",
        connections:
          "Riley oversees Chen and signs deployment checklists for the operator organization.",
        next: "Riley must assign an owner for update validation and fund regression testing resources.",
        nextVerdict: "Supported",
      }),
    ],
    links: [
      {
        from: "actor-002",
        to: "actor-004",
        action: "reports deployment monitoring concerns to",
        reason: "operator safety chain during public-road tests",
        factIds: ["E1"],
      },
      {
        from: "actor-002",
        to: "actor-004",
        action: "depends on validation sign-off from",
        reason: "deployment gate before fleet updates",
        factIds: ["E2"],
      },
    ],
    facts: [
      {
        id: "E1",
        text: "Supervisor had under three seconds to react after the warning.",
        kind: "given",
        timeId: "T1",
        knownBy: ["actor-002"],
        sourceIds: ["S1"],
        note: "",
      },
      {
        id: "E2",
        text: "Software update 4.2 shipped without a documented validation sign-off.",
        kind: "assumed",
        timeId: "T1",
        knownBy: ["actor-004"],
        sourceIds: ["S2"],
        note: "",
      },
      {
        id: "E3",
        text: "Pedestrian Maria was in a marked crosswalk at the time of impact.",
        kind: "given",
        timeId: "T2",
        knownBy: ["actor-001"],
        sourceIds: [],
        note: "",
      },
      {
        id: "E4",
        text: "Perception confidence scores were not logged for that trip.",
        kind: "assumed",
        timeId: "",
        knownBy: [],
        sourceIds: [],
        note: "Evidence gap for causal chain.",
      },
      {
        id: "E5",
        text: "Regulator issued conditional approval for public-road testing.",
        kind: "given",
        timeId: "T1",
        knownBy: ["actor-004"],
        sourceIds: ["S1"],
        note: "",
      },
    ],
    timeline: [
      {
        id: "T1",
        date: "Day 0",
        event: "Update 4.2 deployed to the test fleet.",
        knownBy: ["actor-002", "actor-004"],
      },
      {
        id: "T2",
        date: "Day 1",
        event: "Collision with pedestrian Maria in crosswalk.",
        knownBy: ["actor-001", "actor-002"],
      },
    ],
    models: {
      causal:
        "The perception failure caused the planner to continue speed, which resulted in injury to Maria because the system did not brake (E3, T2).",
      hierarchical:
        "Riley held formal authority over validation while Chen had practical monitoring knowledge; fragmented handoffs between vendor and operator shaped the deployment decision.",
      future:
        "Riley should appoint an owner to run regression tests before the next deployment deadline and verify completion with a signed audit report.",
    },
    modelEvidence: {
      causal: "E3 documents Maria in the crosswalk; S1 cites the regulator approval record.",
      hierarchical: "S2 reading note explains vendor-operator split; E2 shows missing sign-off.",
      future: "S1 supports the duty to investigate; deadline and audit panel mentioned in answer5.",
    },
    sources: [
      {
        id: "S1",
        reference:
          "Regulator conditional approval memo (synthetic golden fixture).",
        url: "https://example.org/golden-s1",
        pages: "pp. 2–4",
        topic: "Legal responsibility",
        note:
          "Useful for hypothetical duty framing and deployment conditions; does not establish legal truth in this exercise.",
      },
      {
        id: "S2",
        reference: "Vendor release notes for perception update 4.2 (fixture).",
        url: "https://example.org/golden-s2",
        pages: "section 3",
        topic: "Causal",
        note:
          "Documents model retraining and missing validation checklist; supports causal and hierarchy arguments.",
      },
    ],
    caseSourceIds: ["S1", "S2"],
    modelSourceIds: {
      causal: ["S1"],
      hierarchical: ["S2"],
      future: ["S1"],
    },
    legacyNotes: {},
  };
}

function snapshot(state) {
  const analysis = evaluateAnalysis(state);
  const reflection = buildReflection(state);
  return {
    evaluateAnalysis: {
      total: analysis.total,
      criteria: analysis.criteria.map((c) => ({
        name: c.name,
        score: c.score,
        checks: c.checks,
      })),
    },
    buildReflection: reflection.map((item) => ({
      title: item.title,
      observation: item.observation,
    })),
    report: report(state),
  };
}

function assertSyntheticGroupedRelationships(reportText, state) {
  const start = reportText.indexOf("RELATIONSHIPS BY ACTOR");
  if (start < 0) {
    console.log("FAIL grouped relationships: RELATIONSHIPS BY ACTOR section missing");
    return false;
  }
  const rest = reportText.slice(start);
  const end = rest.indexOf("\n\nCLAIMS");
  const section = end >= 0 ? rest.slice(0, end) : rest;
  if (!/ — \d+ outgoing/.test(section)) {
    console.log("FAIL grouped relationships: no group heading with outgoing count");
    return false;
  }
  const link = (state.links || [])[0];
  if (!link) {
    console.log("FAIL grouped relationships: synthetic state has no links");
    return false;
  }
  const fromName = state.actors.find((a) => a.id === link.from)?.name;
  const toName = state.actors.find((a) => a.id === link.to)?.name;
  const factId = (link.factIds || [])[0];
  const rowOk =
    fromName &&
    toName &&
    factId &&
    section.includes(fromName) &&
    section.includes(toName) &&
    section.includes(factId);
  if (!rowOk) {
    console.log(
      "FAIL grouped relationships: row must name both actors and a fact id",
      { fromName, toName, factId, excerpt: section.slice(0, 500) }
    );
    return false;
  }
  console.log("PASS synthetic grouped relationships export");
  return true;
}

function compareGolden(actual, expected) {
  let ok = true;
  if (actual.evaluateAnalysis.total !== expected.evaluateAnalysis.total) {
    console.log(
      `FAIL evaluateAnalysis.total: expected ${expected.evaluateAnalysis.total}, got ${actual.evaluateAnalysis.total}`
    );
    ok = false;
  }
  const expCrit = expected.evaluateAnalysis.criteria;
  const actCrit = actual.evaluateAnalysis.criteria;
  for (let i = 0; i < expCrit.length; i++) {
    const e = expCrit[i];
    const a = actCrit[i];
    if (!a) {
      console.log(`FAIL criterion missing: ${e.name}`);
      ok = false;
      continue;
    }
    if (a.score !== e.score) {
      console.log(
        `FAIL ${e.name}: score ${e.score} → ${a.score}`
      );
      ok = false;
    }
    const flips = [];
    for (let j = 0; j < e.checks.length; j++) {
      if (Boolean(e.checks[j]) !== Boolean(a.checks[j])) {
        flips.push(`check[${j}] ${e.checks[j]} → ${a.checks[j]}`);
      }
    }
    if (flips.length) {
      console.log(`FAIL ${e.name}: ${flips.join("; ")}`);
      ok = false;
    }
  }
  if (
    JSON.stringify(actual.buildReflection) !==
    JSON.stringify(expected.buildReflection)
  ) {
    console.log("FAIL buildReflection: item list changed");
    ok = false;
  }
  if (actual.report !== expected.report) {
    console.log("FAIL report: text output changed");
    ok = false;
  }
  return ok;
}

function main() {
  const state = buildSyntheticState();
  const actual = snapshot(state);

  if (writeMode) {
    if (!assertSyntheticGroupedRelationships(actual.report, state)) {
      process.exit(1);
    }
    fs.writeFileSync(goldenPath, JSON.stringify(actual, null, 2) + "\n", "utf8");
    console.log(`Wrote ${goldenPath}`);
    return;
  }

  if (!fs.existsSync(goldenPath)) {
    fs.writeFileSync(goldenPath, JSON.stringify(actual, null, 2) + "\n", "utf8");
    console.log(`Created ${goldenPath}`);
    return;
  }

  const expected = JSON.parse(fs.readFileSync(goldenPath, "utf8"));
  let engineOk = compareGolden(actual, expected);
  if (!assertSyntheticGroupedRelationships(actual.report, state)) {
    engineOk = false;
  }
  if (engineOk) {
    console.log("verify-engine: golden baseline matched");
  } else {
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { buildSyntheticState, snapshot, compareGolden };
