/**
 * Ensures committed delivery/ matches a fresh dist build (catches stale handover files).
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { execSync } = require("child_process");

const root = path.join(__dirname, "..");
const distPath = path.join(root, "dist", "Responsibility-Lab-Group6.html");
const deliveryPath = path.join(
  root,
  "delivery",
  "Responsibility-Lab-Group6.html"
);

function sha256(buf) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function failMessage(deliveryHash, distHash) {
  return (
    "FAIL delivery consistency: delivery/Responsibility-Lab-Group6.html is not byte-identical to the freshly built dist output.\n" +
    "  delivery sha256: " +
    deliveryHash +
    "\n" +
    "  dist sha256:     " +
    distHash +
    "\n" +
    "Run `node tools/build.js` and commit delivery/Responsibility-Lab-Group6.html, then re-run npm run verify."
  );
}

function main() {
  if (!fs.existsSync(deliveryPath)) {
    console.error(
      "FAIL delivery consistency: missing delivery/Responsibility-Lab-Group6.html\n" +
        "Run `node tools/build.js` and commit delivery/Responsibility-Lab-Group6.html."
    );
    process.exit(1);
  }

  const deliveryBefore = fs.readFileSync(deliveryPath);
  const deliveryBeforeHash = sha256(deliveryBefore);

  execSync("node tools/build.js", {
    cwd: root,
    stdio: ["ignore", "pipe", "inherit"],
  });

  if (!fs.existsSync(distPath)) {
    console.error("FAIL delivery consistency: dist output missing after build.");
    process.exit(1);
  }

  const distAfter = fs.readFileSync(distPath);
  const distHash = sha256(distAfter);

  if (!deliveryBefore.equals(distAfter)) {
    console.error(failMessage(deliveryBeforeHash, distHash));
    process.exit(1);
  }

  console.log(
    "PASS delivery consistency: delivery matches dist (" +
      distAfter.length +
      " bytes, sha256 " +
      distHash +
      ")"
  );
}

if (require.main === module) {
  main();
}

module.exports = { failMessage, sha256 };
