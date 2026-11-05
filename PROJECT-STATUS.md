# Project status — Responsibility Lab (Group 6, ENGR4960J assignment 2)

**Case**: AI medical recommendation — subgroup harm after a model update.
**State**: tech phase complete; handed to frontend design and to the presentation team.

**Deliverable**: `delivery/Responsibility-Lab-Group6.html` — one self-contained
file, offline, opens by double-click, one button loads the case.
**Dev entry**: `src/index.html` (no embedded case; run `node tools/build.js` first).

**Scale**: 10 pages · 23 facts (6 given / 17 assumed) · 9 timeline entries ·
12 actors · 29 relationships · 15 claim cards · 10 sources.

**Quality gate**: 48 automated browser checks, run against both the built file and
the dev entry (`npm run verify`) · delivery file asserted byte-consistent with the
build · builds reproducible (deterministic stamp, clean working tree after verify).

**Central argument**: the responsibility gap lies in forward-looking duty
allocation, not in culpability — post-deployment subgroup verification was assigned
to no party, and this survives Tigard's objection because it is an allocation
finding rather than a blame finding.

**Known boundaries**: facts, timeline entries, relationships and claims are
read-only in the UI (produced by the content pipeline and imported); stakeholders,
model conclusions, gap fields and final answers are editable. The visualisation
page reproduces the user's own verdicts and does not compute a share of
responsibility.

**Open items**: frontend visual design (autonomous, see HANDOVER.md) · presentation
team rehearsal (see PRESENTATION-NOTES.md) · PI to read Q5 and Q6 wording once more.
