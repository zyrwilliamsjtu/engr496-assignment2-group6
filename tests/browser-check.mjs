/**
 * Dev-only browser verification (Playwright). Builds dist/ then drives file:// UI.
 */
import { chromium } from "playwright";
import { pathToFileURL } from "node:url";
import path from "node:path";
import fs from "node:fs";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const distHtml = path.join(root, "dist", "Responsibility-Lab-Group6.html");
const v1Fixture = path.join(root, "tools", "fixtures", "project-v1-real.json");

const pageErrors = [];
const consoleErrors = [];
const results = [];

function record(name, ok, detail = "") {
  const line = `${ok ? "PASS" : "FAIL"} ${name}${detail ? ": " + detail : ""}`;
  console.log(line);
  results.push({ name, ok, detail });
  if (!ok) return false;
  return true;
}

async function visibleSectionCount(page) {
  return page.locator("main section:not([hidden])").count();
}

async function readDownload(download) {
  const tmp = path.join(root, "dist", ".browser-check-dl");
  fs.mkdirSync(path.dirname(tmp), { recursive: true });
  await download.saveAs(tmp);
  const text = fs.readFileSync(tmp, "utf8");
  fs.unlinkSync(tmp);
  return text;
}

async function runChecks(page) {
  let ok = true;

  const c = await visibleSectionCount(page);
  if (c !== 1) ok = record("A load one visible section", false, `saw ${c}`) && ok;
  else ok = record("A load one visible section", true) && ok;

  for (let i = 0; i < 8; i++) {
    await page.locator(`#nav button[data-pagejump="${i}"]`).click();
    const count = await visibleSectionCount(page);
    const pos = (await page.locator("#pagePosition").textContent())?.trim() || "";
    const expected = `Page ${i + 1} of 8`;
    if (count !== 1 || !pos.startsWith(expected)) {
      ok =
        record(
          `B nav page ${i + 1}`,
          false,
          `sections=${count} position="${pos}"`
        ) && ok;
    } else {
      ok = record(`B nav page ${i + 1}`, true) && ok;
    }
  }

  await page.locator('#nav button[data-pagejump="2"]').click();
  await page.locator("#addActor").click();
  const cards = await page.locator("#actorlist article.card").count();
  if (cards < 1) ok = record("C add stakeholder card", false, "no card") && ok;
  else ok = record("C add stakeholder card", true) && ok;

  await page.locator('#nav button[data-pagejump="5"]').click();
  const nodesBefore = await page.locator("[data-mapactor]").count();
  await page.locator('#nav button[data-pagejump="2"]').click();
  await page.locator("#addActor").click();
  await page.locator('#nav button[data-pagejump="5"]').click();
  const nodesAfter = await page.locator("[data-mapactor]").count();
  if (nodesAfter <= nodesBefore) {
    ok =
      record(
        "C SVG node count increases",
        false,
        `before=${nodesBefore} after=${nodesAfter}`
      ) && ok;
  } else ok = record("C SVG node count increases", true) && ok;

  const node = page.locator("[data-mapactor]").first();
  if ((await node.count()) === 0) {
    ok = record("D map node opens detail", false, "no nodes") && ok;
  } else {
    await node.click();
    const detail = (await page.locator("#mapDetail").innerHTML()).trim();
    if (!detail) ok = record("D map node opens detail", false, "empty") && ok;
    else ok = record("D map node opens detail", true) && ok;
  }

  const [saveDl] = await Promise.all([
    page.waitForEvent("download"),
    page.locator("#save").click(),
  ]);
  let saveJson;
  try {
    saveJson = JSON.parse(await readDownload(saveDl));
  } catch (e) {
    ok = record("E save project JSON", false, String(e.message)) && ok;
    saveJson = null;
  }
  if (saveJson) {
    if (saveJson.version !== 2) {
      ok =
        record("E save version 2", false, `version=${saveJson.version}`) && ok;
    } else ok = record("E save version 2", true) && ok;
    if (!Array.isArray(saveJson.facts) || !Array.isArray(saveJson.timeline)) {
      ok = record("E save facts/timeline arrays", false) && ok;
    } else if (saveJson.facts.length !== 0 || saveJson.timeline.length !== 0) {
      ok =
        record(
          "E save empty facts/timeline",
          false,
          `facts=${saveJson.facts.length} timeline=${saveJson.timeline.length}`
        ) && ok;
    } else ok = record("E save empty facts/timeline", true) && ok;
  }

  await page.locator("#load").setInputFiles(v1Fixture);
  await page.waitForTimeout(300);
  const statusAfterV1 = (await page.locator("#status").textContent())?.trim() || "";
  if (!/upgraded from an earlier version/i.test(statusAfterV1)) {
    ok =
      record(
        "F v1 migration status",
        false,
        `status="${statusAfterV1}"`
      ) && ok;
  } else ok = record("F v1 migration status", true) && ok;

  const [save2] = await Promise.all([
    page.waitForEvent("download"),
    page.locator("#save").click(),
  ]);
  try {
    const j2 = JSON.parse(await readDownload(save2));
    if (j2.version !== 2) {
      ok = record("F v1 re-save version 2", false, `version=${j2.version}`) && ok;
    } else ok = record("F v1 re-save version 2", true) && ok;
  } catch (e) {
    ok = record("F v1 re-save version 2", false, e.message) && ok;
  }

  await page.locator('#nav button[data-pagejump="6"]').click();
  const conclusion = page.locator("#conclusion");
  await conclusion.fill(
    "The hospital and the model vendor share causal roles because the update skipped validation and the supervisor lacked time to intervene."
  );
  await page.locator("#reflectAnswer").click();
  await page.waitForTimeout(200);
  const cardsAfterReflect = await page.locator("#feedback article.card").count();
  if (cardsAfterReflect < 1) {
    ok =
      record("G reflect shows cards", false, `cards=${cardsAfterReflect}`) && ok;
  } else ok = record("G reflect shows cards", true) && ok;

  await conclusion.press("End");
  await conclusion.type("!");
  await page.waitForTimeout(100);
  const cardsAfterEdit = await page.locator("#feedback article.card").count();
  const staleVisible = await page
    .locator("#feedback .feedback-stale-notice")
    .count();
  if (cardsAfterEdit < cardsAfterReflect) {
    ok =
      record(
        "G stale loop keeps cards",
        false,
        `cards before=${cardsAfterReflect} after=${cardsAfterEdit}`
      ) && ok;
  } else ok = record("G stale loop keeps cards", true) && ok;
  if (staleVisible < 1) {
    ok = record("G stale notice visible", false) && ok;
  } else ok = record("G stale notice visible", true) && ok;

  await page.locator("#reflectAnswer").click();
  await page.waitForTimeout(200);
  const staleAfterRefresh = await page
    .locator("#feedback .feedback-stale-notice")
    .count();
  if (staleAfterRefresh !== 0) {
    ok =
      record(
        "G stale cleared after re-reflect",
        false,
        `stale nodes=${staleAfterRefresh}`
      ) && ok;
  } else ok = record("G stale cleared after re-reflect", true) && ok;

  await page.evaluate(() => {
    state.facts.push({
      id: "E1",
      text: "Supervisor had under three seconds to react.",
      kind: "assumed",
      sourceIds: [],
    });
  });

  const [exportDl] = await Promise.all([
    page.waitForEvent("download"),
    page.locator("#export").click(),
  ]);
  const exportText = await readDownload(exportDl);
  if (!exportText.includes("FACTS") || !exportText.includes("TIMELINE")) {
    ok = record("H export section headers", false) && ok;
  } else ok = record("H export section headers", true) && ok;
  if (!/^E\d+ \[(given|assumed)\]/m.test(exportText)) {
    ok = record("H export fact kind line", false) && ok;
  } else ok = record("H export fact kind line", true) && ok;

  if (pageErrors.length) {
    ok =
      record(
        "I zero page errors",
        false,
        pageErrors.slice(0, 3).join(" | ")
      ) && ok;
  } else ok = record("I zero page errors", true) && ok;
  if (consoleErrors.length) {
    ok =
      record(
        "I zero console errors",
        false,
        consoleErrors.slice(0, 3).join(" | ")
      ) && ok;
  } else ok = record("I zero console errors", true) && ok;

  return ok;
}

async function main() {
  execSync("node tools/build.js", { cwd: root, stdio: "inherit" });
  if (!fs.existsSync(distHtml)) {
    console.error("FAIL build: dist HTML missing");
    process.exit(1);
  }

  const browser = await chromium.launch();
  const page = await browser.newPage();

  page.on("dialog", (dialog) => dialog.accept());
  page.on("pageerror", (err) => {
    pageErrors.push(String(err.message || err));
  });
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      consoleErrors.push(msg.text());
    }
  });

  const url = pathToFileURL(distHtml).href;
  await page.goto(url);
  await page.waitForTimeout(500);

  const allOk = await runChecks(page);
  await browser.close();

  const failed = results.filter((r) => !r.ok).length;
  const passed = results.filter((r) => r.ok).length;
  console.log(
    `SUMMARY: ${passed} passed, ${failed} failed (${results.length} checks)`
  );
  process.exit(allOk ? 0 : 1);
}

main().catch((err) => {
  console.error("FAIL harness:", err);
  process.exit(1);
});
