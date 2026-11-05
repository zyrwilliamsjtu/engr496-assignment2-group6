# Presentation team brief — Responsibility Lab demo

**Load:** `dist/Responsibility-Lab-Group6.html` (file://) after loading the group project via **Load project** → `tools/fixtures/project-group6.json` (or the copy you receive). **Export analysis** produces the same text the markers see.

## Suggested ~3-minute live path

1. **Case record (nav page “Case record”)** — *“Here is the full case as data: timeline, facts tagged given or assumed, and who knew what.”* Scroll to **Relationships**; leave filter on **All actors**; mention the muted line that counts are not responsibility scores.
2. **Case record → filter** — Select the busiest actor (e.g. **A2 Treating physician**). *“Nine links touch this role; outgoing counts in group headings are within the filter, not total involvement.”*
3. **Claims (nav page “Claims”)** — *“Each structured claim includes the strongest counter-argument—we had to record dissent, not only our side.”* Point at one **Supported** and one **Contested** card; briefly read the counter line.
4. **Claims → filter** — Filter by **Supported** (or the dominant verdict). *“The summary and group headings show how many claims survive the filter.”*
5. **Gaps (nav page “Gaps”)** — *“We argued a forward-looking gap: unassigned post-deployment verification, with a named repair and completion checks.”* (Fields are already filled in the fixture.)
6. **Visualization (nav page “Visualization”)** — Switch map tabs (causal / legal / forward-looking); click one stakeholder. *“The map mirrors our recorded verdicts—it does not calculate blame.”*
7. **Results (nav page “Results”)** or header **Final answer / reflection** — *“Three conclusion fields and overall conclusion; Reflect runs offline pattern checks, not an AI grade.”*

## Screenshots worth capturing

| Screen | State |
|--------|--------|
| Case record | Full timeline + **Relationships** unfiltered (29 rows) |
| Case record | **relFilter** = busiest actor (e.g. A2), filtered summary visible |
| Claims | **Model conclusions** block + first causal claim showing **Strongest counter-argument** |
| Claims | **claimFilter** = Supported (or Contested), filtered summary |
| Gaps | `gapPath` chain filled (task → mechanism → people/check) |
| Visualization | Causal tab, one actor selected, `#mapDetail` open |

## Reflection question drafts (first person plural)

### (1) How the program improved the quality of our analysis

Using Responsibility Lab forced us to separate **evidence from invention**: every fact is tagged **given** or **assumed**, so we could not treat unstated premises as if they were on the record. The **Claims** page required a **strongest counter-argument** for each of our fifteen claims, which made us document opposing readings instead of only defending our allocation. The **relationship view** made handoffs visible—especially duties that the case text assigns to nobody (e.g. post-deployment verification), which we would otherwise have discussed only in prose. The **gap section** pushed us to name a **missing task**, a **mechanism**, a plausible **owner**, and a **verifiable completion marker**, not a vague “someone should do better.” Together, those structures improved traceability and dissent more than a single essay field would have.

### (2) Main limitation and one feasible improvement

The main limitation is that **automated feedback and rubric indicators check wording patterns**, not whether our reasoning is sound. They cannot verify facts, sources, legal accuracy, or ethical correctness; a fluent answer can trigger “support indicators” without being right. A feasible improvement is to lean further into what we already started: **structured claims with linked fact and source ids**, plus an explicit step where a **second reader** (or a checklist derived from the case record) marks whether each cited fact actually supports the claim—rather than expanding regex rules on free-text conclusions alone.
