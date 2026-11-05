/**
 * Headless checks for schema v2, export sections, and v1 migration.
 * Uses src/engine.js directly (no app.js string slicing).
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const engine = require(path.join(root, "src", "engine.js"));

const {
  migrateProject,
  report,
  emptyFact,
} = engine;

const fixturePath = path.join(__dirname, "fixtures", "project-v1-real.json");
const v1 = JSON.parse(fs.readFileSync(fixturePath, "utf8"));

console.log("Loading fixture:", fixturePath);

const { state: migrated, upgraded } = migrateProject(JSON.parse(JSON.stringify(v1)));
console.log("v1 load upgraded:", upgraded);
console.log("migrated version:", migrated.version);
console.log("migrated facts:", JSON.stringify(migrated.facts));
console.log("migrated timeline:", JSON.stringify(migrated.timeline));

if (!upgraded) throw new Error("Expected upgraded=true for v1 fixture");
if (migrated.version !== 2) throw new Error("Expected version 2 after migration");
if (migrated.facts.length !== 0 || migrated.timeline.length !== 0) {
  throw new Error("Expected empty facts/timeline after v1 migration");
}

if (JSON.parse(JSON.stringify(migrated)).version !== 2) {
  throw new Error("Re-save after v1 load must be version 2");
}

const withFact = {
  ...migrated,
  facts: [
    {
      id: "E3",
      text: "Supervisor had under three seconds to react.",
      kind: "assumed",
      timeId: "",
      knownBy: [],
      sourceIds: [],
      note: "",
    },
  ],
};

const factLine = report(withFact)
  .split("\n")
  .find((l) => /^E3 \[assumed\] \(no time link\)/.test(l));
console.log("Sample FACTS export line:", factLine || "(missing)");
if (!factLine || !factLine.includes("[assumed]")) {
  throw new Error("FACTS line must include [assumed] kind label");
}

const sampleFact = emptyFact();
console.log("emptyFact().kind default:", sampleFact.kind);
if (sampleFact.kind !== "assumed") {
  throw new Error("emptyFact().kind must default to assumed");
}
if (sampleFact.id !== "" || sampleFact.timeId !== "" || sampleFact.note !== "") {
  throw new Error("emptyFact() must use empty defaults for id/timeId/note");
}

console.log("verify-round1: all checks passed");
