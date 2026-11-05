const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { execSync } = require("child_process");

const root = path.join(__dirname, "..");
const srcDir = path.join(root, "src");
const outPath = path.join(root, "dist", "Responsibility-Lab-Group6.html");
const deliveryPath = path.join(
  root,
  "delivery",
  "Responsibility-Lab-Group6.html"
);
const fixturePath = path.join(
  root,
  "tools",
  "fixtures",
  "project-group6.json"
);
const MAX_DIST_BYTES = 400 * 1024;

function escapeStyle(css) {
  return css.split("</style").join("<\\/style");
}

function escapeScript(js) {
  return js.split("</script").join("<\\/script");
}

let html = fs.readFileSync(path.join(srcDir, "index.html"), "utf8");
const css = fs.readFileSync(path.join(srcDir, "style.css"), "utf8");
const engineJs = fs.readFileSync(path.join(srcDir, "engine.js"), "utf8");
const appJs = fs.readFileSync(path.join(srcDir, "app.js"), "utf8");

const fixtureRaw = fs.readFileSync(fixturePath, "utf8");
const fixtureObj = JSON.parse(fixtureRaw);
const builtinScript =
  "<script>const BUILTIN_CASE=" +
  JSON.stringify(fixtureObj) +
  ";</script>\n";

const cssInline = escapeStyle(css);
const jsInline = escapeScript(engineJs + "\n" + appJs);

const linkRe =
  /<link\s+rel="stylesheet"\s+href="style\.css"\s*\/?>/i;
const engineScriptRe = /<script\s+src="engine\.js"\s*><\/script>\s*/i;
const appScriptRe = /<script\s+src="app\.js"\s*><\/script>/i;

if (!linkRe.test(html)) throw new Error("style.css link not found in index.html");
if (!engineScriptRe.test(html)) throw new Error("engine.js script tag not found in index.html");
if (!appScriptRe.test(html)) throw new Error("app.js script tag not found in index.html");

html = html.replace(linkRe, "<style>" + cssInline + "</style>");
html = html.replace(engineScriptRe, "");
html = html.replace(
  appScriptRe,
  builtinScript + "<script>" + jsInline + "</script>"
);

const stamp = new Date().toISOString();
let hash = "";
try {
  hash = execSync("git rev-parse --short HEAD", {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }).trim();
  const porcelain = execSync("git status --porcelain", {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }).trim();
  if (porcelain) hash += "-dirty";
} catch (_) {
  hash = "";
}
const buildContent = hash ? stamp + " " + hash : stamp;
const buildMeta = '<meta name="build" content="' + buildContent + '">';
if (/<meta\s+name="build"/i.test(html)) {
  html = html.replace(/<meta\s+name="build"[^>]*>/i, buildMeta);
} else {
  html = html.replace(/<head>/i, "<head>" + buildMeta);
}

const sizeBefore = fs.existsSync(outPath) ? fs.statSync(outPath).size : 0;
if (Buffer.byteLength(html, "utf8") > MAX_DIST_BYTES) {
  console.error(
    "FAIL build: output would exceed 400 KB (" +
      Buffer.byteLength(html, "utf8") +
      " bytes)"
  );
  process.exit(1);
}

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, html, "utf8");
fs.mkdirSync(path.dirname(deliveryPath), { recursive: true });
fs.writeFileSync(deliveryPath, html, "utf8");

const distBytes = fs.readFileSync(outPath);
const deliveryBytes = fs.readFileSync(deliveryPath);
const distSha256 = crypto.createHash("sha256").update(distBytes).digest("hex");
const deliverySha256 = crypto
  .createHash("sha256")
  .update(deliveryBytes)
  .digest("hex");
if (distSha256 !== deliverySha256 || !distBytes.equals(deliveryBytes)) {
  console.error(
    "FAIL build: dist and delivery outputs differ after write.\n" +
      "  dist sha256:     " +
      distSha256 +
      "\n" +
      "  delivery sha256: " +
      deliverySha256
  );
  process.exit(1);
}

const size = distBytes.length;
const sha256 = distSha256;
console.log("Wrote " + outPath);
console.log("Wrote " + deliveryPath);
console.log("Output size before: " + sizeBefore + " bytes");
console.log("Output size after: " + size + " bytes");
console.log("sha256: " + sha256);
console.log("Inlined blocks: 3 (style.css, engine.js, app.js) + BUILTIN_CASE");
console.log("Build stamp: " + buildContent);
