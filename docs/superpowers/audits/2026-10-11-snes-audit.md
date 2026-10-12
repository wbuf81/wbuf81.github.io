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
Re-measured in the same headless Chromium on a fresh static build.

| # | Before | After |
|---|---|---|
| A1 | `opacity: .55`, about 1.9:1 | Opacity removed. The card keeps the dashed `--screen-rule` border on `--screen-2`, with the title in `--screen-ink` (10.3:1 on the card) and body in `--screen-ink-2` (5.4:1), in both themes. It has a default cursor and no hover glow, so it reads as not a link; the base card glow is switched off for it too. |
| A2 | Chips 9.5px at 4.3:1 | 11px, text in `--screen-ink` on `--screen-rule` (10.3:1). "Day One" is 11px too. |
| A3 | 8 to 10.5px labels | All raised to 11px or more: tile publisher line, tap hint, "4 games"/"Launch day", month labels, heatmap numbers (8px to 11px) and year labels (9.5px to 11px at 375), scatter ticks and cards, spec labels, On This Day and Time Machine card labels. At 375 the 23px-wide heatmap cells fit two-digit numbers at 11px, so nothing is hidden. A scan at 375 of the game, company, Time Machine, hub and all five library views finds no text under 11px except the decorative 6px "SUPER NINTENDO" band on shelf spines (inside a link that carries its own label) and the cover-wall "no art" fallback title. |
| A4 | Breadcrumb 28x14, heatmap cells 24x15, dots 8x8, toggles 43x32, eyebrow link 30x14, spec links 43x18 | Below 760px or on a coarse pointer: breadcrumb, prev/next, eyebrow, spec, hero and "Open this week" links and filter/axis controls are 44px tall (and at least 44px wide for the short ones). Heatmap rows are 44px tall with the colour clipped to the middle, so the padding is the hit area and no neighbour is covered; cells stay 23px wide because 12 months cannot be 44px wide at 375 (24px is the WCAG 2.2 AA size). Scatter dots get an invisible 24px area (8px dot plus 8px each way), painted beneath all dots (on touch the hovered, focused and open dot is highlighted with a ring instead of scaled, because a scale or z-index would lift its pad over its neighbours). Measured at 375 on the Scatter view: 158 of 202 dots still win their own centre, against 161 with no enlargement and 74 with a naive enlargement. Tap-to-preview is unchanged (the preview code and its tests were not touched). Desktop looks are unchanged. Remaining under-44px items are site-wide (nav brand, footer links), out of scope. |
| A5 | 11px at 4.2:1 | 11px in `--ink-2`: 5.1:1 light, 5.9:1 dark on the `--snes-soft` panel. |
| A6 | Paper lead h3, shelf years h3 under the h1 | Both are h2 with the same visual sizes. Tests assert the h2 level and that no h3 remains. |
| A7 | Logo `<img>` without width/height | `width`/`height` come from each file's WebP header, read at build time (`lib/snes/webpSize.ts`; all 716 logos parse), with `height: auto` in CSS. |
| A8 | Placeholder 176px, filled strip 215px at 1280 | Placeholder min-heights measured against the filled strip: 320px at 600 and under, 258px at 601-760, 236px at 761-1100, 215px above. Measured: placeholder equals the filled strip at 375, 600, 601, 700, 768, 900, 1100 and 1280 for every year of today's picks except those with a long news lead, where the strip grows by 21 to 43px (a longer headline wraps to extra lines; a reserved height for the worst case would leave a hole on most days). |
| B1 | Short card beside three tall cards | The card stretches to the row height and shows the console price; the catalog line for a priced game this week; otherwise the closest priced game from the same year ("Also in 1992: ..."); otherwise "Cart prices from period catalogs appear on weeks with a priced game." Prices exist only for 1991-1993 games, so 1994 on shows the hint. |
| B2 | "in 4th grade" at launch | Milestone chips in June to August say "about to start Nth grade", like the story (`milestoneWho`). |
| B3 | "You were 0 when..." | Born 1991: "You were born the year the Super Nintendo launched." Born 1998: "You were born the year the last US SNES game shipped, in October 1998." Born 1999 or later: "You weren't born yet when the last US SNES game shipped in October 1998." |
| B4 | Sticker "1995" | "Sometime in 1995". |
| B5 | No payload test | `__tests__/snes-tm-pack.test.ts` gzips (zlib, level 9) the JSON of the packed weeks, games and prices: the exact props the page ships, built by the shared `buildTimeMachineProps` (weeks, games, milestones, prices) — 187,438 bytes raw, 66,168 bytes gzipped (64.6 KB). The bound is 70 KB (71,680 bytes), about 5.4 KB of headroom. The payload ships twice (HTML and RSC), so the 150 KB page budget still has room for markup. |
| B6 | "PNG, never SVG" | "PNG or JPEG, never SVG." |
