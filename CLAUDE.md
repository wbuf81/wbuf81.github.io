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

### Phases, markers and targets
`data/health.json` also holds `phases` (blocks like a cut), `markers` (dated one-off events) and `targets` (standing daily numbers). These are hand-edited — the import script only touches `days`.

```json
"phases": [
  { "start": "2026-07-20", "type": "cut", "label": "Cut", "goalWeight": null, "goalCals": 2350, "note": "" }
],
"markers": [
  { "date": "2026-08-03", "label": "Deload", "icon": "⚡", "note": "" }
],
"targets": { "stepsMinimum": 10000, "stepsGoal": 13500 }
```
- `type` is `cut` | `bulk` | `maintain`. `label` defaults to the type.
- A phase runs until the next one starts; the latest with no `end` is ongoing. Set `end` explicitly **only** to leave a deliberate gap with no phase.
- `goalWeight` is optional. When set, the banner shows distance and percent complete — signed so the same arithmetic serves a cut and a bulk. `goalRemaining` is a magnitude, always positive.
- To start a new block, append a phase with the new `start`; that automatically closes the previous one. Don't set `end` on the old phase as well.
- The goal line is drawn on the weight chart **only when the goal falls inside the visible y-range**. That axis is zoomed to the data on purpose, and stretching it to reach a distant goal would flatten the daily movement. The banner reports the goal regardless — this is not a bug.
- `goalCals` is the phase's daily calorie target, drawn as a dashed rule on the calories chart. It is phase-scoped because it changes when the block changes — a bulk gets its own number. Steps targets live in `targets` instead, because they are standing habits rather than properties of a block.
- A marker's `icon` (a single emoji) is drawn in that day's consistency-grid cell **in place of the rest dash**, and the marker gets a line in the Notes list under the grid. That list is where the reason for an off day lives; it only shows markers falling inside the recorded date range. Markers also still flag the weight chart — that is the pre-existing behavior, not a duplicate bug.

### Streak rule
Sunday is a scheduled rest day: an inactive Sunday neither breaks nor extends the streak. An unplanned rest on any other weekday does break it. A Sunday that *was* trained counts normally.

Chart rules that are deliberate, not accidental:
- **No dual-axis charts.** Cardio minutes are not plotted against session counts; the total is a stat tile.
- Weight y-axis is zoomed to the data range, never anchored at zero.
- The 7-day trend line is hidden until 14 days exist; weekly bars until 2 weeks exist.
- Series colors are validated categorical slots — see the note in `app/health/components/chartTheme.ts` before changing any of them.
- Entry animation is off (`ANIMATE = false`); an animating chart reads as empty on load.
- Reference-line labels sit in a right-hand gutter (`margin.right: 64`, `position: 'right'`). Inside the plot they landed on top of the bars.
- The calories chart hides its all-time-average rule whenever `goalCals` is set, because the two sit a few kcal apart and stack into what looks like one line. The average is still a stat tile. Without a goal the average rule comes back.
- The day table draws a heavier rule on the first row of each new week (`.is-week-start`) instead of banding alternate rows.

## Content rules
All copy must be external-safe. No internal vendor names (OneTrust, SharePoint), no named regulators or audit firms, no financial specifics. When in doubt, generalize: "company web properties", "brand portfolio", "privacy request data".

## Image processing
Mascot images processed with Pillow: `filter: grayscale(100%) brightness(1.15) contrast(0.78)` in CSS. Source files in `~/Downloads/{name}-header.jpg`.

## Smart quotes
File contains Unicode smart quotes (e.g. `’`). Use Python string replacement when `Edit` tool fails on apostrophes — don't rely on exact quote matching.
