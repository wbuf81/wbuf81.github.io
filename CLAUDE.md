# wesleybard.com

## Deploy
Pushes to `main` auto-deploy to GitHub Pages via `.github/workflows/deploy.yml`. Build: `npm run build` (outputs to `./out`).

## Key files
- Homepage copy & projects section: `app/page.tsx` — `REPO_CARDS` array
- Agent mascot images: `public/agents/*.jpg` (800×480px, soft grayscale)

## /health — weekly tracker update
Unlinked page (no nav link, `noindex`, `Disallow: /health` in robots.txt, absent from sitemap). Deployed publicly, so it IS reachable by URL — that tradeoff was accepted deliberately; don't "fix" it by adding auth.

To add a week: Wes pastes the sheet rows (tab-separated, columns Date→Notes). Then:
```
pbpaste | npm run health:add          # or: node scripts/add-health-week.mjs < week.tsv
node scripts/add-health-week.mjs --dry-run < week.tsv   # preview first
```
The script appends to `data/health.json`. **Hard errors** (wrong column count, unparseable number, duplicate date) refuse the import. **Warnings** (date gaps, weight swing >5 lb, cals outside 1,000–5,000, steps outside 0–50,000, cardio notes stating ≠30 min) print but still import — gaps and outliers are usually real. Always relay warnings to Wes rather than silently accepting them.

Derivation logic is in `lib/health.ts` (pure functions, unit-tested in `__tests__/health.test.ts`). Never edit `data/health.json` by hand — use the script so the tested parser and validation run.

Chart rules that are deliberate, not accidental:
- **No dual-axis charts.** Cardio minutes are not plotted against session counts; the total is a stat tile.
- Weight y-axis is zoomed to the data range, never anchored at zero.
- The 7-day trend line is hidden until 14 days exist; weekly bars until 2 weeks exist.
- Series colors are validated categorical slots — see the note in `app/health/components/chartTheme.ts` before changing any of them.
- Entry animation is off (`ANIMATE = false`); an animating chart reads as empty on load.

## Content rules
All copy must be external-safe. No internal vendor names (OneTrust, SharePoint), no named regulators or audit firms, no financial specifics. When in doubt, generalize: "company web properties", "brand portfolio", "privacy request data".

## Image processing
Mascot images processed with Pillow: `filter: grayscale(100%) brightness(1.15) contrast(0.78)` in CSS. Source files in `~/Downloads/{name}-header.jpg`.

## Smart quotes
File contains Unicode smart quotes (e.g. `’`). Use Python string replacement when `Edit` tool fails on apostrophes — don't rely on exact quote matching.
