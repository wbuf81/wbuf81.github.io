# Full regression UI test — 12 Oct 2026 (branch top-8 at 7434dac)

Headless Chromium against the static build.

**Coverage:**
- **Screens:** 20 screens × 3 viewports (375×812 touch, 768×1024, 1280×800) × light/dark. That is 120 page loads plus scripted interaction runs and picture renders.
- **The 20 screens:** the homepage, the hub, the library (5 views plus the Filters panel), 3 game pages, a company page, the Time Machine (4 weeks), and the Top 8 page in 4 states (empty, 3 picks, 8 picks, replace mode).

## Audit sweep: passes
- **Overflow:** no horizontal overflow at any viewport, theme or 200% zoom.
- **Reduced motion:** no tilts.
- **Headings:** one h1 per page and no skipped heading levels.
- **Text:** no "undefined", "NaN" or "null".
- **Names:** every control has an accessible name.
- **Top 8 page:** clean in all four states. The only flag is its 11px uppercase eyebrow, which is accepted design-system style.
- **Contrast flags:** the same known false positives as on 11 Oct. They come from text on gradient paper or a CD background, scatter labels measured against their dot, and EGM bar numbers that sit above the bars, not on them.
- **Console:** only transient `ERR_CONNECTION_RESET` from the local Python server under load. These are not app errors, and there are no 404s.

## Scripted interaction regressions: 25 of 25 pass
1. Phone tap plays the clip with sound; a second tap opens the game.
2. Desktop hover plays the clip.
3. Scatter: the hover card works, and a phone tap opens the card without leaving the page.
4. Time Machine: the `?w=` deep link, ▶▶ then ← → after a click, the slider, and the URL update.
5. On This Day renders. The Games nav item has `aria-current`. The featured homepage tile links internally.
6. Top 8:
   - search plus Enter adds a game
   - mouse drag reorders
   - keyboard reorder works (Space, →, Space; the first run failed only because the test's selector was wrong)
   - Accept fills the next empty slot, and Deny works
   - **Save downloads `my-snes-top-8.png`, a valid PNG of 1080×1080**
   - Copy link works, and opening the copied link rebuilds the same slots
   - when all 8 are full, Accept enters replace mode and Esc cancels it
   - the page works with storage blocked
   - **touch press-and-hold drag works**, and a quick swipe over the grid still scrolls the page (scrollY 0 → 1742)

## Pictures by eye (6 themes × {8 picks, 3 picks}, a 24-character name, the 56-character title)

All themes render with their real fonts. Long titles truncate with "…", and empty slots look intentional.

## Findings

| # | Severity | Finding |
|---|---|---|
| R1 | should fix | **Long display names are truncated in the title tile of every theme** ("Wesley Bard …", "WESLEY B…"). The name line should shrink to fit, down to a readable minimum per theme, before any ellipsis, so a 24-character name always shows in full. Also, MySpace's "‹Name› has N SNES friends." line truncates; let it wrap to 2 lines. |
| R2 | should fix | The hub's Top 8 card is square while the others are 300/209, so its row is uneven. Regenerate `public/snes/top8-example.jpg` at the 300/209 shape: the title tile plus the top row of the 3×3 example, or a letterboxed version. Drop the special `aspect-ratio: 1` so all hub cards match. |
| R3 | nice to have | Share between an edit and the next completed draw can share the previous picture. Clear the cached share file on every state change. |
| R4 | nice to have | CLAUDE.md OG section: "# both" is now 5 cards; fix the double "and"; add og-top8.jpg to the Share cards bullet. |
| R5 | nice to have | Test hygiene from task reviews: remove the dead `orig` lines in the render test; make the font-coverage check honour italic. |

## After fixes
(to be filled by the fix pass)
