# /health: five new cards, a Patterns page and seven tidy-ups

26 Nov 2026. Wes asked what new insights and visuals his health data could show, saw five ideas as a working mockup
(`docs/design/health-ideas-2026-11-26/mockup.html`, his real numbers) with seven recommended changes to the existing
pages, and said: "build all 5 ideas and make all 7 changes".

Everything in the "/health" section of `CLAUDE.md` still holds: tokens only, every selector under `.wb`, hand-drawn
SVG with HTML labels, every chart in a wide and a compact frame, no dual axes, weight scales zoomed, weeks named for
the Sunday they end on, the week as the unit, pattern figures in plain ink, dry copy with no em dashes, and nothing
that assumes a cut. Each new card must cope with a bare dataset by not rendering.

## The pages after this change

Six sections, in menu order (`app/health/sections.ts`):

| Section | Address | What is on it |
|---|---|---|
| This week | `/health` | lead card, **The road to the goal** (new), tiles, the log |
| Calendar | `/health/calendar` | the month |
| Trends | `/health/trends` | range switch; Weight, Pounds per week, Steps, Protein carbs and fat |
| **Patterns** (new, 🧩) | `/health/patterns` | the next morning, **How far one morning moves** (new), The week by day, **A week's calories and what the scale did** (new), **The same weight, twice** (new) |
| Habits | `/health/habits` | Consistency, **Daily goals** (new), **So far** (new) |
| Records | `/health/records` | the tables |

Trends keeps the cards the range switch redraws. Patterns holds the cards that always read everything, in order from
a single morning up to a whole block. Patterns is `noindex` with the health card, like every health page. The menu
must still fit one row at 375px; if six short labels cannot at a readable size, the row may slide sideways with the
current page in view.

## The five cards

The arithmetic for all five was worked out for the mockup; the mockup's figures are the reference for 22 Nov 2026
data. New pure, client-safe helpers go in `lib/healthPatterns.ts` (tested in `__tests__/healthPatterns.test.ts`); they
take days, weekly rows and block summaries as arguments and never import `lib/health.ts`.

### 1. The same weight, twice (Patterns)
The block the newest data falls in against the block before it. For each complete week of the newer block, the week
of the older block with the nearest average weight, if within 0.5 lb; an older week is used once. Each pair is a rung.
- Chart: weekly average weight across both blocks, block bands and names as on the weight chart, a dashed neutral rung
  between each pair, the paired points emphasised.
- A table of the rungs, highest weight first: the weight, the older week (kcal a day, steps a day, its week ending),
  the newer week (the same), the difference in kcal.
- Fact cells: calories at the newest rung then and now, the difference with protein, carbs and fat in grams, and
  "Still ahead" (the older block's weeks beyond the newest rung in the direction of travel, up to two).
- Wording follows direction: "On the way down" and "On the way up" for a cut then a bulk, swapped for a bulk then a cut.
- Shown only when there are two blocks and at least one rung.
- 22 Nov: four rungs; 204.7 lb was 2,410 kcal in the week ending Aug 9 and is 3,036 now, +626 (protein +29 g,
  carbs +88 g, fat +21 g); still ahead 206.9 and 208.5.

### 2. A week's calories and what the scale did (Patterns)
One dot per complete week from the second on: across, the week's average calories a day; up or down, the change in
average weight from the week before.
- Hollow rings for weeks in an earlier block, filled for the newest block, a faint line joining the weeks in order,
  the newest labelled. A dashed neutral least-squares line through all of them. A marker where the line crosses zero
  ("holds at 2,690") and one where it reaches the newest block's planned pace ("+0.5 at 2,820"). A grey dotted
  vertical at the calorie target in force.
- Fact cells: where the scale holds, what the planned pace takes, last week against the line, and the slope in
  plain words ("for every 100 kcal more a day, about +0.4 lb a week").
- Note: the first weeks of a block also move on water, which steepens the line.
- Shown from eight weeks.
- 22 Nov: 17 dots, +0.395 lb a week per 100 kcal, zero at 2,689, +0.5 at 2,816.
- **This number and the "Est. maintenance" tile disagree by design** (2,690 from every week against 2,551 from the
  last three). The tile's caption already says "implied by the last 3 weeks"; the card says "where the line crosses
  zero". Do not reconcile them.

### 3. How far one morning moves (Patterns)
Every pair of consecutive calendar days as one dot, stacked in columns by how far the scale moved overnight (nearest
0.2 lb, halves rounded away from zero), a rule at zero, the span holding nine mornings in ten shaded and labelled,
the newest morning in `--accent` and labelled.
- Fact cells: the middle absolute change, the nine-in-ten span, the newest morning with its rank when it is one of
  the five biggest rises or drops, and what is left two mornings after a jump of 1.5 lb or more (the morning two days
  after the jump against the morning before it, averaged over earlier jumps; shown from five jumps).
- 22 Nov: 125 mornings, middle 0.7 lb, nine in ten within 1.7, Nov 22 +3.0 the third biggest rise, 0.8 lb left of
  jumps averaging 2.1 (11 jumps).

### 4. The road to the goal (This week, under the lead card)
Titled with the goal ("The road to 220"). From the newest week's average, at the newest recorded day, straight lines
to the goal weight at each pace the block has: the plan (`ratePerWeek`), the whole block (`weightChangePerWeek`) and
the last three weeks (`recentChangePerWeek`). Arrival is the newest day plus pounds to go over the rate, in days,
the same sum the lead card's "On pace for" uses, so the recent-pace date must equal it. A pace that points away from
the goal draws no line.
- Chart: the block so far on the left (weigh-ins as faint dots, weekly averages as the line), the lines running
  forward with the space between slowest and fastest tinted, the goal as a long-dashed `--accent` rule, neutral
  rules every 5 lb on the way and at the previous block's first weekly average when it lies on the way ("208.5, where
  the cut began"), each arrival dated on the goal line.
- Fact cells: one per pace with its date, and the date range for passing the previous block's starting week.
- **This card is where the page's per-week figures are told apart** (change 4). Under the chart, one sentence each:
  the block's pace counts from the block's first weigh-in; week on week (the average of the weekly changes, the
  figure on Trends) counts from the last weekly average before the block. The lead card's "Per week" caption becomes
  "whole block, from the first weigh-in", and the Trends cell says its first week is measured from the week before
  the block.
- Shown when the block has a goal and at least one pace reaches it.
- 22 Nov: Apr 4, 2027 at the recent +0.8; Jun 2 at the block's +0.6; Jun 24 at the plan's +0.5; back at 208.5
  between Dec 25 and Jan 13; week on week +1.0 from 200.7.

### 5. So far (Habits)
Running totals since the first recorded day, each with the next round number and when it falls.
- Steps: the total in digit cells, a track from the last million to the next, steps to go and the day it falls at the
  current block's average. Caption: miles at 2,100 steps a mile, and it says so (the figure is an assumption, not
  measured).
- Lifts: the count, a track to the next multiple of 25, and the date it falls, counting forward on the weekdays the
  newest complete weeks lifted on.
- Cardio: sessions and minutes, a track to the next 10 hours, at the last three weeks' minutes a week.
- Weigh-ins: days weighed of days recorded. Calories logged. Protein eaten, in pounds with grams beneath.
- 22 Nov: 1,928,036 steps, 2,000,000 about Fri Nov 27; 90 lifts, the 100th on Sat Dec 5; 67 sessions, 2,200 min,
  40 hours about two weeks off; 126 of 126; 329,747 kcal; 56.7 lb of protein.

## The seven changes

1. **Label overlap, "The week, by day".** A weekday's value label prints on the weekday's name when its bar reaches
   the foot of the plot (Friday's −0.5 today). The scale must always leave room under the lowest bar's label, in both
   charts and both frames.
2. **Trends splits into Trends and Patterns**, as in the table above.
3. **Tile labels carry their scope.** The lead card says "Avg calories 3,036" for the week and the tiles said "Avg
   calories 2,901" for the block. The block tiles read "Avg calories, this bulk" (and protein, steps) with "per day
   since Oct 26" beneath; with no block, "all time".
4. **The per-week figures**, as under card 4.
5. **Habits is rebuilt.** The consistency grid shows the twelve newest weeks, newest first, with a button to show
   the rest. A **Daily goals** card holds what moved off Trends: the steps floor and goal runs (the Steps card's
   sentence) and the protein goal's days met, for the block and in all, each day against the goal in force that day
   (the Macros card's sentence; its caption keeps the first half). **So far** closes the page.
6. **Calendar cells.** The words "kcal", "protein" and "steps" leave the lights; the three lights sit in a row in
   that fixed order and the day's weigh-in takes the room. The key says the order once. The cell's spoken label is
   unchanged, so nothing is lost to a screen reader. Numbers mode is unchanged.
7. **Small.** "Last updated Nov 26, 2026" in the page's date style, not an ISO date. The Records card's heading is
   the table on show ("By week"), not "Records" under a page already titled Records.

## Approaches considered

- **Where the new cards go.** All on Trends (nine cards, three of which ignore the range switch beside it); or a
  Patterns page for the cards that read everything. The second, because the switch then means the same thing for
  every card under it.
- **How the cards are drawn.** The page's own hand-drawn SVG with both frames, against a chart library. The first:
  the page left its library in October and every rule in `CLAUDE.md` assumes it.
- **Moving the habit sentences** or showing them twice. Moved: a figure in two places is two places to disagree.

## Left to the builder
Component names, class names (`h-…` for blocks, `g-…` for chart marks), frame sizes, how labels are fitted, and the
tests' shape, following the neighbours in `app/health/components/` and `__tests__/`.
