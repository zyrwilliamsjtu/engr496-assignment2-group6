# Frontend handover — Responsibility Lab (Group 6)

## 1. What you own

All visual design lives in **`src/style.css`**; every decision about colour, type, spacing, hierarchy, and emphasis is yours.

## 2. What must not break, and why

- **`id`, `class`, and `data-*` attributes** — These are the event system’s and the automated test suite’s only handle on the DOM (~47 checks). Renaming any of them breaks behaviour silently and fails CI. If markup needs to change, ask us to commit it.

- **`src/app.js`, `src/engine.js`, and markup/text in `src/index.html`** — Not yours to edit. Visible copy and case content are authored, verified, and frozen.

- **`dist/` and `delivery/`** — Build outputs from `node tools/build.js`. Hand-editing them creates a stale handover file that still passes local edits but not `npm run verify`.

- **Single offline HTML file** — Presentation uses **`delivery/Responsibility-Lab-Group6.html`** (or `dist/` after build): double-click, no server, no network. The build inlines CSS/JS and the embedded case JSON. No CDN, web fonts, remote images, or frameworks — anything external simply will not load on the presentation machine.

- **Four verdict states** (Supported, Contested, Not established, Unassessed) — Used on the SVG map strokes, map key, and claim badges. If meaning depends on colour alone, a colour-blind presenter or a black-and-white print cannot read the map or cards.

- **Accessibility that already works** — Keep visible focus outlines, keyboard-focusable SVG actor nodes (`role="button"`, Enter/Space), `aria-live` regions (`#status`, `#feedback`, `#mapDetail`), and sensible DOM tab order on the visible page.

- **Printing** — On screen, only one `<section>` is visible; `@media print` rules expose all sections. After layout changes, use **Ctrl+P**: every page must appear; sections should not split in unusable ways.

- **1280×720 projection** — That is the presentation resolution; legibility will be judged at that size only.

## 3. Hooks with no finished design yet

Emitted in HTML/JS today; the **MINIMUM READABILITY FLOOR** block styles them temporarily.

| Hook | Contains / reader task |
|------|-------------------------|
| `record-timeline` | One timeline entry: id, date, event, who knew. Reader scans the chronology. |
| `record-fact-row` | One fact: id, given/assumed tag, statement, known-by. Reader scans the list and spots which facts are assumptions. |
| `record-rel-row` | One relationship: from→to, action, basis, fact-id chips. Reader follows who is linked to whom and on what basis. |
| `record-rel-chip` | One fact id cited on a relationship row. Reader sees which record lines support the link. |
| `claims-model-conclusions` | Wrapper for the three “Model conclusions” blocks above the claim list. Reader sees student model text separate from structured claims. |
| `claims-model-block` | One model’s saved conclusion plus evidence note. Reader compares causal, hierarchy, and forward-looking write-ups. |
| `claim-group-heading` | Per-model claim count line (and optional filter suffix). Reader orients within causal / hierarchy / forward-looking groups. |
| `claim-card` | One claim: id, actor, verdict, claim text, task, fact/source chips, counter-argument, reason. Reader must not miss the counter-argument or verdict. |
| `claim-chip` | One fact or source id on a claim. Reader ties the claim to the case record. |

## 4. Coordination (tech commit, not `style.css` alone)

- **`statusColor()` in `src/app.js`** — Returns four hardcoded hex values for SVG strokes and related UI. To own the palette, ask us to wire these to `:root` custom properties; do not edit `app.js` yourself.

- **New wrapper elements or class hooks in markup** — Request a tech-side change; we will add hooks without renaming existing ones.

## 5. Placeholder styling

At the end of **`src/style.css`**, the block headed **`MINIMUM READABILITY FLOOR — replaced by frontend design`** exists only so the app is readable before your work lands. Delete or replace it entirely — we have no attachment to it.

## 6. How to check your work

- **`npm run verify`** — Must stay fully green (real browser on built file and dev entry point; catches runtime and selector breaks).
- **`src/index.html` via file://** — No console errors.
- **Ctrl+P** — All pages visible in print preview.

## 7. Open questions (tech side)

- [ ] Replace `statusColor()` hex literals with CSS variables you control?
- [ ] Any new DOM hooks for layout you cannot achieve with existing structure?
- [ ] Print: hide header buttons in print media, or leave as-is?
