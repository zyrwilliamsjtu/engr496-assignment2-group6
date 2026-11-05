# Responsibility Lab (Group 6)

Offline teaching app for analyzing responsibility in AI/robot cases — split from the instructor prototype for ENGR4960J.

## Directory map

| Path | Purpose |
|------|---------|
| `reference/prototype.html` | Unmodified instructor single-file original |
| `src/index.html` | App markup; links `style.css` and `app.js` |
| `src/style.css` | Styles extracted from the prototype |
| `src/app.js` | Application logic extracted from the prototype |
| `tools/build.js` | Inlines CSS/JS into a single distributable HTML file |
| `dist/Responsibility-Lab-Group6.html` | Built single-file output (generated; do not hand-edit) |

## Develop

Open the split app directly in a browser (no server required):

```text
src/index.html
```

## Build

```bash
node tools/build.js
```

Produces `dist/Responsibility-Lab-Group6.html`.

## Division of work

- **app.js** — tech lead
- **style.css** — frontend
