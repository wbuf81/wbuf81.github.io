# /health in sections, with a month calendar

Wes, 4 Nov 2026: "there's a lot on this page now… break it up by tabs or buttons at the top", and a month view
where "each day shows traffic lights or high level numbers". Mockup approved the same day; decisions below are his.

## Sections
One page each, under a sticky menu built like the SNES one (`HealthNav`, styled `.h-nav` after `.s-nav`):

| Page | Holds |
|---|---|
| `/health` — This week (default) | Lead card, the 8 tiles, the log's four newest weeks |
| `/health/calendar` | The month calendar (new) |
| `/health/trends` | Weight and calories, the next morning, the week by day, steps · macros |
| `/health/habits` | Consistency (goals panel + grid), kept for now beside the calendar |
| `/health/records` | Records |

Separate pages rather than in-page tabs: each is linkable and loads only its own charts. Every page is noindex
with its own `og:url` and the health card (`app/health/view.ts › healthMetadata`). Phone: icons drop, short labels.

## Calendar
Monday-first month, a Week column on the right (average weigh-in, change on the week before, lifts · cardio,
named for its Sunday; hidden on phones). Lights or Numbers. Month strip: days logged, days all three hit, averages,
training. Click a day for its numbers. Opens on the month the newest week began in.

Lights (`lib/healthCalendar.ts`, each day against the targets and block in force that day):
- Calories — cut: at/under target hit, ≤10% over close. Bulk or maintain: within 5% hit, within 10% close.
- Protein — goal hit, within 10% close. Steps — goal hit, floor close. No reading or no target: not scored.
- Hit is a filled dot (`--core`), close half-filled (`--warn`, new token), missed a ring (`--over`): shape, not colour alone.
