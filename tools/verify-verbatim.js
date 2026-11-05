/**
 * Compare rule-library blocks in reference/prototype.html vs src/engine.js.
 * Exits non-zero on any mismatch (do not auto-fix).
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const BLOCKS = ["SIGNALS", "RUBRIC_LIBRARY", "REFLECTION_LIBRARY"];

function readSources() {
  const engine = fs.readFileSync(path.join(root, "src", "engine.js"), "utf8");
  const proto = fs.readFileSync(
    path.join(root, "reference", "prototype.html"),
    "utf8"
  );
  return { engine, proto };
}

function findConstStart(src, name) {
  const re = new RegExp(`\\bconst\\s+${name}\\s*=`);
  const m = re.exec(src);
  if (!m) return -1;
  return m.index;
}

function extractConstStatement(src, name) {
  const start = findConstStart(src, name);
  if (start < 0) throw new Error(`${name}: const declaration not found`);
  let i = start;
  const eq = src.indexOf("=", i);
  if (eq < 0) throw new Error(`${name}: missing =`);
  i = eq + 1;
  while (i < src.length && /\s/.test(src[i])) i++;
  const open = src[i];
  if (open !== "{" && open !== "[") {
    throw new Error(`${name}: expected { or [ after =, saw ${JSON.stringify(open)}`);
  }
  const close = open === "{" ? "}" : "]";
  const end = scanBalanced(src, i, open, close);
  let endStmt = end + 1;
  while (endStmt < src.length && /\s/.test(src[endStmt])) endStmt++;
  if (src[endStmt] === ";") endStmt++;
  return src.slice(start, endStmt);
}

function scanBalanced(src, start, open, close) {
  let depth = 0;
  let i = start;
  const len = src.length;
  while (i < len) {
    const mode = readMode(src, i);
    if (mode === "lineComment") {
      i = skipLineComment(src, i);
      continue;
    }
    if (mode === "blockComment") {
      i = skipBlockComment(src, i);
      continue;
    }
    if (mode === "string") {
      i = skipString(src, i);
      continue;
    }
    if (mode === "regex") {
      i = skipRegex(src, i);
      continue;
    }
    const ch = src[i];
    if (ch === open) depth++;
    else if (ch === close) {
      depth--;
      if (depth === 0) return i;
    } else if (ch === "{" || ch === "[") {
      const innerClose = ch === "{" ? "}" : "]";
      i = scanBalanced(src, i, ch, innerClose);
    } else if (ch === "}" || ch === "]") {
      /* nested structures handled by recursion */
    }
    i++;
  }
  throw new Error("Unbalanced literal");
}

function readMode(src, i) {
  if (src[i] === "/" && src[i + 1] === "/") return "lineComment";
  if (src[i] === "/" && src[i + 1] === "*") return "blockComment";
  if (src[i] === "'" || src[i] === '"' || src[i] === "`") return "string";
  if (src[i] === "/" && isRegexStart(src, i)) return "regex";
  return "code";
}

function isRegexStart(src, i) {
  let j = i - 1;
  while (j >= 0 && /\s/.test(src[j])) j--;
  if (j < 0) return true;
  const prev = src[j];
  return /[=([{,:;!?&|+\-*%^~<>]/.test(prev) || prev === "\n";
}

function skipLineComment(src, i) {
  let j = i + 2;
  while (j < src.length && src[j] !== "\n") j++;
  return j;
}

function skipBlockComment(src, i) {
  let j = i + 2;
  while (j < src.length - 1) {
    if (src[j] === "*" && src[j + 1] === "/") return j + 2;
    j++;
  }
  return src.length;
}

function skipString(src, i) {
  const q = src[i];
  let j = i + 1;
  while (j < src.length) {
    if (src[j] === "\\") {
      j += 2;
      continue;
    }
    if (src[j] === q) return j + 1;
    j++;
  }
  return src.length;
}

function skipRegex(src, i) {
  let j = i + 1;
  while (j < src.length) {
    if (src[j] === "\\") {
      j += 2;
      continue;
    }
    if (src[j] === "/") {
      j++;
      while (j < src.length && /[a-z]/i.test(src[j])) j++;
      return j;
    }
    j++;
  }
  return src.length;
}

function normalizeOutsideStrings(text) {
  let out = "";
  let i = 0;
  while (i < text.length) {
    const mode = readMode(text, i);
    if (mode === "lineComment") {
      i = skipLineComment(text, i);
      continue;
    }
    if (mode === "blockComment") {
      i = skipBlockComment(text, i);
      continue;
    }
    if (mode === "string") {
      const end = skipString(text, i);
      out += text.slice(i, end);
      i = end;
      continue;
    }
    if (mode === "regex") {
      const end = skipRegex(text, i);
      out += text.slice(i, end);
      i = end;
      continue;
    }
    const ch = text[i];
    if (/\s/.test(ch)) {
      while (i < text.length && /\s/.test(text[i])) i++;
      continue;
    }
    out += ch;
    i++;
  }
  return out;
}

function firstDiff(a, b) {
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    if (a[i] !== b[i]) return i;
  }
  if (a.length !== b.length) return n;
  return -1;
}

function contextWindow(text, index, radius = 40) {
  const start = Math.max(0, index - radius);
  const end = Math.min(text.length, index + radius);
  return text.slice(start, end);
}

function main() {
  const { engine, proto } = readSources();
  let failed = false;

  for (const name of BLOCKS) {
    let protoBlock;
    let engineBlock;
    try {
      protoBlock = extractConstStatement(proto, name);
      engineBlock = extractConstStatement(engine, name);
    } catch (err) {
      console.log(`FAIL ${name}: ${err.message}`);
      failed = true;
      continue;
    }
    const np = normalizeOutsideStrings(protoBlock);
    const ne = normalizeOutsideStrings(engineBlock);
    if (np === ne) {
      console.log(`PASS ${name}`);
    } else {
      failed = true;
      const off = firstDiff(np, ne);
      console.log(`FAIL ${name}: first difference at normalized offset ${off}`);
      console.log(`  prototype: …${contextWindow(np, off)}…`);
      console.log(`  engine.js: …${contextWindow(ne, off)}…`);
    }
  }

  if (failed) process.exit(1);
}

main();
