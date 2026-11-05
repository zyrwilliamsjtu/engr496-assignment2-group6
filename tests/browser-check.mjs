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
const danglingFixture = path.join(
  root,
  "tools",
  "fixtures",
  "project-v2-dangling-time.json"
);
const group6Fixture = path.join(
  root,
  "tools",
  "fixtures",
  "project-group6.json"
);

function factSortKey(id) {
  const m = /^E(\d+)(?:-([a-z]+))?$/.exec(id);
  if (!m) return [0, id];
  return [Number(m[1]), m[2] || ""];
}

function highestFactId(facts) {
  return [...facts].sort((a, b) => {
    const ka = factSortKey(a.id);
    const kb = factSortKey(b.id);
    return ka[0] - kb[0] || String(ka[1]).localeCompare(String(kb[1]));
  }).slice(-1)[0]?.id;
}

function highestTimelineId(timeline) {
  return [...timeline]
    .sort((a, b) => Number(/^T(\d+)$/.exec(a.id)?.[1] || 0) - Number(/^T(\d+)$/.exec(b.id)?.[1] || 0))
    .slice(-1)[0]?.id;
}

function createRunContext(label) {
  return {
    label,
    pageErrors: [],
    consoleErrors: [],
    results: [],
    record(name, ok, detail = "") {
      const line = `${ok ? "PASS" : "FAIL"} ${name}${detail ? ": " + detail : ""}`;
      console.log(line);
      this.results.push({ name, ok, detail });
      return ok;
    },
  };
}

function attachPageDiagnostics(page, ctx) {
  page.on("pageerror", (err) => {
    ctx.pageErrors.push(String(err.message || err));
  });
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      ctx.consoleErrors.push(msg.text());
    }
  });
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

async function runChecks(page, ctx) {
  let ok = true;
  const record = (name, pass, detail = "") =>
    (ok = ctx.record(name, pass, detail) && ok);

  const c = await visibleSectionCount(page);
  if (c !== 1) record("A load one visible section", false, `saw ${c}`);
  else record("A load one visible section", true);

  const pageCount = await page.locator("#nav button[data-pagejump]").count();
  const navLabels = await page.locator("#nav button[data-pagejump]").allTextContents();
  if (navLabels.length !== pageCount) {
    record("B nav button count", false, `saw ${navLabels.length}`);
  } else record("B nav button count", true);
  for (let i = 0; i < pageCount; i++) {
    await page.locator(`#nav button[data-pagejump="${i}"]`).click();
    const count = await visibleSectionCount(page);
    const pos = (await page.locator("#pagePosition").textContent())?.trim() || "";
    const expected = `Page ${i + 1} of ${pageCount}`;
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

  await page.locator('#nav button[data-pagejump="7"]').click();
  const nodesBefore = await page.locator("[data-mapactor]").count();
  await page.locator('#nav button[data-pagejump="2"]').click();
  await page.locator("#addActor").click();
  await page.locator('#nav button[data-pagejump="7"]').click();
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

  if (fs.existsSync(group6Fixture)) {
    const g6ForU = JSON.parse(fs.readFileSync(group6Fixture, "utf8"));
    const uFacts = g6ForU.facts.length;
    const uGiven = g6ForU.facts.filter((f) => f.kind === "given").length;
    const uAssumed = g6ForU.facts.filter((f) => f.kind === "assumed").length;
    const uTimeline = g6ForU.timeline.length;
    const uExpectedRecord = `${uFacts} facts recorded · ${uGiven} given · ${uAssumed} assumed · ${uTimeline} timeline entries`;
    const uClaimCount = (g6ForU.claims || []).length;
    const uPeBefore = ctx.pageErrors.length;
    await page.locator('#nav button[data-pagejump="0"]').click();
    const hasBuiltin = await page.evaluate(
      () => typeof BUILTIN_CASE !== "undefined" && BUILTIN_CASE != null
    );
    if (!hasBuiltin) {
      await page.locator("#loadGroup6Case").click();
      const statusText =
        (await page.locator("#status").textContent())?.trim() || "";
      const devOk =
        statusText.includes("not embedded") &&
        statusText.includes("build.js");
      if (!devOk) {
        ok =
          record(
            "U group6 one-click load",
            false,
            `dev fallback status="${statusText}"`
          ) && ok;
      } else ok = record("U group6 one-click load (dev fallback)", true) && ok;
    } else {
      await page.locator("#loadGroup6Case").click();
      await page.waitForTimeout(300);
      await page.locator('#nav button[data-pagejump="3"]').click();
      const recordSummary =
        (await page.locator("#recordSummary").textContent())?.trim() || "";
      await page.locator('#nav button[data-pagejump="5"]').click();
      const claimCards = await page.locator(".claim-card").count();
      const uOk =
        recordSummary === uExpectedRecord &&
        claimCards === uClaimCount &&
        ctx.pageErrors.length === uPeBefore;
      if (!uOk) {
        ok =
          record(
            "U group6 one-click load",
            false,
            `summary="${recordSummary}" cards=${claimCards}/${uClaimCount}`
          ) && ok;
      } else ok = record("U group6 one-click load", true) && ok;
    }
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

  await page.locator('#nav button[data-pagejump="8"]').click();
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

  await page.locator('#nav button[data-pagejump="4"]').click();
  await page.locator('#tabs button[data-model="causal"]').click();
  const causalText = "CAUSAL-TAB-ISOLATION-TEST-ALPHA";
  const hierText = "HIERARCHY-TAB-ISOLATION-TEST-BETA";
  await page.locator("#modelConclusion").fill(causalText);
  await page.locator('#tabs button[data-model="hierarchical"]').click();
  const hierEmpty = await page.locator("#modelConclusion").inputValue();
  await page.locator("#modelConclusion").fill(hierText);
  await page.locator('#tabs button[data-model="causal"]').click();
  const causalBack = await page.locator("#modelConclusion").inputValue();
  const lOk = hierEmpty === "" && causalBack === causalText;
  if (!lOk) {
    ok =
      record(
        "L model tab text isolation",
        false,
        `hier="${hierEmpty}" causal="${causalBack}"`
      ) && ok;
  } else ok = record("L model tab text isolation", true) && ok;

  await page.locator('#nav button[data-pagejump="6"]').click();
  await page.locator("#gapVerdict").selectOption("A gap may exist");
  await page.locator("#gapMechanism").selectOption("Duty has no named owner");
  await page.waitForTimeout(150);
  const gapPath1 = (await page.locator("#gapPath").innerText()).trim();
  await page.locator("#gapVerdict").selectOption("No gap established");
  await page.waitForTimeout(150);
  const gapPath2 = (await page.locator("#gapPath").innerText()).trim();
  const mOk =
    gapPath1.includes("Duty has no named owner") && gapPath2.length > 0;
  if (!mOk) {
    ok =
      record(
        "M gap page linkage",
        false,
        `mechanism path="${gapPath1.slice(0, 60)}" afterNoGap="${gapPath2.slice(0, 60)}"`
      ) && ok;
  } else ok = record("M gap page linkage", true) && ok;

  if (fs.existsSync(group6Fixture)) {
    const g6 = JSON.parse(fs.readFileSync(group6Fixture, "utf8"));
    const actorCount = g6.actors.length;
    const topFact = highestFactId(g6.facts);
    const topTime = highestTimelineId(g6.timeline);
    await page.locator("#load").setInputFiles(group6Fixture);
    await page.waitForTimeout(400);
    await page.locator('#nav button[data-pagejump="2"]').click();
    const g6Cards = await page.locator("#actorlist article.card").count();
    if (g6Cards !== actorCount) {
      ok =
        record(
          "N group6 stakeholder cards",
          false,
          `expected ${actorCount} got ${g6Cards}`
        ) && ok;
    } else ok = record("N group6 stakeholder cards", true) && ok;
    await page.locator('#nav button[data-pagejump="7"]').click();
    const g6Nodes = await page.locator("[data-mapactor]").count();
    if (g6Nodes !== actorCount) {
      ok =
        record(
          "N group6 SVG actor nodes",
          false,
          `expected ${actorCount} got ${g6Nodes}`
        ) && ok;
    } else ok = record("N group6 SVG actor nodes", true) && ok;
    const [g6Export] = await Promise.all([
      page.waitForEvent("download"),
      page.locator("#export").click(),
    ]);
    const g6Text = await readDownload(g6Export);
    const factLine = g6Text
      .split("\n")
      .find((l) => l.startsWith(topFact + " "));
    if (!factLine) {
      ok =
        record(
          "N group6 export top fact line",
          false,
          `missing line for ${topFact}`
        ) && ok;
    } else ok = record("N group6 export top fact line", true) && ok;
    const timeLine = g6Text
      .split("\n")
      .find((l) => l.startsWith(topTime + " "));
    if (!timeLine) {
      ok =
        record(
          "N group6 export top timeline line",
          false,
          `missing line for ${topTime}`
        ) && ok;
    } else ok = record("N group6 export top timeline line", true) && ok;
    if (!g6Text.includes("S10:")) {
      ok = record("N group6 export S10 source", false) && ok;
    } else ok = record("N group6 export S10 source", true) && ok;
    if (Array.isArray(g6.claims) && g6.claims.length > 0) {
      const ans4Head = (g6.fields?.answer4 || "").slice(0, 40);
      const firstClaim = g6.claims[0];
      const oOk =
        g6Text.includes("CLAIMS") &&
        g6Text.includes(`actor=${firstClaim.actor}`) &&
        ans4Head.length > 0 &&
        g6Text.includes(ans4Head);
      if (!oOk) {
        ok =
          record(
            "O group6 claims and legal answer export",
            false,
            `claims=${g6.claims.length} ans4Head=${JSON.stringify(ans4Head)}`
          ) && ok;
      } else ok = record("O group6 claims and legal answer export", true) && ok;
    }
    const nf = g6.facts.length;
    const ng = g6.facts.filter((f) => f.kind === "given").length;
    const na = g6.facts.filter((f) => f.kind === "assumed").length;
    const nt = g6.timeline.length;
    const expectedSummary = `${nf} facts recorded · ${ng} given · ${na} assumed · ${nt} timeline entries`;
    const qPeBefore = ctx.pageErrors.length;
    await page.locator('#nav button[data-pagejump="3"]').click();
    const summaryText =
      (await page.locator("#recordSummary").textContent())?.trim() || "";
    const factRows = await page.locator(".record-fact-row").count();
    const assumedBadgeCount = await page.locator(
      '.record-fact-row span.pill:has-text("assumed")'
    ).count();
    const qOk =
      summaryText === expectedSummary &&
      factRows === nf &&
      assumedBadgeCount === na &&
      ctx.pageErrors.length === qPeBefore;
    if (!qOk) {
      ok =
        record(
          "Q group6 case record page",
          false,
          `summary="${summaryText}" rows=${factRows} assumedBadges=${assumedBadgeCount}`
        ) && ok;
    } else ok = record("Q group6 case record page", true) && ok;

    const floorStyle = await page.evaluate(() => {
      const row = document.querySelector(".record-fact-row");
      if (!row) return { ok: false, reason: "no .record-fact-row" };
      const height = row.getBoundingClientRect().height;
      const borderTop = getComputedStyle(row).borderTopWidth;
      return {
        ok: height > 0 && borderTop !== "0px",
        height,
        borderTop,
      };
    });
    if (!floorStyle.ok) {
      ok =
        record(
          "V record readability floor",
          false,
          JSON.stringify(floorStyle)
        ) && ok;
    } else ok = record("V record readability floor", true) && ok;

    const linkCount = g6.links.length;
    const relInvolved = new Set();
    for (const l of g6.links) {
      relInvolved.add(l.from);
      relInvolved.add(l.to);
    }
    const relActorCounts = {};
    for (const l of g6.links) {
      relActorCounts[l.from] = (relActorCounts[l.from] || 0) + 1;
      relActorCounts[l.to] = (relActorCounts[l.to] || 0) + 1;
    }
    const busiestEntry = Object.entries(relActorCounts).sort(
      (a, b) => b[1] - a[1] || a[0].localeCompare(b[0])
    )[0];
    const busiestId = busiestEntry[0];
    const busiestCount = busiestEntry[1];
    const rPeBefore = ctx.pageErrors.length;
    await page.locator('#nav button[data-pagejump="3"]').click();
    const allRelRows = await page.locator(".record-rel-row").count();
    const allSummary =
      (await page.locator("#relSummary").textContent())?.trim() || "";
    const expectedAllSummary = `${linkCount} relationships recorded across ${relInvolved.size} actors`;
    const relFramingExpected =
      "Line counts show how many recorded relationships touch an actor. They are not a measure of responsibility.";
    const relFramingText =
      (await page.locator("#relFraming").textContent())?.trim() || "";
    await page.selectOption("#relFilter", busiestId);
    await page.waitForTimeout(100);
    const filteredRows = await page.locator(".record-rel-row").count();
    const filteredSummary =
      (await page.locator("#relSummary").textContent())?.trim() || "";
    const busiestName =
      g6.actors.find((a) => a.id === busiestId)?.name || "Unnamed stakeholder";
    const expectedFilteredSummary = `${busiestCount} relationships involving ${busiestId} ${busiestName}`;
    const rOk =
      allRelRows === linkCount &&
      allSummary === expectedAllSummary &&
      relFramingText === relFramingExpected &&
      filteredRows === busiestCount &&
      filteredSummary === expectedFilteredSummary &&
      ctx.pageErrors.length === rPeBefore;
    if (!rOk) {
      ok =
        record(
          "R group6 relationship view",
          false,
          `allRows=${allRelRows}/${linkCount} allSummary=${JSON.stringify(allSummary)} framing=${JSON.stringify(relFramingText)} filtered=${filteredRows}/${busiestCount} filtSummary=${JSON.stringify(filteredSummary)}`
        ) && ok;
    } else ok = record("R group6 relationship view", true) && ok;

    const expectedGroupedSummary = `${linkCount} relationships recorded across ${relInvolved.size} actors`;
    const busiestOutgoing = g6.links.filter((l) => l.from === busiestId).length;
    const busiestHeadingNeedle = `${busiestId} ${busiestName} — ${busiestOutgoing} outgoing`;
    const sampleFactId =
      g6.links.find((l) => l.factIds?.length)?.factIds[0] || "";
    const [sExportDl] = await Promise.all([
      page.waitForEvent("download"),
      page.locator("#export").click(),
    ]);
    const sExportText = await readDownload(sExportDl);
    const sGroupedStart = sExportText.indexOf("RELATIONSHIPS BY ACTOR");
    const sGroupedBlock =
      sGroupedStart >= 0
        ? sExportText.slice(sGroupedStart, sGroupedStart + 12000)
        : "";
    const sOk =
      sGroupedBlock.includes(expectedGroupedSummary) &&
      sGroupedBlock.includes(busiestHeadingNeedle) &&
      sampleFactId &&
      sGroupedBlock.includes(`factIds: ${sampleFactId}`) &&
      ctx.pageErrors.length === rPeBefore;
    if (!sOk) {
      ok =
        record(
          "S group6 grouped relationship export",
          false,
          `summary=${sGroupedBlock.includes(expectedGroupedSummary)} heading=${sGroupedBlock.includes(busiestHeadingNeedle)} fact=${sampleFactId && sGroupedBlock.includes(`factIds: ${sampleFactId}`)}`
        ) && ok;
    } else ok = record("S group6 grouped relationship export", true) && ok;

    const claims = g6.claims || [];
    const claimVerdictCounts = {};
    for (const c of claims) {
      claimVerdictCounts[c.verdict] = (claimVerdictCounts[c.verdict] || 0) + 1;
    }
    const claimActors = new Set(claims.map((c) => c.actor)).size;
    const claimSupported = claimVerdictCounts.Supported || 0;
    const claimContested = claimVerdictCounts.Contested || 0;
    const claimNotEst = claimVerdictCounts["Not established"] || 0;
    const expectedClaimSummary = `${claims.length} claims recorded · ${claimSupported} supported · ${claimContested} contested · ${claimNotEst} not established · across ${claimActors} actors`;
    const claimFramingExpected =
      "A verdict records how well the claim is supported by the case facts. It is not a score of the actor's responsibility.";
    const sampleClaim =
      claims.find((c) => c.counter && String(c.counter).trim()) || claims[0];
    const counterNeedle = sampleClaim?.counter
      ? String(sampleClaim.counter).slice(0, 72)
      : "";
    const topVerdictEntry = Object.entries(claimVerdictCounts).sort(
      (a, b) => b[1] - a[1] || a[0].localeCompare(b[0])
    )[0];
    const topVerdict = topVerdictEntry?.[0] || "";
    const topVerdictCount = topVerdictEntry?.[1] || 0;
    const tPeBefore = ctx.pageErrors.length;
    await page.locator('#nav button[data-pagejump="5"]').click();
    const claimSummaryText =
      (await page.locator("#claimSummary").textContent())?.trim() || "";
    const claimCards = await page.locator(".claim-card").count();
    const framingText =
      (await page.locator("#claimFraming").textContent())?.trim() || "";
    const headingCausal = await page
      .locator(".claim-group-heading")
      .filter({ hasText: /^Causal —/ })
      .count();
    const headingHier = await page
      .locator(".claim-group-heading")
      .filter({ hasText: /^Hierarchy and organization —/ })
      .count();
    const headingFuture = await page
      .locator(".claim-group-heading")
      .filter({ hasText: /^Forward-looking —/ })
      .count();
    const counterVisible =
      counterNeedle.length > 0 &&
      (await page.locator("#claimsBody").innerText()).includes(counterNeedle);
    await page.selectOption("#claimFilter", topVerdict);
    await page.waitForTimeout(100);
    const filteredClaimCards = await page.locator(".claim-card").count();
    const tOk =
      claims.length > 0 &&
      claimSummaryText === expectedClaimSummary &&
      claimCards === claims.length &&
      headingCausal === 1 &&
      headingHier === 1 &&
      headingFuture === 1 &&
      counterVisible &&
      framingText === claimFramingExpected &&
      filteredClaimCards === topVerdictCount &&
      ctx.pageErrors.length === tPeBefore;
    if (!tOk) {
      ok =
        record(
          "T group6 claims view",
          false,
          `summary=${JSON.stringify(claimSummaryText)} cards=${claimCards}/${claims.length} filtered=${filteredClaimCards}/${topVerdictCount} headings=${headingCausal}/${headingHier}/${headingFuture}`
        ) && ok;
    } else ok = record("T group6 claims view", true) && ok;

    const peBefore = ctx.pageErrors.length;
    await page.locator('#nav button[data-pagejump="8"]').click();
    await page.locator("#reflectAnswer").click();
    await page.waitForTimeout(400);
    const reflectCards = await page.locator("#feedback article.card").count();
    if (reflectCards < 1) {
      ok =
        record(
          "P group6 reflect feedback cards",
          false,
          `cards=${reflectCards}`
        ) && ok;
    } else ok = record("P group6 reflect feedback cards", true) && ok;
    const peAfter = ctx.pageErrors.length;
    if (peAfter > peBefore) {
      ok =
        record(
          "P group6 reflect zero page errors",
          false,
          ctx.pageErrors.slice(peBefore, peBefore + 2).join(" | ")
        ) && ok;
    } else ok = record("P group6 reflect zero page errors", true) && ok;
  } else {
    ok =
      record(
        "N group6 fixture load",
        false,
        "project-group6.json missing"
      ) && ok;
  }

  const ef = await page.evaluate(() => emptyFact());
  const efOk =
    ef.id === "" &&
    ef.text === "" &&
    ef.kind === "assumed" &&
    ef.timeId === "" &&
    Array.isArray(ef.knownBy) &&
    ef.knownBy.length === 0 &&
    Array.isArray(ef.sourceIds) &&
    ef.note === "";
  if (!efOk) {
    ok = record("J emptyFact defaults", false, JSON.stringify(ef)) && ok;
  } else ok = record("J emptyFact defaults", true) && ok;

  await page.locator("#load").setInputFiles(danglingFixture);
  await page.waitForTimeout(300);
  const statusDangle = (await page.locator("#status").textContent())?.trim() || "";
  if (/Could not load project/i.test(statusDangle)) {
    ok =
      record("K dangling timeId loads", false, statusDangle) && ok;
  } else ok = record("K dangling timeId loads", true) && ok;

  const [dangleExport] = await Promise.all([
    page.waitForEvent("download"),
    page.locator("#export").click(),
  ]);
  const dangleText = await readDownload(dangleExport);
  const missingLine = dangleText
    .split("\n")
    .find((l) => l.includes("[time: MISSING T7]"));
  if (!missingLine) {
    ok = record("K dangling export MISSING tag", false) && ok;
  } else {
    ok = record("K dangling export MISSING tag", true) && ok;
    console.log("Dangling FACTS line:", missingLine);
  }

  await page.evaluate(() => {
    const a = emptyActor();
    a.name = "Doctor";
    state.actors = [a];
    state.timeline = [
      { id: "T2", date: "Day 1", event: "Deploy", knownBy: [] },
    ];
    state.facts = [
      {
        id: "E3",
        text: "Brake override was disabled.",
        kind: "assumed",
        timeId: "T2",
        knownBy: [a.id],
        sourceIds: [],
        note: "",
      },
    ];
  });

  const [exportDl] = await Promise.all([
    page.waitForEvent("download"),
    page.locator("#export").click(),
  ]);
  const exportText = await readDownload(exportDl);
  if (!exportText.includes("FACTS") || !exportText.includes("TIMELINE")) {
    ok = record("H export section headers", false) && ok;
  } else ok = record("H export section headers", true) && ok;
  const formatLine = exportText
    .split("\n")
    .find((l) => /^E3 \[(given|assumed)\]/.test(l));
  if (!formatLine) {
    ok = record("H export fact format line", false) && ok;
  } else {
    ok = record("H export fact format line", true) && ok;
    console.log("Formatted FACTS line:", formatLine);
  }
  if (
    !formatLine ||
    !formatLine.includes("(T2)") ||
    !formatLine.includes("known by: Doctor")
  ) {
    ok = record("H export time and knownBy labels", false) && ok;
  } else ok = record("H export time and knownBy labels", true) && ok;

  if (ctx.pageErrors.length) {
    record(
      "I zero page errors",
      false,
      ctx.pageErrors.slice(0, 3).join(" | ")
    );
  } else record("I zero page errors", true);
  if (ctx.consoleErrors.length) {
    record(
      "I zero console errors",
      false,
      ctx.consoleErrors.slice(0, 3).join(" | ")
    );
  } else record("I zero console errors", true);

  return ok;
}

function printSummary(ctx) {
  const failed = ctx.results.filter((r) => !r.ok).length;
  const passed = ctx.results.filter((r) => r.ok).length;
  console.log(
    `SUMMARY (${ctx.label}): ${passed} passed, ${failed} failed (${ctx.results.length} checks)`
  );
  return failed === 0;
}

async function runTarget(browser, targetPath, label) {
  const ctx = createRunContext(label);
  const page = await browser.newPage();
  page.on("dialog", (dialog) => dialog.accept());
  attachPageDiagnostics(page, ctx);

  const url = pathToFileURL(targetPath).href;
  await page.goto(url);
  await page.waitForTimeout(500);

  const allOk = await runChecks(page, ctx);
  await page.close();
  printSummary(ctx);
  return allOk;
}

async function main() {
  execSync("node tools/build.js", { cwd: root, stdio: "inherit" });
  if (!fs.existsSync(distHtml)) {
    console.error("FAIL build: dist HTML missing");
    process.exit(1);
  }

  const srcHtml = path.join(root, "src", "index.html");
  if (!fs.existsSync(srcHtml)) {
    console.error("FAIL src/index.html missing");
    process.exit(1);
  }

  const browser = await chromium.launch();
  const distOk = await runTarget(browser, distHtml, "dist");
  const srcOk = await runTarget(browser, srcHtml, "src");
  await browser.close();

  process.exit(distOk && srcOk ? 0 : 1);
}

main().catch((err) => {
  console.error("FAIL harness:", err);
  process.exit(1);
});
