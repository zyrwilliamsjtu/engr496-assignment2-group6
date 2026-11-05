/**
 * Simulates reference/prototype.html "Save project" after a fresh session (v1).
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "..");
const html = fs.readFileSync(
  path.join(root, "reference", "prototype.html"),
  "utf8"
);
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const initEnd = script.lastIndexOf("initializePages();fresh();");
const runnable = script.slice(0, initEnd) + "fresh(0);";

const sandbox = {
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
          setAttribute() {},
          removeAttribute() {},
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
vm.runInContext(runnable, sandbox);
const json = vm.runInContext("JSON.stringify(state,null,2);", sandbox);

const out = path.join(__dirname, "fixtures", "project-v1-real.json");
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, json + "\n", "utf8");
console.log("Wrote " + out);
console.log("version:", JSON.parse(json).version);
