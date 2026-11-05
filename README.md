# Responsibility Lab (Group 6)

To run the app: `node tools/build.js`, then open `dist/Responsibility-Lab-Group6.html`. No install, no dependencies, works offline.

Offline teaching app for analyzing responsibility in AI/robot cases — split from the instructor prototype for ENGR4960J.

## Development

Dev-only tooling (not shipped in `dist/`):

```bash
npm install
npx playwright install chromium
npm run verify
```

`npm run verify` rebuilds `dist/` and runs the Playwright harness in headless Chromium. Nothing from `node_modules` is referenced by `src/` or `dist/`.

## Directory map

| Path | Purpose |
|------|---------|
| `reference/prototype.html` | Unmodified instructor single-file original |
| `src/index.html` | App markup; links `engine.js`, `style.css`, and `app.js` |
| `src/engine.js` | Pure logic (schema, rules, export, migration) |
| `src/style.css` | Styles extracted from the prototype |
| `src/app.js` | DOM, rendering, and event wiring |
| `tools/build.js` | Inlines CSS/JS into a single distributable HTML file |
| `dist/Responsibility-Lab-Group6.html` | Built single-file output (generated; do not hand-edit) |

## Develop (split sources)

Open directly in a browser (loads `engine.js` + `app.js` from the same folder):

```text
src/index.html
```

## Build

```bash
node tools/build.js
```

Produces `dist/Responsibility-Lab-Group6.html` (self-contained; no npm packages or network calls).

## Division of work

- **app.js** / **engine.js** — tech lead
- **style.css** — frontend
