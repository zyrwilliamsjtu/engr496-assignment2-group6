# Presentation team brief — Responsibility Lab demo

**Handover file:** `delivery/Responsibility-Lab-Group6.html` (double-click, offline). On page 1 press **Load Group 6 case** and accept the confirm dialog — do not rely on **Load project** unless you are in dev `src/`. **Export analysis** produces the same text the automated checks expect.

---

## C1 — Live demo path (~3 minutes)

Numbered script; only UI that exists in the current build.

1. **Start / sources (page 1)** — Click **Load Group 6 case** → confirm **Replace the current analysis…** → wait for “Project loaded.” *“We start from an empty shell so we never accidentally show the wrong case; one click loads our Group 6 record.”* (Optional: point at the muted line under the button.)
2. **Case record (nav `4. Case record`)** — Scroll the timeline and fact rows. *“The case is data: timeline entries, facts tagged given or assumed, and who knew what at each step.”*
3. **Case record → Relationships** — Open **Show relationships involving**, choose **A2 Treating physician** (nine links touch this actor in our record). *“Filtering shows every relationship involving the busiest role; the outgoing count in the heading is within this filter, not a responsibility score.”*
4. **Three models (nav `5. Three models`)** — Click the **Causal**, **Hierarchy and organization**, and **Forward-looking** tabs; scroll the guide card. *“We applied three responsibility frameworks to the same facts; the tabs switch the model without leaving the page.”*
5. **Claims (nav `6. Claims`)** — Scroll to a card with **Strongest counter-argument** (e.g. a **Supported** causal claim on the supplier). Read the counter line aloud. *“Every claim includes dissent we had to record, not only our preferred verdict.”*
6. **Gaps (nav `7. Gaps`)** — Scroll the filled gap fields and the **gapPath** chain (task → mechanism → ownership/check). *“We argue a forward-looking gap: post-deployment verification was unassigned, with named repair steps and checkable markers.”*

**Do not open during this demo (and why):**

- **Start / sources (source editor)** after load — adds noise; sources are already in the loaded project.
- **Define case (page 2)** — long prose fields duplicate what we show structurally on Case record.
- **Stakeholders and duties (page 3)** — editable cards are not part of this case narrative; the loaded stakeholders are read-only for our demo path except that the app still allows adding/removing stakeholders in general.
- **Visualization (page 8)** — keep it for Q&A: it shows per-actor verdicts in the three responsibility modes, which answers “how did you compare the frameworks?”
- **Results / Reflect (page 9)** — reflection rubric looks like “grading”; save for Q&A.
- **Readings (page 10)** — bibliography, not the live argument.

---

## C2 — Anticipated questions (first person plural)

### Q1 — “Isn’t this program just regex matching?”

Yes, for the **Provisional automated rubric** and **Reflect on my answer** feedback: those paths scan student-authored text for pattern indicators, not truth. What is **structural** in the loaded case is different: **Claims** are fixed cards with mandatory **Strongest counter-argument** and **Reason for this verdict** fields; **Case record** facts carry **given** vs **assumed** tags and **Known by** lines; imports run **referential integrity** checks in our pipeline before the fixture ships. What is **not** structural is legal correctness, source quality, or whether a conclusion is ethically right—the app states that in the UI and export.

### Q2 — “Can I add my own fact or stakeholder?”

**Stakeholders:** yes—the **+ Add stakeholder** flow on page 3 still works on a loaded project. **Facts, timeline rows, relationships, and claims:** no editing UI—they arrive read-only from `tools/fixtures/project-group6.json` via the import pipeline. We drew that boundary so evidence stays stable while students still argue in model conclusions, gap fields, map verdicts, and final answers—the frontier between **recorded evidence** and **student judgment**.

### Q3 — “Why are 17 of 23 facts marked as assumptions?”

Three layers: (1) the brief asked us to **enrich** a sparse dossier without pretending everything was in the original record; (2) each **assumed** fact carries a **note** in the pipeline explaining why it was needed; (3) removing all seventeen would not flip the direction of our conclusion, because the **six given** facts already establish non-disclosure and non-knowledge at the points that matter for our gap argument.

### Q4 — “Why didn’t you just say nobody is responsible?”

Our gap is in **forward-looking duty allocation**, not a claim that no one is culpable. On our record, the supplier is listed as knowing (E4, E12, E19), so foreseeability is met and blame has a fitting target; the unresolved piece is who was assigned to **verify and disclose** after deployment, not whether harm occurred.

### Q5 — “What if the regulator’s framework DID require a new submission?”

That is the excluded branch **E9-a**, kept in the record and marked **ALTERNATIVE BRANCH**. Both branches are our own assumptions; the brief does not specify the approval framework. We adopted **E9-b** because it makes the question harder: we wanted to test whether a responsibility gap survives when every party complied with the rules. Under **E9-a** the case reduces to “someone skipped a filing”, and the finding we care about disappears.

### Q6 — “Which part did AI write?”

The **case dossier and analysis content** were drafted by a language model from our specifications and course readings; **we page-checked every quotation** against the PDFs. The **code** was built with an AI coding assistant under our specs and a **46-check** automated suite (`npm run verify`). **All responsibility judgments** in the fixture and in our written answers are ours.

### Q7 — “What about the map?”

The **Visualization** page records our per-actor verdicts across causal, legal and forward-looking responsibility. We keep it out of the three-minute path because reading a 12-actor map takes longer than the time we have, but it is the page to open if you want to see how the three models differ for one actor.

---

## C3 — Screenshot list (max six, persuasive order)

| # | Page | State before capture | One sentence it supports |
|---|------|----------------------|---------------------------|
| 1 | Case record | Load Group 6 case; unfiltered view | Shows the case as auditable data (timeline + given/assumed facts), not a single essay field. |
| 2 | Case record → Relationships | `#relFilter` = **A2 Treating physician** | Shows nine relationships touching the busiest actor without implying a “blame score.” |
| 3 | Claims | All claims; scroll to first **Supported** card with **Strongest counter-argument** visible | Shows dissent is mandatory structure, not optional prose. |
| 4 | Gaps | After load; scroll so **gapPath** chain is visible | Shows forward-looking gap as task + mechanism + owner/check, not vague “AI ethics.” |
| 5 | Three models | **Hierarchy and organization** tab selected | Shows we compared frameworks on the same case with model-specific guidance. |
| 6 | Start / sources | After **Load Group 6 case**; status shows “Project loaded.” | Shows the one-click load path that prevents a blank-screen demo. |

---

## Reflection question drafts (for written submission)

### (1) How the program improved the quality of our analysis

Using Responsibility Lab forced us to separate **evidence from invention**: every fact is tagged **given** or **assumed**, so we could not treat unstated premises as if they were on the record. The **Claims** page required a **strongest counter-argument** for each of our fifteen claims, which made us document opposing readings instead of only defending our allocation. The **relationship view** made handoffs visible—especially duties that the case text assigns to nobody (e.g. post-deployment verification), which we would otherwise have discussed only in prose. The **gap section** pushed us to name a **missing task**, a **mechanism**, a plausible **owner**, and a **verifiable completion marker**, not a vague “someone should do better.” Together, those structures improved traceability and dissent more than a single essay field would have.

### (2) Main limitation and one feasible improvement

The main limitation is that **automated feedback and rubric indicators check wording patterns**, not whether our reasoning is sound. They cannot verify facts, sources, legal accuracy, or ethical correctness; a fluent answer can trigger “support indicators” without being right. A feasible improvement is to lean further into what we already started: **structured claims with linked fact and source ids**, plus an explicit step where a **second reader** (or a checklist derived from the case record) marks whether each cited fact actually supports the claim—rather than expanding regex rules on free-text conclusions alone.
