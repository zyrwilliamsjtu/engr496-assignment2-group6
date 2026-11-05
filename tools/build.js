const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const root = path.join(__dirname, "..");
const srcDir = path.join(root, "src");
const outPath = path.join(root, "dist", "Responsibility-Lab-Group6.html");

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
html = html.replace(appScriptRe, "<script>" + jsInline + "</script>");

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

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, html, "utf8");

const size = fs.statSync(outPath).size;
console.log("Wrote " + outPath);
console.log("Output size: " + size + " bytes");
console.log("Inlined blocks: 3 (style.css, engine.js, app.js)");
console.log("Build stamp: " + buildContent);
