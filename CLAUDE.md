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
Optionally refresh the local copy of the link-preview card (the deploy redraws it either way):
```
python3 scripts/og/build-og.py health
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
"targets": {
  "stepsMinimum": 10000, "stepsGoal": 13500,
  "weighInsPerWeek": 7, "liftsPerWeek": 5, "cardioPerWeek": 3
}
```
- `type` is `cut` | `bulk` | `maintain`. `label` defaults to the type.
- A phase runs until the next one starts; the latest with no `end` is ongoing. Set `end` explicitly **only** to leave a deliberate gap with no phase.
- `goalWeight` is optional. When set, the banner shows distance and percent complete — signed so the same arithmetic serves a cut and a bulk. `goalRemaining` is a magnitude, always positive.
- To start a new block, append a phase with the new `start`; that automatically closes the previous one. Don't set `end` on the old phase as well.
- The goal line is drawn on the weight chart **only when the goal falls inside the visible y-range**. That axis is zoomed to the data on purpose, and stretching it to reach a distant goal would flatten the daily movement. The banner reports the goal regardless — this is not a bug.
- `goalCals` is the phase's daily calorie target, drawn as a dashed rule on the calories chart. It is phase-scoped because it changes when the block changes — a bulk gets its own number. Steps targets live in `targets` instead, because they are standing habits rather than properties of a block.
- A marker's `icon` (a single emoji) is drawn in that day's consistency-grid cell **in place of the rest dash**. The matching note lives in `ConsistencyNotes`, rendered **below** the consistency charts so the marks come first; it only lists markers inside the charted date range. Markers are deliberately **not** drawn on the weight chart — that flag was removed on request.

### Goals and streak
Three standing goals live in `targets`, all expressed per week so one rule scores them all: `weighInsPerWeek` (7 = measure every day), `liftsPerWeek`, `cardioPerWeek`. A goal left unset is **not scored**, rather than counted as zero.

`buildWeeklyGoals` scores each week; `goalStreak` counts consecutive weeks back from the newest where every goal was met. The newest week is **passed over, not counted against, while it is still filling up** — a Wednesday is not a failed week. The "Goal streak" stat tile and the goals panel at the top of the Consistency section both read from this.

`activeStreak` (consecutive active days, Sunday rest days skipped) is still computed and tested but is no longer surfaced — the tile it used to fill now shows the goal streak. Its rule, if it comes back: Sunday is a scheduled rest day, so an inactive Sunday neither breaks nor extends the run; an unplanned rest on any other weekday does break it; a Sunday that *was* trained counts normally.

Chart rules that are deliberate, not accidental:
- **No dual-axis charts.** Cardio minutes are not plotted against session counts; the total is a stat tile.
- Weight y-axis is zoomed to the data range, never anchored at zero.
- The 7-day trend line is hidden until 14 days exist; weekly bars until 2 weeks exist.
- Series colors are validated categorical slots — see the note in `app/health/components/chartTheme.ts` before changing any of them.
- Entry animation is off (`ANIMATE = false`); an animating chart reads as empty on load.
- Reference-line labels sit in a right-hand gutter (`margin.right: 64`, `position: 'right'`). Inside the plot they landed on top of the bars.
- **The four daily charts share their geometry.** Weight, steps, macros and calories all use `DAILY_MARGIN` and `DAILY_Y_WIDTH` from `chartTheme.ts`, so a given day sits at the same x in every one and the day labels line up down the page. They were four different combinations of margin and axis width, which is why the columns did not agree. Don't set a per-chart margin or `YAxis width` on any of them; change the shared token instead. The weight chart also takes `DAILY_X_BAND` because a line chart otherwise anchors its end points on the plot edge instead of insetting them half a band like a bar.
- The calories chart hides its all-time-average rule whenever `goalCals` is set, because the two sit a few kcal apart and stack into what looks like one line. The average is still a stat tile. Without a goal the average rule comes back.
- The day table draws a heavier rule on the first row of each new week (`.is-week-start`) instead of banding alternate rows.
- Each goal is a meter, not a chart: it is one magnitude against a known ceiling. Met state carries a check glyph and words as well as color.
- `.health-note` uses a 96ch measure with `text-wrap: balance`. The old 60ch measure wrapped one-line notes short of the card edge and left orphans like "to zero." on their own line.
- The phase banner's "Per week" figure is `weightChangePerWeek`: the change divided by the weighed span in weeks, counted inclusively so the denominator matches the "N days tracked" beside it. Null until a full week has been weighed, since a rate from two days is noise.

## Content rules
All copy must be external-safe. No internal vendor names (OneTrust, SharePoint), no named regulators or audit firms, no financial specifics. When in doubt, generalize: "company web properties", "brand portfolio", "privacy request data".

## Link previews (OpenGraph cards)
`public/og-image.png` (homepage) and `public/og-health.png` (/health) are generated by `scripts/og/build-og.py`, which lays each card out in HTML and screenshots it with headless Chrome at 2x. Needs Chrome and Pillow.

```
python3 scripts/og/build-og.py           # both
python3 scripts/og/build-og.py health    # after importing a week
```

- **PNG, never SVG.** iMessage, Teams, Slack, LinkedIn and WhatsApp all silently ignore SVG previews and fall back to a bare text card. The site shipped a `.svg` card for months for exactly this reason; don't reintroduce one.
- `/health` must declare its own `openGraph.images`. Declaring `openGraph` on a child route **replaces** the parent's images rather than merging, so omitting them means no card at all.
- `twitter.card` is `summary_large_image` on both. `summary` is the small square layout and crops a 1200x630 card badly.
- The homepage card is a fixed design; the health card is **derived from `data/health.json`**.
- The health card is redrawn automatically on every deploy — see the "Redraw the /health link preview" step in `.github/workflows/deploy.yml`. Importing a week is a push, so the live card is never stale. Run the generator locally too if you want the committed PNG to match, but the deploy does not depend on it.
- If that CI step ever fails the whole deploy fails, which is deliberate: a silently stale card showing last month's weight is worse than a visible red build.
- Cards use the site's own Playfair Display and Outfit, committed as `scripts/og/*.woff2` so a render never silently falls back to a system face.

## Favicons
`app/icon.svg` (the W, from the site icons and his shirt) and `app/health/icon.svg` (a falling trend line, so the tracker tab is not mistaken for the main site). Both are an ink `#14130f` rounded square. `public/icon-192.svg` and `icon-512.svg` are the PWA sizes of the W and are referenced from `manifest.json`. The old indigo gradient (`#6366f1` → `#8b5cf6`) is gone — it no longer matched anything on the site.

Favicon strokes are deliberately heavy: a hairline chart line disappears at 16px. Check any change by rendering it at 16px, not just at 512.

## Image processing
Mascot images processed with Pillow: `filter: grayscale(100%) brightness(1.15) contrast(0.78)` in CSS. Source files in `~/Downloads/{name}-header.jpg`.

## Smart quotes
File contains Unicode smart quotes (e.g. `’`). Use Python string replacement when `Edit` tool fails on apostrophes — don't rely on exact quote matching.
