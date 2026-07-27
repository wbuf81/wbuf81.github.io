# `/health` — Weekly Health Tracker Page

**Date:** 2026-07-27
**Status:** Approved design

## Purpose

A personal dashboard at `/health` displaying daily health-tracker data exported from a Google Sheet. Updated weekly: Wes pastes the week's rows into Claude Code, they are appended to a JSON file, and the site redeploys.

Primary questions the page answers, in priority order:

1. **Is weight trending the direction I want?** — the headline.
2. **Am I showing up consistently?** — workouts, cardio sessions, steps.
3. Macros are displayed for reference but are not the focus. No target/goal numbers are tracked.

## Visibility

The page is **unlinked and noindexed, but publicly reachable**. This was an explicit decision after the tradeoff was raised: the repo `wbuf81.github.io` is public and the site is a static export, so the page HTML and the underlying JSON are readable by anyone with the URL or repo access. Accepted.

Mechanics:

- No navigation link anywhere in the site. The header in `app/page.tsx` is not modified.
- `export const metadata = { robots: { index: false, follow: false } }` in `app/health/page.tsx`, emitting `<meta name="robots" content="noindex,nofollow">`.
- `Disallow: /health` added to `public/robots.txt`.
- Not listed in `public/sitemap.xml`.

Non-goals: authentication, passcode gating, encryption, private data hosting. A static export cannot do real auth, and these were considered and declined.

## Data

### Source columns

From the Google Sheet: `Date`, `Day`, `Cals`, `Protein (g)`, `Carbs (g)`, `Fat (g)`, `Weight`, `Steps`, `Workout`, `Cardio` (checkbox), `Notes`.

### Interpretation rules

- Weight is in **pounds**.
- Sheet dates omit the year (`Jul 20`); the year is supplied at import time.
- **Blank `Workout` = rest day**, not missing data.
- `Cardio` is boolean. Notes such as `30 mins 12.5 / 3.0` mean **30 minutes, incline 12.5, 3.0 mph**.
- Cardio is currently **always 30 minutes**, but duration is stored explicitly in a `cardioMinutes` field (`30` when `cardio` is true, `null` when false) rather than hardcoded as `sessions × 30`. Both **sessions** and **minutes** are charted. Storing the number means a future change in session length is captured without a schema migration or re-parsing notes.
- `Notes` is stored **verbatim** as a string. Nothing is parsed *out* of it. `cardioMinutes` is set to `30` by default whenever the cardio box is checked; the notes text is only *cross-checked* for a stated duration, and a mismatch raises a warning for manual resolution rather than silently overriding the default.

### Storage: `data/health.json`

```json
{
  "lastUpdated": "2026-07-27",
  "units": { "weight": "lb" },
  "days": [
    {
      "date": "2026-07-20",
      "day": "Mon",
      "cals": 2271,
      "protein": 217,
      "carbs": 216,
      "fat": 65,
      "weight": 210.2,
      "steps": 12922,
      "workout": "Lee - Legs A",
      "cardio": false,
      "cardioMinutes": null,
      "notes": ""
    }
  ]
}
```

A **flat array of days**, sorted ascending by date. Weeks are *derived*, not stored — storing both would duplicate state and allow drift. The JSON holds only supplied facts.

All numeric metrics are typed `number | null`. A missed weigh-in is `null`, never `0`; a zero would corrupt both the chart axis and any average.

### History

Week 1 is 2026-07-20 to 2026-07-26. There is no backfill. The page accumulates weeks going forward and must therefore look correct with a single week of data *and* remain readable at 6+ months. No rolling-window truncation — all data is displayed.

## Architecture

Follows the existing `data/*.json` + `lib/*.ts` + page pattern already used by `/uses` and `/lee`.

| File | Responsibility |
|---|---|
| `data/health.json` | Stored day records. The only mutable state. |
| `types/health.ts` | `HealthDay`, `HealthData`, `WeekSummary`, `HealthSummary`. |
| `lib/health.ts` | Read JSON; derive weeks, averages, deltas, streaks. Pure functions, no React. |
| `app/health/page.tsx` | Server component. Reads data at build time, sets `noindex` metadata. |
| `app/health/components/HealthDashboard.tsx` | `'use client'`. Recharts rendering. |
| `scripts/add-health-week.mjs` | Parse pasted TSV → validate → append to `data/health.json`. |

`lib/health.ts` public interface:

- `getHealthData(): HealthData` — read and parse, returning an empty shape if the file is absent (mirrors `lib/uses.ts`).
- `getWeeks(): WeekSummary[]` — group days into Mon–Sun weeks with per-week aggregates.
- `getSummary(): HealthSummary` — latest weight, week-over-week delta, delta since start, rolling averages, workout and cardio session counts, cardio minute totals, and streaks.

The split matters: all derivation is in `lib/health.ts` as pure functions so it can be unit-tested without rendering, and `HealthDashboard.tsx` stays presentational.

### Charting

**Recharts**, added as a dependency. A React 19 / Next 16 compatible version must be verified at implementation time. Recharts is client-side, so the dashboard is a client component; this is compatible with `output: 'export'`.

## Page layout

Top to bottom:

1. **Stat tiles** — current weight, Δ vs last week, Δ since start, avg cals, avg protein, avg steps, workouts this week, cardio sessions and total cardio minutes this week.
2. **Weight trend** *(headline, largest)* — daily line plus a 7-day moving-average overlay. **The Y-axis is zoomed to the data range, not anchored at zero**; across a realistic range (210.2 → 207.9) a zero-based axis renders real progress as a flat line.
3. **Steps** — daily bars, with a reference line at the **all-time daily average** (not the current week's, so the line reads as a standard to clear rather than moving with the bars it measures).
4. **Consistency** — grouped bars per week for workouts completed and cardio sessions, with weekly cardio minutes on a secondary axis. Below it, a day-of-week dot grid (one row per week) that fills in as weeks accumulate.
5. **Macros** *(secondary)* — stacked bars of protein / carbs / fat in grams, with calories as an overlaid line.
6. **Raw table** — the week rendered as it appears in the sheet, for verifying what was entered.

### Sparse-data behavior

With one week of data a 7-day moving average is a single point, which reads as noise. **The moving-average line is hidden until there are ≥14 days.** Weekly-aggregate views must likewise render legibly with a single bar.

Visual style should match the site's existing editorial/serif treatment rather than Recharts defaults; the `dataviz` skill is to be consulted before chart code is written.

## Weekly update workflow

1. Wes selects the week's rows in Google Sheets, copies, and pastes them into Claude Code (tab-separated).
2. `scripts/add-health-week.mjs` parses the TSV, validates it, appends to `data/health.json`, and prints what was added.
3. Validation. **Hard errors** (refuse the import): wrong column count, unparseable number in a numeric column, a date that already exists in the file. **Warnings** (import proceeds, message printed): weight moving more than 5 lb day-over-day, calories outside 1,000–5,000, steps outside 0–50,000, a gap in dates since the last recorded day, or a cardio duration in the notes other than 30. Gaps and outliers are legitimate — travel, a missed weigh-in, an unusual day — so they must inform rather than block.
4. Commit and push. GitHub Actions redeploys.

A script rather than hand-editing JSON, because manual entry of ~70 values per week will eventually introduce a silent transcription error, and a script is deterministic and testable.

This drill is to be recorded in `CLAUDE.md`.

## Testing

`jest` is already configured. Unit tests cover `lib/health.ts` and the TSV parser — the logic where a bug would be invisible:

- Mon–Sun week grouping, including partial weeks
- Moving average, including the <14-day suppression rule
- Workout and cardio streak counting, with rest days not breaking a streak incorrectly
- `null` handling in averages and deltas
- Weekly cardio minute totals, and that `cardioMinutes` is `null` rather than `0` on non-cardio days
- TSV parsing: well-formed input, blank workout and notes fields
- Hard errors reject the import: wrong column count, unparseable number, duplicate date
- Warnings do not reject the import: date gaps, out-of-range weight/cals/steps, off-nominal cardio duration
- `cardioMinutes` derivation: `30` when the cardio box is checked, `null` when not

Charts are verified visually in the browser; they are not unit-tested.

## Out of scope

- Goal or target values for any metric
- Parsing `Notes` into structured incline/speed fields (duration is captured in `cardioMinutes`; incline and speed are not)
- Any authentication or privacy gating
- Backfilling data before 2026-07-20
- Editing data through a web UI (unlike `/uses`, which has an admin page)
