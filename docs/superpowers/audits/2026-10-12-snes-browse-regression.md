# SNES Top 8 browse: regression test (12 Oct 2026)

**Setup:** Playwright (Chromium) against the `next build` static output on localhost:4321, branch `top-8-browse`. It was run at fd2c7a4, then re-run after the fix commit 2f86a29.

## Scripts

| Script | Checks | Run 1 (fd2c7a4) | Run 2 (2f86a29) |
|---|---|---|---|
| `interact.js` (earlier regressions: clips, scatter, Time Machine, hub, Top 8 builder) | 25 | 25/25 | 25/25 |
| `interact-browse.js` (★, tray, `mine=1`, cross-tab, browse panel, popover, no-art) | 25 → 29 | 23/25 | 29/29 |
| `audit2.js` (20 screens × 375/768/1280 × light/dark: contrast, text size, targets, overflow, 200% zoom, reduced motion, headings, errors) | — | no new findings | — |

## Findings and fixes

| # | Severity | Finding | Fix |
|---|---|---|---|
| F1 | Important | With a full Top 8, clicking or tapping ★ opened the "Replace which?" popover and closed it the same instant. Moving focus into the popover scrolled the document, and the close-on-scroll listener caught that scroll. Opening it from the keyboard worked. | Focus with `preventScroll`. Scroll and resize now close it only if the ★ has actually moved more than 4px. Positioned `fixed` from the first paint. jsdom tests cover both cases. |
| F2 | Important | The 3 games with no box art (Soccer Kid, Nobunaga's Ambition: Lord of Darkness, Uncharted Waters: New Horizons) showed a broken image in the browse grid. | New `Cover` component with an initials placeholder, used in the browse grid, tray, popover and Top 8 slots and results. |
| F3 | Minor (Task 4 review) | The tray and ★ counted unknown slugs; there was a one-frame flash on filter change; year tabs were read as "apostrophe 92"; the count wasn't announced; sticky hover on touch | Unknown slugs ignored; reset happens during render; `aria-label="1992"`; `aria-live="polite"` count; `@media (hover: hover)` |

## Checked and fine

- **★ on each surface:**
  - On desktop, the timeline, wall, shelf (on hover), scatter card and game page all have it.
  - On phones it shows on the timeline. It's hidden on the wall and shelf, as designed.
  - Tapping it adds without navigating; the toast reads "Added to your Top 8 · n/8".
- **Tray:** appears after the first pick and shows n/8. Collapse is remembered after a reload. The footer padding equals the tray height, so content is never covered. It's absent on the Top 8 and Time Machine pages.
- **`mine=1` filter:** shows only the picks and keeps unknown URL params.
- **Sync:** a ★ in one tab updates an open Top 8 builder in another tab, live.
- **Browse panel:** "Showing n of 717", and the year, genre and sort controls all filter. Tapping a cover adds it, and picked covers get the ★ badge and frame. No overflow on a 390px phone.
- **★ touch target:** the audit's "28×28" flag is a false positive. A `::before` with an -8px inset gives a 44px hit area.
- **Older pre-existing findings:** unchanged and still accepted from the 11 and 12 Oct audits: newspaper-texture "over image" contrast, 11–11.5px eyebrows and chips, scatter dot sizes.
