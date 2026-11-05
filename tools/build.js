const fs = require("fs");
const path = require("path");

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
const js = fs.readFileSync(path.join(srcDir, "app.js"), "utf8");

const cssInline = escapeStyle(css);
const jsInline = escapeScript(js);

const linkRe =
  /<link\s+rel="stylesheet"\s+href="style\.css"\s*\/?>/i;
const scriptRe = /<script\s+src="app\.js"\s*><\/script>/i;

if (!linkRe.test(html)) throw new Error("style.css link not found in index.html");
if (!scriptRe.test(html)) throw new Error("app.js script tag not found in index.html");

html = html.replace(linkRe, "<style>" + cssInline + "</style>");
html = html.replace(scriptRe, "<script>" + jsInline + "</script>");

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, html, "utf8");

const size = fs.statSync(outPath).size;
console.log("Wrote " + outPath);
console.log("Output size: " + size + " bytes");
console.log("Inlined blocks: 2 (style.css, app.js)");
