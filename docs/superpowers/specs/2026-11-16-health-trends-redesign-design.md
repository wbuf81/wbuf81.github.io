# /health: Trends redesign and This week fixes

16 Nov 2026. Wes approved the mockup in `docs/design/health-trends-2026-11-16/mockup.html` ("i like all the stuff you showed there, lets do it") after a design review of the five /health pages.

## Why

Weight was the hardest thing to read on Trends, and it got harder every week:

- The weight line shared a chart with 119 calorie bars and a scale stretched to the bulk's 220 lb goal, so it used a third of the height. On a phone each bar was under 3px.
- Nothing showed the pace (pounds per week), the question a cut or a bulk asks every week.
- Several figures still assumed a cut, or blended a cut and a bulk: the "Est. surplus" tile took 3-week maintenance from all-time intake (224 kcal; the true figure was 487), the all-time average tiles, the red/green pattern cards, and a "big day" fixed at 2,900 kcal while the target was 2,700.
- The "mornings after a big day" chart drew a line and a label per day and had become unreadable.

Wes alternates cuts and bulks, so everything must read correctly for any sequence of blocks.

## The mockup is the reference

`docs/design/health-trends-2026-11-16/mockup.html` is a working page: the `<script>` at the bottom holds the exact logic for every chart (data shaping, scales, what is labelled, colours), and each card's "What's different" note says what changed. Where this spec and the mockup disagree, this spec wins.

**Port the logic, not the drawing technique.** The mockup measures its container and draws SVG text at pixel sizes. The site does not (see CLAUDE.md, "/health"): charts are hand-drawn SVG in a fixed `viewBox`, **drawn twice** (a `wide` and a `compact` frame, `VARIANTS` in `app/health/components/svg.ts`, CSS shows one, switching at 600px), with **labels as HTML laid over the plot in percentages** so text never stretches. Marks take token classes (`g-…`) from `app/health/health.css` (tokens only, no hex, every selector under `.wb`; `__tests__/health-css.test.ts`). No entry animation. Follow the existing charts (`WeightCalories.tsx`, `WeekByDay.tsx`) for the hover tooltip pattern.

**Fitting labels without measuring.** Where a label's room depends on the data (a block's name over a band of any width), make the label row an HTML grid whose columns are the blocks' shares of the plot, each cell `white-space: nowrap; overflow: hidden; text-overflow: ellipsis`, and render the long, middle and short wordings as three spans switched by **CSS container queries** on the cell's width (`container-type: inline-size`). A cell too narrow for even its short wording may let its label overflow to the left, right-aligned at the block's right edge. jsdom ignores container queries, so tests assert the wordings exist, not which one shows.

## Rules that change

- **Weight has its own chart.** The dual-axis "Weight and calories" chart is retired. Weight is zoomed to the readings in range; a goal off the scale becomes a label with an arrow at the top of its block ("goal 220 ↑ 15.9 lb to go", "goal 195 ↓ ended 5.7 lb short"), not a stretched axis. A goal that falls inside the scale is still a dashed `g-goal` line over its block.
- **The line runs through the weekly averages** (one point per Monday–Sunday week, at the week's middle), the numbers every card quotes. Daily weigh-ins are faint dots behind it. The trailing 7-day line is gone from this chart.
- **Each block is a labelled band**: alternate blocks tinted, a rule where each begins, and a label with name, dates and net change ("LEAN BULK · since Oct 26 · +1.6 lb").
- **A block may carry a planned pace**, `ratePerWeek` (lb a week, signed: +0.5 for the lean bulk). It draws a dashed plan line from the block's first weigh-in, and a band on the pace chart. A block without one has neither.
- **Calories sit under weight on the same dates**, drawn against each day's target (bars above and below a "target" baseline), coloured by the calendar's rule (`calorieLight` in `lib/healthCalendar.ts`): on target, close, off target. A bar per day up to 70 days in range, per week beyond that.
- **A range switch** on Trends (8 weeks · This block · Everything, default 8 weeks) redraws weight, pounds per week, steps and macros. The pattern cards (next morning, week by day) always use everything.
- **A big day is 20% or more over that day's target** (`BIG_DAY_RATIO = 1.2`), not a fixed 2,900 kcal. A day with no target is never big.
- **Pattern figures are plain ink.** "After a day over target +0.2 lb", "Friday to Sunday +843 kcal", "the morning after cardio −0.3 lb" describe patterns, not good or bad: no `is-good` / `is-over`.
- **Calories against target use the calendar's rule everywhere** (`calsTone`): on a cut, at or under is good, up to 10% over is plain, more is red (a cut week 3 kcal over is no longer red).
- **Tiles describe the block the newest data falls in**, never a cut and a bulk blended.
- **Each page is titled for its section** ("Trends", not "Health" five times), with one eyebrow line: "Health · Lean bulk, week 3".

## Step 1: foundations and This week

Files: `types/health.ts`, `lib/health.ts`, `lib/healthInsights.ts`, `data/health.json` (phases only), `app/health/components/format.ts`, `StatTiles.tsx`, `WeekLog.tsx`, `Consistency.tsx`, `HealthDashboard.tsx`, `app/health/HealthPage.tsx`, a new `app/health/components/SectionHeader.tsx`, `app/health/health.css`, and their tests.

1. **Planned pace.** `HealthPhase.ratePerWeek?: number | null`; `PhaseSummary.ratePerWeek: number | null` (from `buildPhases`). Add `"ratePerWeek": 0.5` to the lean bulk in `data/health.json` (phases are hand-edited; days are not). If `buildChangeLog` describes a phase's goal, describe its pace the same way.
2. **Big days.** In `lib/healthInsights.ts` replace `BIG_DAY` with `BIG_DAY_RATIO = 1.2`. `NextMorningPair` gains `vsTarget: number | null` (calories minus that day's target) and `big: boolean`. `nextMorningFacts(pairs)`: `big` averages the big pairs; the fit becomes `change = slope × vsTarget + intercept` over pairs that have a target. `afterBigDays(days, calorieTargets, horizon = 3)` selects big days by ratio and also returns, per offset 0…horizon, `{ mean, q1, q3, n }` over the traces that reach it (quartiles by linear interpolation, as `colStats` in the mockup), or null with none.
3. **Recent intake.** `HealthSummary.recentAvgCals: number | null`: the average intake over the same trailing window `estimatedMaintenance` uses (the `spanCals` already computed there), null when maintenance is null.
4. **Tiles** (`StatTiles`, which already receives `phase`, the block the newest data falls in):
   - Avg calories, Avg protein, Avg steps: the block's averages (`phase.avgCals` …), detail "per day, this cut" / "this bulk" / "this block" (maintain). With no block: the all-time figures and today's wording.
   - Est. surplus / Est. deficit: `estimatedMaintenance − recentAvgCals`, named by sign as today, detail "per day, last 3 weeks".
   - Tracked: "3 weeks", detail "this bulk · 119 days in all". With no block: as today.
   - Latest weigh-in, Est. maintenance, Goal streak: unchanged.
5. **`calsTone`** (`format.ts`): use `calorieLight` for every block type, cut included (hit → `is-good`, close → none, miss → `is-over`); outside any block, as a cut. With no average to compare, fall back to the sign.
6. **The log** (`WeekLog`): a key for the day dots beside the "The log" heading (Lift, Cardio, Rest, and the note marks, as the Consistency grid's legend). "Week ending · Lean bulk" stays on one line.
7. **Section header.** New `SectionHeader({ eyebrow, title, children })`: the eyebrow, an `h1.h-title` with the section's title, and `children` on the right of the same row (wrapping underneath on a phone). `HealthDashboard` renders it first in every section; `HealthPage` no longer renders the "Health" h1 or the lede. Eyebrow: "Health · {block label}, week {n}" from the block the newest data falls in (`leadPhase`, its `weekCount`); with no block, "Health · updated weekly". The title is smaller than today's 56px (about 46px at desktop).
8. **Habits** (`Consistency`): the two cardio-morning figures in plain ink.

## Step 2: Trends shell, Weight, Pounds per week

Files: new `app/health/components/Trends.tsx`, `WeightTrend.tsx`, `PaceChart.tsx`; `HealthDashboard.tsx`; `health.css`; delete `WeightCalories.tsx` and replace `__tests__/weightCaloriesBlocks.test.tsx`; tests.

1. **`Trends`** (client component): owns `range: 'w8' | 'block' | 'all'` (default `'w8'`), renders `SectionHeader` with the switch (`.h-seg`, `aria-pressed`, as the Calendar's Lights/Numbers switch) and every Trends card. `'w8'` is the last 56 recorded days; `'block'` starts at the first day of the block the newest day falls in (omit the option when there are no blocks); `'all'` is everything. A week belongs to a range when at least four of its days do. Everything it imports must be client-safe (`lib/health.ts` reads the filesystem and is not): take derived data as props from the server.
2. **`WeightTrend`**: as `drawWeight` in the mockup. The weight panel and the calorie strip share one x scale and one hover crosshair; the tooltip shows date, Phase, Weight, Week average, Calories and Against target (toned by `calsTone`). Label the newest weekly average, the first in range and the lowest. Under the chart, three plain facts: the newest week and its change; the change over the weeks shown (the difference of the two printed figures); the distance to the running block's goal.
3. **`PaceChart`** ("Pounds per week"): as `drawPace`. One bar per week (`WeeklyTrendRow.weightChange`), on the same day-based x scale and block bands as the weight chart so the two line up. Teal toward the block's goal, orange away, neutral for maintenance or no change. Where the block has a `ratePerWeek`, a band a quarter pound either side of it with a dashed centre, and the block label names it ("LEAN BULK · plan +0.5 lb a week"). Label every bar when the weeks are wide enough, otherwise only the newest, beside it. Four plain facts: last week; this block's average week-on-week change; the plan; this week's average against the plan line (omit the last two without a pace).
4. Legends for both, and `role="img"` with an `aria-label`. The Every-day and By-week tables in Records remain the table view.

## Step 3: the pattern charts, Steps and Macros

Files: `NextMorning.tsx`, `WeekByDay.tsx`, `StepsCard.tsx`, `MacrosCard.tsx`, `Trends.tsx` (wiring), `health.css`, tests.

1. **Next morning.** Scatter: x is calories against that day's target (a dotted rule at "target"), big days in orange, the fitted trend line. "The mornings after a big day": a faint line per big day, a band for the middle half, the average as the heavy line with points, every day's average dashed for comparison, and only the newest big day named ("Nov 14 · so far" while its mornings are still coming). Four plain facts as in the mockup.
2. **The week, by day.** The two charts side by side on a wide screen, stacked on a narrow one; the days-over count under each calorie column; the three facts in plain ink.
3. **Steps.** Weekly averages (line and points) over daily dots, the floor and goal as stepped reference lines (still stepped per the target in force each day), labelled at the right; the streak sentence unchanged. Follows the range.
4. **Macros** ("Protein, carbs and fat"). Weekly averages in grams on one scale: protein the heavy line with points, carbs and fat thin, daily protein as dots, the protein goal a stepped dashed line, each line named at its right end. Footer: "it met the 200 g goal on X of N days shown". Follows the range.

## For every step

- Tests first where practical; `npm test`, `npx tsc --noEmit -p .`, `npm run build` and `npm run health:add -- --dry-run < /dev/null` must all pass before the step is done. Update tests that encode the old behaviour; add tests for each numbered item.
- `__tests__/healthPage.test.tsx` renders every section from a fixture and from the real data (no NaN): keep it passing and extend it.
- Must work at 390px with no sideways scroll, in light and dark.
- Copy is dry: facts, no narration. No em dashes in new copy.
- Not in scope: Calendar, the lead card on This week, the weekly share cards.
