# /health redesign — implementation plan

> Executed inline (Wes: "lets build and deploy it"), on branch `health-redesign`, then merged to `main`
> and pushed, which deploys.

**Goal:** rebuild `/health` as mockup E on the design system.
**Architecture:** server page computes everything (existing `lib/health.ts` + new `lib/healthInsights.ts`)
and hands plain data to small components; the two hover charts are client components; all charts are
hand-drawn SVG with HTML labels, coloured by token classes.
**Spec:** `docs/superpowers/specs/2026-10-04-health-redesign-design.md`

## Global constraints
- Colours by token only; new tokens get dark twins in both dark blocks and a `TOKENS` entry.
- Every selector in `app/health/health.css` starts with `.wb`; no hex colours in it.
- `lib/healthInsights.ts` is client-safe: no `fs`, `import type` for `@/` types, `.ts` on relative imports.
- 390 px, no sideways scroll. Dry copy.

## Review focus
1. A gap in the days (a missing date) must not pair a day with a morning two days later.
2. No calorie target, no protein goal, no goal weight, no big days: every section degrades without
   crashing or printing NaN.
3. A partial newest week must not count in the weekday split, and the lead card still says "This week so far".
4. Hover maps the pointer to the right column at any width; leaving clears it.
5. Dark mode: every chart mark reads (token classes, not hex).

## Tasks
1. **Tokens.** `app/design-system.css` + `app/design/tokens.ts` (group "Charts"): `--over`, `--mark`,
   `--series-1..3`. Test: existing `__tests__/design-system.test.ts` (twins, TOKENS parity).
2. **Insights (TDD).** `lib/healthInsights.ts`, `__tests__/healthInsights.test.ts`: the five functions in
   the spec; cases — gaps skip pairs, over by the day's own target, empty inputs give nulls, fit slope sign,
   traces stop at a gap, typical offsets, d3 summary counts only full traces, weekday trend needs all 7,
   split uses complete weeks only, cardio uses Mon–Fri only.
3. **SVG helpers.** `app/health/components/svg.ts`: `pct`, `barPath`, `niceStep`, `range ticks`. Tested
   through the charts.
4. **Components.** `LeadCard` (port `WeekLead`, add the track), `StatTiles` (restyle), `WeightCalories`
   (client, hover), `NextMorning`, `WeekByDay` (client, hover), `StepsCard`, `MacrosCard`, `Consistency`
   (goals, grid, legend, cardio facts), `WeekLog`, `Records` (client, tabs), `format.ts`.
   Tests: `__tests__/healthPage.test.tsx` renders the dashboard from `data/health.json` (headings, facts,
   hover tooltips, tab switching), `__tests__/weekLead.test.tsx` updated for the new card.
5. **Page.** `app/health/page.tsx`: Nav/Footer, `.wb .wb-page`, compute and pass data. Delete the
   Recharts components and `chartTheme.ts`; drop `recharts`.
6. **Styles.** Rewrite `app/health/health.css` scoped under `.wb`; `__tests__/health-css.test.ts` checks
   scope and no hex.
7. **Docs.** CLAUDE.md /health section; design-system comment.
8. **Verify.** `npm test` (builds first), screenshots at 1440 and 390, light and dark; fresh-context review;
   merge to `main`, push, check the live page.
