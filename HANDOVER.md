# Frontend handover — Responsibility Lab (Group 6)

This document is for the teammate who styles **`src/style.css` only**. The teaching app is plain HTML + two JavaScript files; content and behaviour are frozen on the tech side.

---

## 1. The deliverable and hard constraints

- **One self-contained HTML file** is produced by `node tools/build.js` → `dist/Responsibility-Lab-Group6.html`.
- The build **inlines** `style.css`, `engine.js`, and `app.js` into that file (see `tools/build.js`).
- **Offline / file://** — The presentation team opens the built file by double-click. No server, no install step at demo time.
- **No runtime npm**, no CDN links, no web fonts, no remote images, no framework.
- **Hand off `dist/Responsibility-Lab-Group6.html`** (rebuild after CSS changes: `node tools/build.js`, then confirm with `npm run verify`).

---

## 2. Ownership and boundaries

| Area | Owner |
|------|--------|
| `src/style.css` | Frontend (you) |
| `src/app.js`, `src/engine.js` | Tech — do not edit |
| `src/index.html` markup / ids | Tech — request changes via issue, do not change locally for styling |

- **Do not rename** `id`, `class`, or `data-*` attributes used by `app.js` or `tests/browser-check.mjs`.
- **Do not change visible copy** in HTML or JS strings — case content is authored and verified.
- Styling may only target **existing** classes/ids or **unstyled hooks** listed in §3 (no renames).

---

## 3. Inventory of unstyled CSS hooks

These classes are emitted in JS/HTML **without** dedicated rules in `style.css` today. Style them for projection readability; do not rename.

| Hook | Where | Contents / readability requirement |
|------|--------|-------------------------------------|
| `record-timeline` | Case record | One timeline entry (`T#`, date, event, known-by). Must read as a distinct block at 1280×720; date/event hierarchy clear. |
| `record-fact-row` | Case record | Nested fact under a timeline entry or “no time link” group: `E#`, **given/assumed** `pill`, text, known-by. **Given vs assumed must be distinguishable without reading badge text alone** (weight, border, or icon — not colour-only). Rows must stay scannable in a long list. |
| `record-rel-row` | Case record → Relationships | One relationship: from→to names, action, basis, fact id chips. Dense text — needs comfortable line-height and spacing between rows. |
| `record-rel-chip` | Inside `record-rel-row` | Plain `pill` wrapping a fact id (e.g. `E17`). Chips should wrap cleanly; ids must stay legible. |
| `claims-model-conclusions` | Claims page | Wrapper for the “Model conclusions” block (three model cards). Should separate this block from claim cards below. |
| `claims-model-block` | Model conclusions | Per-model card: model name, conclusion paragraph, muted evidence paragraph. Long prose — max-width / line-length for projection. |
| `claim-group-heading` | Claims page | `<h3>` per model group with counts (supported/contested/not established) and optional “(filtered: N shown)”. Headings must stand out from claim cards. |
| `claim-card` | Claims page | Full claim: id, actor, verdict `pill`, claim, task, fact/source chips, counter-argument, reason. **Counter-argument is the focal field** — must not collapse visually into body text. Verdict badges need non-colour-only distinction (see §5). |
| `claim-chip` | Inside `claim-card` | Fact or source id chips (`pill`). Same as `record-rel-chip`. |

**Already styled elsewhere (extend carefully):** `card`, `pill`, `muted`, `row`, `grid`, `tabs`, `visual-map`, `actor-node`, `map-detail`, `result-card`, `gap-chain`, `source-entry`, `rubric-grid`, etc.

---

## 4. The hardcoded-colour problem

In `src/app.js`, **`statusColor(verdict)`** returns fixed hex values:

- Supported `#5e7e37`
- Contested `#b78230`
- Not established `#899382`
- Unassessed `#c5c9c1`

Used in **`renderVisual()`** for SVG stroke colours on actor nodes and connector paths, and referenced by the on-screen map key (inline `style` on `.key-dot` in `index.html`).

**Proposed coordinated refactor (tech commit, not a CSS-only change):**

1. Define in `:root`: `--status-supported`, `--status-contested`, `--status-not-established`, `--status-unassessed`.
2. Change **`statusColor()`** in `app.js` to read `getComputedStyle(document.documentElement).getPropertyValue('--status-…')` (or map verdict → custom property name) when setting SVG `stroke` / `fill`.
3. Align `.map-key .key-dot` inline colours with the same variables (may require a small HTML/JS tweak).

Until then, changing map colours requires editing **`app.js`**, not `style.css`.

---

## 5. Readability requirements for projection

- Body text **≥ 16px** effective size (match or exceed current `body { font: 16px … }`).
- **SVG labels** in `#responsibilityMap` legible at **1280×720** (actor name + verdict line).
- **Relationship and claim rows:** enough vertical spacing and line-height for multi-line action/basis/counter text.
- **Verdict badges** (`pill` on claims and map key): Supported vs Contested vs Not established vs Unassessed distinguishable **without relying on colour alone** (weight, pattern, label text, or shape).

---

## 6. Print / PDF requirements

Existing print rules in `style.css`:

- `@media print { section[hidden] { display: block } }` — all pages visible when printing.
- `@media print { nav, .page-controls { display: none } }` — hide nav and prev/next.

Please extend print styles as needed:

- Hide header action buttons (Save, Load, Export, Reset) if they appear in printouts.
- Prefer **`break-inside: avoid`** on `claim-card`, `record-rel-row`, and long `record-timeline` blocks where possible.
- Do not rely on background fills for meaning (projectors and print may drop them).

---

## 7. Accessibility — do not regress

Already present:

- Global focus styles (including SVG **`.actor-node:focus rect`** stroke).
- SVG nodes: `role="button"`, `tabindex="0"`, keyboard Enter/Space in `app.js`.
- **`#status`**, **`#feedback`**, **`#mapDetail`**: `aria-live` where set in HTML.
- Tab order follows DOM order on each visible page.

Do not remove `aria-current="page"` on nav buttons or tab `aria-selected` on model/visual tabs.

---

## 8. How to verify your work

```bash
npm run verify
```

- Runs imports, engine golden, **`node tools/build.js`**, then Playwright on **`dist/Responsibility-Lab-Group6.html`** and **`src/index.html`** (45 checks as of this handover).
- Any runtime error or broken selector fails the run.

Also manually:

- Open `src/index.html` via file:// — **no console errors**.
- Rebuild dist and spot-check the built file.

**Report back:** what you changed in CSS, what you did not verify, and **confirm zero class renames** (expected).

---

## 9. Open questions for the tech side

- [ ] Approve CSS custom properties + `statusColor()` refactor for map/key colours?
- [ ] Should print CSS hide the entire `<header>` button row?
- [ ] Target palette / brand colours for verdict states and given vs assumed facts?
- [ ] Any slide-specific layout (e.g. claims page: counter-argument callout box)?
