# wesleybard.com

## Deploy
Pushes to `main` auto-deploy to GitHub Pages via `.github/workflows/deploy.yml`. Build: `npm run build` (outputs to `./out`).

## Key files
- Homepage copy & projects section: `app/page.tsx` — `REPO_CARDS` (work agents) and `PERSONAL_CARDS` (public GitHub repos, each with a `group`) arrays
- Projects reads: **Work** → "Autonomous AI Agents" (the pet-named compliance agents, with the note explaining why they're named that way) and "Open Source"; **Personal** → the groups listed in `PERSONAL_GROUPS` ("Omarchy Linux", "Microcontrollers", "Everything else"), rendered in that order. Adding a personal repo means adding a card with a `group`; a new group needs a `PERSONAL_GROUPS` entry too. Personal cards are full-width rows (`agent-card-full`) because they carry no mascot — in a 3-up grid a one-card group sits stranded beside two empty columns. That layout hides `subtitle`, so don't put anything load-bearing there. Its `agent-body` is a **fixed three-column grid** (`260px | 1fr | 200px`), not flex: flex sized each row's columns to its own content, so stacked cards read as misaligned rows. The badge sits under the title for the same reason — inline, it landed at a different x on every row. Keep the tracks fixed if you add anything to these cards, and they collapse to one column under 768px.
- A personal card may carry an optional `hardware: { label, href }` — the board it runs on, linked to the vendor's product page (Waveshare, M5Stack). Cards are plain `div`s, not one big anchor, because a card can hold two destinations and a private repo holds only the board link. **Verify a product URL returns 200 before shipping it** — vendor shops retire SKUs and a dead link on the front page is worse than no link.
- The homepage is deliberately **not a résumé**: hero (name, Before/Now two-liner, arcade games, headshot) straight into Projects. The About/Experience/Expertise/Certifications sections were cut in Aug 2026 on outside feedback ("don't dupe LinkedIn — make it about the building"); the career history lives on LinkedIn, linked from Connect. Don't reintroduce résumé sections, and keep hero copy terse — Wes rejects anything that reads as a tagline.
- Agent mascot images: `public/agents/*.jpg` (800×480px, soft grayscale)

## /health — weekly tracker update
Unlinked page (no nav link, `noindex`, `Disallow: /health` in robots.txt, absent from sitemap). Deployed publicly, so it IS reachable by URL — that tradeoff was accepted deliberately; don't "fix" it by adding auth.

To add a week: Wes pastes the sheet rows (tab-separated, **12 columns**, Date→Notes). Then:
```
pbpaste | npm run health:add          # or: node scripts/add-health-week.mjs < week.tsv
node scripts/add-health-week.mjs --dry-run < week.tsv   # preview first
```
A successful import also draws the week's **share cards** into `.weekly/` — see "Weekly share cards" below. Pass `--no-cards` to skip.

Optionally refresh the local copy of the link-preview card (the deploy redraws it either way):
```
python3 scripts/og/build-og.py health
```

The script appends to `data/health.json`. **Hard errors** (wrong column count, unparseable number, duplicate date) refuse the import. **Warnings** (date gaps, weight swing >5 lb, cals outside 1,000–5,000, steps outside 0–50,000, a cardio note stating no minutes, a cardio note on a day with the box unchecked) print but still import — gaps and outliers are usually real. Always relay warnings to Wes rather than silently accepting them.

### The sheet's columns
Twelve, in order: Date, Day, Cals, Protein, Carbs, Fat, Weight, Steps, Workout, Cardio, **Cardio Notes**, **Notes**. The last two are separate columns and land in separate fields — `cardioNote` ("30 mins 12.5 / 3.0") and `notes` (everything else: "Church", "Jags Game").

- `cardioMinutes` is **read from the cardio note** ("45 mins …" → 45), falling back to 30 only when the note states no duration. Before Aug 2026 the two notes shared one column and 30 was assumed, so a longer session had to be corrected by hand after every import.
- Both columns are joined for display and for `noteMarks` matching by `noteTextFor` in `lib/noteMarks.ts` ("30 mins Orange Theory · Church"). Match against that, never against `notes` alone — the Orange Theory glyph is triggered by text that lives in the *cardio* note.
- `scripts/backfill-cardio-note.mjs` is the one-off migration that split the 35 pre-existing days. Kept as the record of that change; re-running it is a no-op.

Derivation logic is in `lib/health.ts` (pure functions, unit-tested in `__tests__/health.test.ts`). Never edit `data/health.json` by hand — use the script so the tested parser and validation run.

**`lib/health.ts` and everything it imports must stay loadable by plain Node** — the import script loads it outside the bundler. Type imports from `@/` aliases must be `import type` (Node's type stripping keeps value-form imports and can't resolve the alias); relative imports of other `lib/` modules must be extension-explicit (`./dayLabel.ts`). The dayLabel split broke the importer this way for six days in Aug 2026. After touching `lib/health.ts`'s import graph, smoke-test with `npm run health:add -- --dry-run < /dev/null` (an empty import is fine; "Could not load lib/health.ts" is the failure).

### Phases, markers and targets
`data/health.json` also holds `phases` (blocks like a cut), `markers` (dated one-off events), `targets` (standing daily numbers), `noteMarks` (glyphs keyed off a day's Notes text) and `calorieTargets` (dated daily calorie goals). These are hand-edited — the import script only touches `days`.

```json
"phases": [
  { "start": "2026-07-20", "type": "cut", "label": "Cut", "goalWeight": 190, "note": "" }
],
"markers": [
  { "date": "2026-08-03", "label": "Deload", "icon": "⚡", "note": "" }
],
"targets": [
  { "from": "2026-07-20", "stepsMinimum": 10000, "stepsGoal": 13500,
    "weighInsPerWeek": 7, "liftsPerWeek": 5, "cardioPerWeek": 3, "note": "Cut begins" }
],
"noteMarks": [
  { "match": "church", "icon": "✝️", "label": "Church" },
  { "match": "orange theory", "icon": "🍊", "label": "Orange Theory", "replaces": "cardio" }
],
"calorieTargets": [
  { "from": "2026-07-20", "cals": 2350, "note": "Cut begins" },
  { "from": "2026-08-10", "cals": 2450, "note": "" }
]
```
- `type` is `cut` | `bulk` | `maintain`. `label` defaults to the type.
- A phase runs until the next one starts; the latest with no `end` is ongoing. Set `end` explicitly **only** to leave a deliberate gap with no phase.
- `goalWeight` is optional. When set, the banner shows distance and percent complete — signed so the same arithmetic serves a cut and a bulk. `goalRemaining` is a magnitude, always positive.
- To start a new block, append a phase with the new `start`; that automatically closes the previous one. Don't set `end` on the old phase as well.
- The weight chart's y-axis stretches to include the **ongoing** phase's `goalWeight`, so the goal line is always in view during a block — Wes chose to trade some daily-wiggle resolution for seeing the distance left to cover (Aug 2026, reversing the earlier zoomed-to-data-only rule). Goals from already-closed phases are still only drawn when they happen to fall in range. Day-to-day resolution lives in the 7-day trend line and the weekly table instead.
- `calorieTargets` is the daily calorie target, **dated rather than phase-scoped**: each entry takes effect on its `from` date and runs until the next. The Aug 2026 cut moved 2,350 → 2,450 on Aug 10 without the block changing, which is why attaching it to the phase was wrong. To change the target, append an entry — never edit an old one, or history gets rescored against a number that wasn't in force. Resolver is `lib/calorieTarget.ts` (client-safe module, same reason as `lib/dayLabel.ts`), tested in `__tests__/calorieTarget.test.ts`. Steps targets live in `targets` because they are standing habits.
- `noteMarks` draw a glyph in a consistency-grid cell when the day's **Notes** mention the configured phrase (case-insensitive substring). Driven by the sheet's own text so a cross means "church was written down that day", not "it was a Sunday" — an earlier weekday-based version marked every Sunday whether he went or not. `replaces: "cardio"` swaps the orange cardio dot for the icon (Orange Theory instead of the usual treadmill session); without it the glyph draws alongside. They get a legend key but deliberately **no per-date note** — a recurring fact repeated under every chart is noise. Logic is `lib/noteMarks.ts`, tested in `__tests__/noteMarks.test.ts`.
- A marker's `icon` (a single emoji) is drawn in that day's consistency-grid cell **in place of the rest dash**. The matching note lives in `ConsistencyNotes`, rendered **below** the consistency charts so the marks come first; it only lists markers inside the charted date range. Markers are deliberately **not** drawn on the weight chart — that flag was removed on request.

### Goals and streak
Three standing goals live in `targets`, all expressed per week so one rule scores them all: `weighInsPerWeek` (7 = measure every day), `liftsPerWeek`, `cardioPerWeek`. A goal left unset is **not scored**, rather than counted as zero.

**`targets` is a list of dated revisions, not one object.** Each entry has a `from` date and **patches** the one before it, so a revision names only what changed. Append a revision to change a goal — never edit an old entry. This is not decoration: `buildWeeklyGoals` scores every week, so with a single undated object, raising `liftsPerWeek` from 5 to 6 silently re-scored every past week against a rule that was not in force and could wipe out an earned streak. A week that straddles a revision is scored by the one in force on its **last recorded day**, because a weekly count cannot be part-scored. Resolver is `lib/targets.ts` (client-safe), tested in `__tests__/targets.test.ts`.

`buildWeeklyGoals` scores each week; `goalStreak` counts consecutive weeks back from the newest where every goal was met. The newest week is **passed over, not counted against, while it is still filling up** — a Wednesday is not a failed week. The "Goal streak" stat tile and the goals panel at the top of the Consistency section both read from this.

`activeStreak` (consecutive active days, Sunday rest days skipped) is still computed and tested but is no longer surfaced — the tile it used to fill now shows the goal streak. Its rule, if it comes back: Sunday is a scheduled rest day, so an inactive Sunday neither breaks nor extends the run; an unplanned rest on any other weekday does break it; a Sunday that *was* trained counts normally.

Chart rules that are deliberate, not accidental:
- **No dual-axis charts.** Cardio minutes are not plotted against session counts; the total is a stat tile.
- Weight y-axis is zoomed to the data range plus the active goal, never anchored at zero.
- The 7-day trend line is hidden until 14 days exist; weekly bars until 2 weeks exist.
- Series colors are validated categorical slots — see the note in `app/health/components/chartTheme.ts` before changing any of them.
- Entry animation is off (`ANIMATE = false`); an animating chart reads as empty on load.
- Reference-line labels sit in a right-hand gutter (`margin.right: 64`, `position: 'right'`). Inside the plot they landed on top of the bars.
- **The four daily charts share their geometry.** Weight, steps, macros and calories all use `DAILY_MARGIN` and `DAILY_Y_WIDTH` from `chartTheme.ts`, so a given day sits at the same x in every one and the day labels line up down the page. They were four different combinations of margin and axis width, which is why the columns did not agree. Don't set a per-chart margin or `YAxis width` on any of them; change the shared token instead. The weight chart also takes `DAILY_X_BAND` because a line chart otherwise anchors its end points on the plot edge instead of insetting them half a band like a bar.
- All four label the x-axis with `dayTickLabel` from `lib/dayLabel.ts` ("Mon 20", "Sun 02"). That helper is its own module, not part of `lib/health.ts`, because the charts are client components and `lib/health.ts` touches `fs` at module scope. The weight chart used to label by date ("Jul 20") while the others labelled by weekday. The leading zero is kept so every label is the same width.
- The calories chart hides its all-time-average rule whenever any calorie target applies, because the two sit a few kcal apart and stack into what looks like one line. The average is still a stat tile. With no target the average rule comes back.
- The calorie target is a **stepped line** (`ComposedChart`, `type="stepAfter"`), not a flat `ReferenceLine`: the target changes mid-block, and one flat rule would silently score early days against a number that wasn't in force yet. It is drawn *after* the bars so it reads on top of them, and in neutral ink rather than the series blue, because the bars are already blue. This is a single-axis chart (kcal against kcal), so it does not break the no-dual-axis rule.
- The steps chart's floor and goal are **stepped lines** too, for the same reason as the calorie target, and in neutral inks (`MUTED_MARK` for the floor, `TEXT_SECONDARY` for the goal) because the bars are already blue. They lost their right-gutter labels in the process; the section note states both numbers instead.
- Below the steps chart, `buildStepStreaks` reports how long the floor and the goal have each been held. Each day is judged against the threshold **in force that day**, so raising a goal cannot retroactively break a run earned under the old one. A day with no steps reading is **skipped, not counted as a miss** — no reading is unknown, not a failure. When the current run *is* the longest, the detail line reads "best run yet" rather than printing the same number twice.
- The day table draws a heavier rule on the first row of each new week (`.is-week-start`) instead of banding alternate rows.
- Each goal is a meter, not a chart: it is one magnitude against a known ceiling. Met state carries a check glyph and words as well as color.
- `.health-note` uses a 96ch measure with `text-wrap: balance`. The old 60ch measure wrapped one-line notes short of the card edge and left orphans like "to zero." on their own line.
- **The page opens on one card** (`WeekLead`): the newest week's average weight vs the week before as the headline, the week's other averages beside it, and the running block's story (start → now, rate, goal progress) below a rule in the same card. It was two cards — weekly averages above a phase banner — but they retold the same story; `PhaseBanner` was folded in and deleted. The headline is never a single weigh-in: Aug 17–23 ended at 204.6 lb after starting at 203.0, which read as a gain even though the week's average *fell* 0.4 lb — one reading moves a pound or two on water, and the page updates weekly, so the week is the unit of progress. The card must read on its own to a visiting coach. The latest reading survives as a stat tile ("Latest weigh-in · one reading"); the "Week over week" and "This week" tiles are gone because the lead says both; "Est. deficit" (maintenance − intake) took the freed slot, keeping the tile grid an even 4×2. Don't restore a single-day headline.
- The block strip's "Per week" figure is `weightChangePerWeek`: the change divided by the weighed span in weeks, counted inclusively so the denominator matches the "N days tracked" beside it. Null until a full week has been weighed, since a rate from two days is noise.
- **"Recent pace" is `recentChangePerWeek`**: a least-squares slope over the weigh-ins in the trailing 21 days (`RECENT_WINDOW_DAYS`), fitted rather than endpoint-to-endpoint — the first version used the window's two end readings and one watery Sunday swung the projection by months. Null until the phase is older than the window, because until then "recent" and "all-time" are the same measurement. **The projection (`projectedGoalDate`) extrapolates the recent rate once it exists**, falling back to the all-time rate for young phases: five weeks in, the all-time −1.1/wk was front-loaded by the first fortnight's water and promised Nov 22 when the settled ~−0.6/wk pace says early Feb. The whole-block rate deliberately stays endpoint-based — start-to-now is a fact, not an estimate. The status share card shows the recent rate in its "Per week" fact when it exists.
- **`estimatedMaintenance` reads the same trailing 21-day window** (fitted slope × 3,500 under the window's average intake), not the whole span — maintenance drifts as a diet goes on, and the all-span version carried the week-1–2 whoosh forever, overstating the deficit (576 vs the honest ~338 kcal at week 5). The "Est. deficit" tile is maintenance minus all-time average intake.

### The change log
The **Changes** section is `buildChangeLog`, derived from `phases`, `calorieTargets` and `targets` — never hand-written, so it cannot drift from the numbers the charts compute against. That is also why those three carry dates. Consequences worth knowing:
- Every dated entry takes an optional `note`, which becomes the "Why" column. That is the one thing derivation cannot supply — fill it in when changing a target.
- It reads **oldest first**, unlike every other table on the page, because it is a story rather than a snapshot.
- `goalWeight` rides on the phase rather than carrying its own date, so it is reported at the phase start. Changing it mid-phase updates that row rather than adding one; dating it would need the same treatment `calorieTargets` got.
- Markers are deliberately excluded — they are events, not target changes, and `ConsistencyNotes` already lists them.

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

## Weekly share cards
Three 1080x1350 PNGs for posting to X, drawn by `scripts/og/build-weekly.py` from the newest **complete** week:

```
npm run weekly:cards            # all three
npm run weekly:cards -- macros  # just one
npm run weekly:stats            # the numbers they use, as JSON
```

- `status` — the week's average weight vs the week before as the hero (the same never-a-single-weigh-in rule as the page's lead card; the Sunday weigh-in is named for what it is in the footer), with the cut below it: a ladder of blocks, one per pound between the start weight and the goal, plus rate, projection and the weigh-in trend. The bottom is a table of the last five weeks (or as many as exist), oldest first, older rows fading in steps toward the week being posted — each row the week's averages: weight (+delta), calories, protein, steps, lifts · cardio. It was one row of just the newest week, then briefly weight-only, then three rows; Wes wanted the full averages *and* the trajectory, then the longer window. The heading names the window ("last N weeks"). The lifts·cardio separator is deliberately wide-spaced so "5 · 3" cannot scan as 5.3. Copy is deliberately dry — facts, no narration; Wes flagged the explanatory captions as reading AI-written.
- `activity` — the week's training: a row per day with a steps bar, the 13.5k goal rule, and chips for lift / cardio / Orange Theory / church.
- `macros` (was `fuel` until Aug 2026) — calories and macros: bar length is the day's logged calories, the segments are that day's macro split. Those two are measured separately (grams x 4/4/9 rarely lands on a logged total), which is why the footer says which is which — don't relabel it as though the segments sum to the bar. A rule in the protein blue marks `proteinGoal` × 4 kcal: protein is the bar's first segment, so a day's blue segment reaching the rule means the grams were eaten. `proteinGoal` lives in `targets` (data/health.json) like the other standing goals, so revising it is an append and it shows in the change log.

Rules that are deliberate:
- **No name, handle or URL on any card.** `/health` is unlinked and `noindex`; printing its address on a public post would advertise it to exactly the audience it is kept from. Don't add attribution back.
- Output goes to `.weekly/` (gitignored). These are posts, not site assets — nothing here is served or deployed.
- Numbers come from `scripts/weekly-stats.mjs`, which reads `lib/health.ts`. Never recompute a figure inside the card script; a card that disagrees with the page is worse than no card.
- Only a **complete** week is drawn. With no finished week the chain exits **3**, which callers treat as a skip, not a failure.
- Card generation runs at the end of `npm run health:add` and can only ever **warn**: the data is already written by then, and a missing Chrome says nothing about whether the week imported.
- The palette is validated against the ink surface, not eyeballed — `#4a95e8` / `#e06a30` / `#2f9e6e` pass the lightness-band, chroma, colour-blind separation and contrast checks. Re-run a validator before changing any of them.
- Type is Outfit only, heavy and tightly tracked. The serif belongs to the site's own cards; these have to read as a scoreboard at thumbnail size.

## Favicons
`app/icon.svg` (the W, from the site icons and his shirt) and `app/health/icon.svg` (a falling trend line, so the tracker tab is not mistaken for the main site). Both are an ink `#14130f` rounded square. `public/icon-192.svg` and `icon-512.svg` are the PWA sizes of the W and are referenced from `manifest.json`. The old indigo gradient (`#6366f1` → `#8b5cf6`) is gone — it no longer matched anything on the site.

Favicon strokes are deliberately heavy: a hairline chart line disappears at 16px. Check any change by rendering it at 16px, not just at 512.

## Image processing
Mascot images processed with Pillow: `filter: grayscale(100%) brightness(1.15) contrast(0.78)` in CSS. Source files in `~/Downloads/{name}-header.jpg`.

## Smart quotes
File contains Unicode smart quotes (e.g. `’`). Use Python string replacement when `Edit` tool fails on apostrophes — don't rely on exact quote matching.
