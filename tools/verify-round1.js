/**
 * Headless checks for schema v2, export sections, and v1 migration.
 * validate() is exercised via vm with browser globals stubbed.
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "..");
const appPath = path.join(root, "src", "app.js");
const app = fs.readFileSync(appPath, "utf8");

const start = app.indexOf("// ==== M1 SCHEMA ====");
const schemaEnd = app.indexOf(
  "document.addEventListener('input',e=>{const t=e.target;if(FIELDS.includes"
);
const validateStart = app.indexOf("function validateFactsTimeline");
const validateEnd = app.indexOf("$('load').onchange");
if (start < 0 || schemaEnd < 0 || validateStart < 0 || validateEnd < 0) {
  throw new Error("Could not slice app.js for harness");
}

const harnessSrc =
  app.slice(start, schemaEnd) +
  app.slice(validateStart, validateEnd);

const sandbox = {
  module: { exports: {} },
  exports: {},
  crypto: {
    randomUUID: () => "00000000-0000-0000-0000-000000000001",
  },
  console,
  document: {
    getElementById: (id) => {
      const store = sandbox.__store || (sandbox.__store = {});
      if (!store[id]) {
        store[id] = {
          id,
          value: "",
          innerHTML: "",
          textContent: "",
          hidden: false,
          disabled: false,
          replaceChildren() {
            this.innerHTML = "";
          },
          querySelector() {
            return null;
          },
          prepend() {},
          removeAttribute() {},
          setAttribute() {},
          scrollIntoView() {},
        };
      }
      return store[id];
    },
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener: () => {},
  },
  window: {},
  URL: { createObjectURL: () => "", revokeObjectURL: () => {} },
  Blob: function Blob() {},
  confirm: () => true,
  setTimeout: () => {},
};
sandbox.window = sandbox;

vm.createContext(sandbox);
vm.runInContext(
  harnessSrc +
    "\nmodule.exports = { validate, report, nextFactId, nextTimelineId, emptyFact };",
  sandbox
);

const api = sandbox.module.exports;
const fixturePath = path.join(__dirname, "fixtures", "project-v1-real.json");
const v1 = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
const minimalPath = path.join(__dirname, "fixtures", "project-v1-minimal.json");
if (fs.existsSync(minimalPath)) {
  const minimal = JSON.parse(fs.readFileSync(minimalPath, "utf8"));
  const realKeys = new Set(Object.keys(v1).concat(Object.keys(v1.fields || {})));
  const minKeys = new Set(
    Object.keys(minimal).concat(Object.keys(minimal.fields || {}))
  );
  const onlyReal = [...Object.keys(v1)].filter((k) => !(k in minimal));
  if (onlyReal.length) console.log("Top-level keys only in real export:", onlyReal.join(", "));
}
console.log("Loading fixture:", fixturePath);

const { state: migrated, upgraded } = api.validate(JSON.parse(JSON.stringify(v1)));
console.log("v1 load upgraded:", upgraded);
console.log("migrated version:", migrated.version);
console.log("migrated facts:", JSON.stringify(migrated.facts));
console.log("migrated timeline:", JSON.stringify(migrated.timeline));

if (!upgraded) throw new Error("Expected upgraded=true for v1 fixture");
if (migrated.version !== 2) throw new Error("Expected version 2 after migration");
if (migrated.facts.length !== 0 || migrated.timeline.length !== 0) {
  throw new Error("Expected empty facts/timeline after v1 migration");
}

if (!/version:2,[^]*facts:\[\],[^]*timeline:\[\]/.test(app.replace(/\s+/g, ""))) {
  throw new Error("fresh() must initialize version 2 with empty facts/timeline");
}

const saved = JSON.stringify(migrated);
if (JSON.parse(saved).version !== 2) {
  throw new Error("Re-save after v1 load must be version 2");
}

if (!app.includes("lines.push('FACTS')") || !app.includes("lines.push('TIMELINE')")) {
  throw new Error("report() missing FACTS/TIMELINE sections");
}
if (!app.includes("'(none recorded)'")) {
  throw new Error("report() missing (none recorded) placeholder");
}

vm.runInContext(
  "function buildReflection(){return []};function evaluateAnalysis(){return {total:0,criteria:[]}};state = " +
    JSON.stringify({
      ...migrated,
      facts: [
        {
          id: "E3",
          text: "Supervisor had under three seconds to react.",
          kind: "assumed",
          sourceIds: [],
        },
      ],
    }) +
    ";",
  sandbox
);
const factLine = api
  .report()
  .split("\n")
  .find((l) => /^E3 \[assumed\]/.test(l));
console.log("Sample FACTS export line:", factLine || "(missing)");
if (!factLine || !factLine.includes("[assumed]")) {
  throw new Error("FACTS line must include [assumed] kind label");
}

vm.runInContext("state={facts:[],timeline:[]};", sandbox);
const sampleFact = api.emptyFact();
console.log("emptyFact().kind default:", sampleFact.kind);
if (sampleFact.kind !== "assumed") {
  throw new Error("emptyFact().kind must default to assumed");
}

console.log("verify-round1: all checks passed");
