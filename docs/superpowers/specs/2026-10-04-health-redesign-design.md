# /health in the design system — design

Approved by Wes on 4 Oct 2026 as mockup **E** on the claude.ai Design canvas
(`wesleybard.com/health · redesign`), after lettered rounds A–D, the weight-and-calories
studies E1–E4 and the pattern studies F1–F2. His words: "oh i like E a lot, lets build and deploy it."

## Goal

Rebuild `/health` on the site's design system (`app/design-system.css`), keeping every
number the page shows today, and add the three patterns the data turned out to hold:
calories against the next morning, the week by day, and the morning after cardio.

## What stays the same

- The data, the importer, `lib/health.ts` and every derivation it already does. The lead card,
  tiles, goals, streaks, change log and tables read the same functions they read today.
- Unlinked, `noindex`, `Disallow` in robots.txt, out of the sitemap; the same metadata and link
  preview (`/og-health.png`, still drawn by `scripts/og/build-og.py`).
- The rules in CLAUDE.md that are about numbers, not looks: weeks named for the Sunday they end
  on, the week as the headline unit, dated targets scored by the day they were in force, the
  block's "Now" as the newest week's average, the recent pace and projection.

## What changes

- **The site's header and footer** (`<Nav theme />`, `Footer`), `<main className="wb wb-page">`,
  so `/health` gets the light / match / dark switch and dark mode.
- Type and colour from the system. New tokens, each with a dark twin and an entry in `TOKENS`:
  `--over` (worse direction), `--mark` (raw readings that recede), `--series-1/2/3` (the
  validated categorical slots: light `#2a78d6 #eb6834 #1baf7a`, dark `#3987e5 #d95926 #199e70`).
- **Charts are drawn as SVG by the page itself**, not Recharts: the mockup's look (thin bars,
  HTML labels, colours by token so dark mode works) can't be had from Recharts' presentation
  attributes. Recharts leaves the project.

## The page, top to bottom

1. **Title**: eyebrow "Health · updated weekly", "Health", the one-line lede.
2. **Lead card**: the newest week's average weight against the week before, the week's other
   averages beside it; below a rule, the block so far with a **progress track** from the start
   weight to the goal (a notch per week's average, a "now" pin at the newest week's average),
   then Started at · Now · Change · Per week · Recent pace · On pace for, then the phase note.
   No goal → no track.
3. **The 8 stat tiles**, unchanged in content.
4. **Weight and calories** (full width): one chart, two scales — **the one dual-axis chart on the
   page, allowed by Wes on 3 Oct 2026** ("we can adjust the rules to better the visualization").
   Calorie bars on the right scale, blue at or under the target in force that day, orange over;
   the target as a stepped dashed line; weigh-ins (hollow dots on a thin line) and the 7-day
   average on the left scale, which stretches to include the running block's goal (dashed).
   Hover or touch shows the day: date, weight, the change by the next morning, calories, against
   target. The note says to compare shapes, not crossings.
5. **What a day's calories do to the next morning**: a scatter of each day's calories against
   the change in weight by the next morning (consecutive calendar days, both weighed), a
   least-squares trend line and the current target. Beside it, **the mornings after a 2,900+ day**:
   one line per such day, from that morning's weigh-in to three mornings on, with every day
   averaged as a dashed comparison. Four facts: after a day over target, after a day at or under,
   after a day over 2,900, and three days after one (average, and how many were below).
6. **The week, by day**: Monday to Sunday, averaged over the recorded weeks. Top: average
   calories against target (diverging bars); a row of "over on N of M"; bottom: that morning's
   weigh-in against the 7-day average centred on it (only where all seven days were weighed), so
   the block's downward drift does not tilt the weekdays. Hover shows calories, against target,
   days over, protein and days at the protein goal. Three facts: Friday–Sunday and Monday–Thursday
   against target per complete week (and how many weeks went over / stayed under), and how much
   heavier Sunday and Monday mornings read than Friday and Saturday. Shown once two complete weeks
   exist.
7. **Steps | Macros** side by side (stacked on a phone). Steps: bars, the floor and goal as stepped
   dashed lines, the streak sentence. Macros: grams stacked protein / carbs / fat, a dashed line at
   the protein goal, and how many days reached it.
8. **Consistency**: the three goals as meters for the newest week, the streak, the week-by-day
   grid (lift and cardio dots, rest dash, note marks and marker icons, as today), the legend, and
   **the morning after cardio**: Monday–Friday days with and without cardio, the average change by
   the next morning and the average calories eaten on them.
9. **The log**: the four newest weeks as cards — week ending, average weight and change, chips for
   calories against target, protein, steps, lifts · cardio · minutes, the three goals ticked or
   not, a cell per day (weight, lift and cardio dots, marks), and each marker in that week taped
   on as a note.
10. **Records**: one card, a segmented control — By week (with a Notes column listing the week's
    markers) · Changes · Every day · Phases (only when there is more than one phase).
11. "Last updated", then the footer.

## Numbers the new sections compute

All in `lib/healthInsights.ts`: pure, client-safe (no `fs`), extension-explicit relative imports,
unit-tested in `__tests__/healthInsights.test.ts`.

- `nextMorningPairs(days, calorieTargets)` — one pair per day whose next calendar day is recorded,
  both weighed, calories known: `{ date, cals, change, over }`, `over` against the target in force
  that day (false with no target).
- `nextMorningFacts(pairs, bigDay = 2900)` — means and counts after over / at-or-under / big days,
  and the least-squares fit (null under 3 pairs or no spread).
- `afterBigDays(days, bigDay = 2900, horizon = 3)` — a trace per big day (stops at the first
  unweighed or unrecorded morning), every day's average change at each offset, and the
  three-morning summary over traces that reach the horizon.
- `weekdayProfile(days, calorieTargets, proteinGoal)` — per weekday: days, average calories,
  average against target, days over, average protein, days at the protein goal, weigh-in against
  the centred 7-day average; per complete week the Friday–Sunday and Monday–Thursday totals against
  target; the Sunday/Monday vs Friday/Saturday gap.
- `cardioMornings(days)` — Monday–Friday days with and without cardio whose next calendar day was
  weighed: average change, count, average calories.

## Rules retired or changed (CLAUDE.md)

- "No dual-axis charts" → one exception, the weight-and-calories chart, by Wes's permission.
- "The four daily charts share their geometry" → retired: Steps and Macros sit side by side, the
  weight-and-calories chart is the full-width daily chart, and there is no separate Calories or
  Weight chart.
- The weekly consistency bar chart and the notes list under the grid are gone: weekly totals live in
  the log and the By-week table, and marker notes are taped onto their week in the log and listed in
  the By-week table's Notes column.
- `chartTheme.ts` (Recharts props) is replaced by token classes in `app/health/health.css` and the
  formatters move to `app/health/components/format.ts`.

## Constraints

- Works at 390 px with no sideways scroll: two-up layouts stack, x labels thin out, the weekday
  row shortens to "N of M".
- Colours by token only; every health block scoped under `.wb` (tested like the system's sheet).
- Copy is dry: facts, no narration.
- Text never wears a series colour; identity is never colour alone (legends, labels, the tables).
