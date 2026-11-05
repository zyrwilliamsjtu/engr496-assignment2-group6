/**
 * Shared dossier validation, patches, and referential integrity (Group 6).
 */
const fs = require("fs");
const path = require("path");

const FACT_ID_RE = /^E\d+(-[a-z]+)?$/;

const EXPECTED_AFTER_PATCH = {
  sources: 11,
  facts: 23,
  timeline: 9,
  actors: 12,
  links: 29,
};

const P4_LEGAL_REASON_APPEND =
  "Contested rather than Supported: knowledge, control and the disclosure channel sit with this party, but classifying a learned model under a defective-product rule is itself the contested step (see answer4, Layer 3).";

function loadJson(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  try {
    return { data: JSON.parse(raw), raw };
  } catch (err) {
    const msg = err.message;
    const m = /position (\d+)/.exec(msg);
    const off = m ? Number(m[1]) : 0;
    const ctx = raw.slice(Math.max(0, off - 40), off + 40);
    console.error(`JSON.parse failed: ${msg}`);
    console.error(`Context @${off}: ${JSON.stringify(ctx)}`);
    process.exit(1);
  }
}

function factById(facts, id) {
  return facts.find((f) => f.id === id);
}

function verifyRelayIntegrity(dossier) {
  const checks = [
    {
      key: "a",
      pass:
        (factById(dossier.facts, "E20")?.text || "")
          .toLowerCase()
          .includes("2023-09-20, within the 24-hour period") === true,
      label: "E20.text contains 2023-09-20 within 24-hour period",
    },
    {
      key: "b",
      pass: !(factById(dossier.facts, "E20")?.text || "")
        .toLowerCase()
        .includes("10-working-day"),
      label: "E20.text does NOT contain 10-working-day",
    },
    {
      key: "c",
      pass: (factById(dossier.facts, "E9-a")?.note || "").startsWith(
        "ALTERNATIVE BRANCH"
      ),
      label: 'E9-a.note starts with ALTERNATIVE BRANCH',
    },
    {
      key: "d",
      pass: (dossier.timeline.find((t) => t.id === "T9")?.event || "")
        .toLowerCase()
        .includes(
          "event entered 2023-09-20 (within the 24-hour policy)"
        ),
      label: "T9.event contains event entered 2023-09-20 policy phrase",
    },
    {
      key: "e",
      pass: (factById(dossier.facts, "E3")?.note || "")
        .toLowerCase()
        .includes("knowledge of the two facts is held separately"),
      label: "E3.note knowledge held separately",
    },
    {
      key: "f",
      pass: (factById(dossier.facts, "E20")?.note || "")
        .toLowerCase()
        .includes("revised per ruling c"),
      label: "E20.note Revised per ruling C",
    },
  ];
  let ok = true;
  for (const c of checks) {
    console.log(`${c.pass ? "PRESENT" : "ABSENT"} A2-${c.key}: ${c.label}`);
    if (!c.pass) ok = false;
  }
  return ok;
}

function applyCasePatches(dossier, sourcesAppendPath) {
  const reports = [];

  const t5 = dossier.timeline.find((t) => t.id === "T5");
  if (!t5) {
    reports.push({ patch: "P1", status: "not-found", detail: "T5 missing" });
  } else {
    const old =
      "no new submission filed.";
    const neu =
      "no new submission was required under the threshold rule and none was filed.";
    if (t5.event.includes(neu)) {
      reports.push({ patch: "P1", status: "already-applied" });
    } else if (t5.event.includes(old)) {
      t5.event = t5.event.replace(old, neu);
      reports.push({ patch: "P1", status: "applied" });
    } else {
      reports.push({
        patch: "P1",
        status: "not-found",
        detail: "T5.event missing expected substring",
      });
    }
  }

  const p2Link = {
    from: "A12",
    to: "A2",
    action:
      "ranks first an option the review record states was not clinically indicated",
    reason: "post-event case review finding (E21)",
    factIds: ["E21"],
  };
  const hasP2 = dossier.links.some(
    (l) =>
      l.from === "A12" &&
      l.to === "A2" &&
      l.action === p2Link.action &&
      (l.factIds || []).includes("E21")
  );
  if (hasP2) {
    reports.push({ patch: "P2", status: "already-applied" });
  } else {
    dossier.links.push(p2Link);
    reports.push({ patch: "P2", status: "applied" });
  }

  const extraSources = JSON.parse(fs.readFileSync(sourcesAppendPath, "utf8"));
  if (!Array.isArray(extraSources)) throw new Error("SOURCES file must be array");
  const hasS10 = dossier.sources.some((s) => s.id === "S10");
  if (hasS10) {
    reports.push({ patch: "P3", status: "already-applied" });
  } else {
    const ids = new Set(dossier.sources.map((s) => s.id));
    for (const src of extraSources) {
      if (ids.has(src.id)) continue;
      dossier.sources.push(src);
      ids.add(src.id);
    }
    if (!dossier.sources.some((s) => s.id === "S10")) {
      reports.push({ patch: "P3", status: "not-found", detail: "S10 missing after append" });
    } else {
      reports.push({ patch: "P3", status: "applied" });
    }
  }

  const a9 = dossier.actors.find((a) => a.id === "A9");
  if (!a9) {
    reports.push({ patch: "P4", status: "not-found", detail: "A9 missing" });
  } else if (a9.legal === "Contested") {
    reports.push({ patch: "P4", status: "already-applied" });
  } else {
    a9.legal = "Contested";
    reports.push({ patch: "P4", status: "applied" });
  }

  for (const r of reports) {
    console.log(
      `${r.patch}: ${r.status}${r.detail ? " — " + r.detail : ""}`
    );
    if (r.status === "not-found") {
      throw new Error(`Patch ${r.patch} not found`);
    }
  }
  return dossier;
}

function printCountAssertion(dossier) {
  const actual = {
    sources: dossier.sources.length,
    facts: dossier.facts.length,
    timeline: dossier.timeline.length,
    actors: dossier.actors.length,
    links: dossier.links.length,
  };
  console.log("Declared vs actual counts:");
  for (const k of Object.keys(EXPECTED_AFTER_PATCH)) {
    const exp = EXPECTED_AFTER_PATCH[k];
    const got = actual[k];
    console.log(`  ${k}: expected ${exp}, actual ${got}${exp === got ? "" : " MISMATCH"}`);
  }
  const ok = Object.keys(EXPECTED_AFTER_PATCH).every(
    (k) => actual[k] === EXPECTED_AFTER_PATCH[k]
  );
  if (!ok) process.exit(1);
  return actual;
}

function readSelectEnumsFromHtml(htmlPath) {
  const html = fs.readFileSync(htmlPath, "utf8");
  function optionsFor(id) {
    const re = new RegExp(`id="${id}"[^>]*>([\\s\\S]*?)</select>`, "i");
    const m = re.exec(html);
    if (!m) throw new Error(`select #${id} not found in index.html`);
    const opts = [...m[1].matchAll(/<option[^>]*>([^<]+)</g)].map((x) => x[1]);
    return opts;
  }
  return {
    control: optionsFor("gapVerdict").length
      ? [
          "Unassessed",
          "Sufficient",
          "Limited",
          "Insufficient",
          "Uncertain",
        ]
      : [],
    kind: [
      "Person",
      "Organization",
      "Technical system",
      "Affected stakeholder",
    ],
    sourceTopic: optionsFor("gapVerdict").length
      ? []
      : [],
  };
}

function readActorAndSourceEnums(htmlPath) {
  const html = fs.readFileSync(htmlPath, "utf8");
  const topicBlock = html.match(/data-skey="topic"[^]*?<\/select>/);
  const topics = topicBlock
    ? [...topicBlock[0].matchAll(/<option[^>]*>([^<]+)</g)].map((m) => m[1])
    : [];
  return {
    control: [
      "Unassessed",
      "Sufficient",
      "Limited",
      "Insufficient",
      "Uncertain",
    ],
    kind: [
      "Person",
      "Organization",
      "Technical system",
      "Affected stakeholder",
    ],
    sourceTopic: topics.length
      ? topics
      : [
          "General",
          "Causal",
          "Hierarchy and organization",
          "Forward-looking",
          "Responsibility gaps",
          "Legal responsibility",
        ],
  };
}

function collectReferentialViolations(dossier, enums) {
  const v = [];
  const actorIds = new Set(dossier.actors.map((a) => a.id));
  const factIds = new Set(dossier.facts.map((f) => f.id));
  const timelineIds = new Set(dossier.timeline.map((t) => t.id));
  const sourceIds = new Set(dossier.sources.map((s) => s.id));

  function uniq(collection, label) {
    const seen = new Set();
    for (const item of collection) {
      const id = item.id;
      if (seen.has(id)) v.push(`${label} duplicate id ${id}`);
      seen.add(id);
    }
  }
  uniq(dossier.sources, "sources");
  uniq(dossier.facts, "facts");
  uniq(dossier.timeline, "timeline");
  uniq(dossier.actors, "actors");

  for (const f of dossier.facts) {
    if (!FACT_ID_RE.test(f.id)) v.push(`facts ${f.id} invalid id format`);
    for (const id of f.knownBy || []) {
      if (!actorIds.has(id)) v.push(`facts ${f.id} knownBy unknown actor ${id}`);
    }
    if (f.timeId && !timelineIds.has(f.timeId)) {
      v.push(`facts ${f.id} timeId unknown ${f.timeId}`);
    }
    for (const sid of f.sourceIds || []) {
      if (!sourceIds.has(sid)) v.push(`facts ${f.id} sourceIds unknown ${sid}`);
    }
  }
  for (const t of dossier.timeline) {
    for (const id of t.knownBy || []) {
      if (!actorIds.has(id)) {
        v.push(`timeline ${t.id} knownBy unknown actor ${id}`);
      }
    }
  }
  for (const l of dossier.links) {
    if (!actorIds.has(l.from)) v.push(`links from unknown ${l.from}`);
    if (!actorIds.has(l.to)) v.push(`links to unknown ${l.to}`);
    for (const fid of l.factIds || []) {
      if (!factIds.has(fid)) v.push(`links ${l.from}->${l.to} factIds unknown ${fid}`);
    }
  }
  for (const a of dossier.actors) {
    if (!enums.kind.includes(a.kind)) {
      v.push(`actors ${a.id} kind illegal: ${a.kind}`);
    }
    if (a.control && !enums.control.includes(a.control)) {
      v.push(`actors ${a.id} control illegal: ${a.control}`);
    }
  }
  for (const s of dossier.sources) {
    if (!enums.sourceTopic.includes(s.topic)) {
      v.push(`sources ${s.id} topic illegal: ${s.topic}`);
    }
  }
  return v;
}

function deadWeightReport(dossier) {
  const inFactKnownBy = new Set();
  for (const f of dossier.facts) {
    for (const id of f.knownBy || []) inFactKnownBy.add(id);
  }
  const inLinks = new Set();
  for (const l of dossier.links) {
    inLinks.add(l.from);
    inLinks.add(l.to);
  }
  const factInLinks = new Set();
  for (const l of dossier.links) {
    for (const fid of l.factIds || []) factInLinks.add(fid);
  }
  const orphanActors = dossier.actors
    .map((a) => a.id)
    .filter((id) => !inFactKnownBy.has(id) && !inLinks.has(id));
  const orphanFacts = dossier.facts
    .map((f) => f.id)
    .filter((id) => !factInLinks.has(id));
  return { orphanActors, orphanFacts };
}

module.exports = {
  FACT_ID_RE,
  EXPECTED_AFTER_PATCH,
  P4_LEGAL_REASON_APPEND,
  loadJson,
  verifyRelayIntegrity,
  applyCasePatches,
  printCountAssertion,
  readActorAndSourceEnums,
  collectReferentialViolations,
  deadWeightReport,
};
