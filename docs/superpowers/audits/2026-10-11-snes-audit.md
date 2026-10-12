# SNES section — usability & readability audit (11 Oct 2026)

Branch `time-machine` at 405ad4d, static build served locally. Automated pass in headless Chromium plus manual screenshots.

**Coverage:** 16 screens × 3 viewports (375×812 touch, 768×1024, 1280×800) × light/dark = 96 page loads.

- **Screens:**
  - Homepage
  - /videogames hub
  - The library in all five views, plus with the Filters panel open
  - Three game pages: day-precision with a price (f-zero), month-precision (drakkhen), no art and no clip (soccer-kid)
  - A company page (nintendo)
  - The Time Machine at four weeks: launch, a quiet week (1992-07-31), a near-fallback week (1991-10-04), the last week
- **Spot checks:** reduced motion on the Time Machine, and 200% zoom (640 CSS px at 2×) on the Time Machine, a game page and the hub.

## Passed everywhere
- **Overflow:** no horizontal page scroll at any viewport or theme, nor at 200% zoom.
- **Reduced motion:** no rotated elements; the paper, tape label, sticker and objects all go flat.
- **Text:** no "undefined", "null" or "NaN" anywhere.
- **Names:** every link and button has an accessible name.
- **Headings:** exactly one h1 per page.
- **Errors:** no console errors or 4xx/5xx responses. One transient ERR_CONNECTION_RESET came from the local server on one load.
- **Paper contrast**, measured directly from the tokens: ink on paper 14.0:1 / 12.5:1; kicker 8.3:1; tape label 14.0:1; sticker 5.2:1; cassette 12.4:1; CD 12.9–14.1:1; ticket 9.5:1.

**Discarded false positives:**
- The checker read text on the paper and CD gradients as text on white; the measured values are above.
- It read the scatter dot labels against the dot behind them; the labels actually sit on the page.
- It read the EGM bar numbers as sitting inside the bars; they sit above them on the booklet paper.

## Findings

| # | Severity | Screen(s) | Finding | Evidence |
|---|---|---|---|---|
| A1 | should fix | hub | "Coming soon" card is dimmed with `opacity: .55`, giving about 1.9:1 for its text in light mode | opacity .55, text #8d9aa7 on #1b2530 over #f4f6f8 |
| A2 | should fix | every tile (timeline, game strips, company) | Tile chips "EGM"/"NP" are 9.5px at 4.3:1 | `.s-chips span` |
| A3 | should fix | tiles, heatmap, hub, Time Machine, company | Text under 11px: tile publisher line 10px (`.s-tp`), "Day One" 9.5px, heatmap cells 8px and year labels 9.5px at 375, On This Day labels 10.5px, Time Machine card labels 10.5px, company "4 games"/"Launch day" 10.5px | audit "small" list |
| A4 | should fix | game, company, library at 375 | Touch targets under 44px: breadcrumb links 28×14, heatmap cells 24×15, scatter dots 8×8, scatter axis toggles 43×32, company eyebrow "SNES" link 30×14, booklet spec company links 43×18 | audit "targets" list |
| A5 | should fix | Time Machine | "1965 – 2012" hint is 11px at 4.2:1 | `.s-tm-hint` |
| A6 | should fix | Time Machine, game pages, shelf | Heading order skips a level: the paper lead is an h3 right under the h1, and shelf year headings are h3 after the h1 | audit "headings" list |
| A7 | should fix | game pages | Logo images have no width/height, which causes layout shift | `/snes/logo/*.webp` |
| A8 | should fix | hub | On This Day placeholder is min-height 176px but the filled strip is 215px at 1280, so the page shifts when it fills | measured |
| B1 | nice to have | Time Machine | Price card is short next to the three tall art cards | screenshot tm-desk |
| B2 | nice to have | Time Machine | The Aug 1991 milestone says "in 4th grade" while the story says "about to start 5th grade" | years.ts |
| B3 | nice to have | Time Machine | Births in 1991 read "You were 0 when…launched"; births in 1999 or later read "You were 0 when the last…shipped" | story() |
| B4 | nice to have | game pages (year-only) | The Be Kind, Rewind sticker reads just "1995" | BeKindRewind |
| B5 | nice to have | Time Machine | No test guards the 150 KB payload budget (about 9 KB of headroom) | — |
| B6 | nice to have | docs | CLAUDE.md still says "PNG, never SVG" beside the JPEG cards | CLAUDE.md |

Not in scope and left alone: the homepage's existing 10–11px design-system labels (tags, captions, stats). These are site-wide conventions that predate this work. 11px uppercase mono eyebrows are the design system's label style and are accepted.

## After fixes
To be filled in by the fix pass: before and after for each row.
