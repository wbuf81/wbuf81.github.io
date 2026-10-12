# SNES Top 8: browse and add from anywhere

This follows on from `2026-10-12-snes-top-8-design.md`. Wes found himself opening the library in a second window to find his favourites, so the two need to work together. He chose both halves (12 Oct 2026):

1. Add to the Top 8 from anywhere in the library and from game pages, with a floating tray.
2. A "Browse all games" panel inside the Top 8 page.

## One shared Top 8

There is one Top 8 per visitor, saved in the browser under the existing key `snes-top8` (the same `Top8State` shape). The library, game pages, company pages and the Top 8 page all read and write it through one small client store:

- `app/snes/top8/store.ts`:
  - `read()` and `write(state)`, both wrapped in try/catch
  - `subscribe(cb)`, which listens for the `storage` event (other tabs) and a same-tab `snes-top8:change` CustomEvent
  - a `useTop8()` hook built on `useSyncExternalStore`, whose server snapshot is `null`. Nothing Top 8-related renders on the server, so hydration matches.
- **Pure helpers in `lib/snes/top8.ts`:**
  - `isPicked(state, slug)`
  - `addPick(state, slug)`, which returns `{ state, full: boolean }`. It fills the first empty slot; `full` means no slot was free and nothing changed.
  - `removePick(state, slug)`
  - `replacePick(state, index, slug)`
- **The shared-link rule from the Top 8 spec still holds:** opening a friend's `?g=` link never overwrites your stored list until you edit on that page. An edit anywhere else (a ★ or the tray) writes the stored list.

## 1. Add from the library and game pages

- **★ button:** on every game tile in the Timeline, the Cover wall, the Shelf (in the hover tip on desktop; on phones a ★ sits on the spine's top band), the scatter hover/tap card, and the "also out"/series/similar strips on game pages. On game pages there's also a larger "★ Add to my Top 8" button beside the title.
  - The ★ is a **sibling** of the tile's link, positioned over its corner, never nested inside the `<a>`.
  - Desktop shows it on tile hover or focus; touch screens always show it. Its hit area is at least 44px on phones, though the visual can be smaller.
  - **Hollow ☆ = not picked; filled ★ = picked.** `aria-pressed`, and the label is "Add ‹title› to your Top 8" or "Remove ‹title› from your Top 8".
  - **Tap when not picked:** adds the game and shows a toast "Added to your Top 8 · n/8". **Tap when picked:** removes it, with toast "Removed".
  - **If all 8 are full:** a small popover anchored to the button reads "Your Top 8 is full. Replace which?" and shows your 8 mini covers. Tap one to replace it; Esc or a tap outside cancels. Focus moves into the popover and comes back when it closes.
- **Top 8 tray:** on the library, game and company pages (not on the Top 8 page itself), and only once at least one game is picked.
  - **Placement:** fixed to the bottom with the safe-area inset.
  - **Contents:** 8 mini cover slots (picked thumbs, empty outlines), "n/8" and "Open Top 8 →" (a link to `TOP8`).
  - **Collapsing:** a chevron collapses it to a pill reading "★ n/8"; the collapsed state is remembered under `snes-top8-tray`.
  - **Layout:** it reserves its own height at the bottom of the page (padding on `main`), so nothing is ever hidden behind it. It never covers the library filter bar. Under reduced motion it doesn't animate.
  - Tapping a mini cover opens that game's page.
- **Library filter "★ In my Top 8":** a toggle in the Filters panel. It's client-only state, written to the URL as `mine=1`. When it's on, only picked games match, using the same dimming and hiding rules as other filters. The panel's "Filters (n)" count includes it.

## 2. Browse inside the Top 8 page

A "Browse all games" box below the friend requests, styled as another MySpace box:

- **Controls:**
  - **Year tabs:** All, '91 … '98, as an `aria-pressed` group.
  - **Genre chips:** the 6 families from `genreFamily` plus All.
  - **Sort:** Top rated (score desc, then title), A–Z, and Release date.
- **The grid:** a responsive cover grid of 96×67 `thumb` images with the title under each. Picked games show a ★ badge and a highlighted frame. Tapping a cover toggles it: add (or the replace flow when full), or remove if already picked.
- **Rendering:** only the first 60 matches render at first; more render as you scroll, through an IntersectionObserver sentinel with a "Show more" button fallback. Images load lazily.
- **Search:** typing in the existing search box also filters this grid, live, case- and punctuation-insensitive. The dropdown still works for quick adds.
- **Counts:** "Showing n of 717".

## Payload and performance

- **Library and game pages:** they already ship every game's slug, title and thumb. The store, tray and ★ add only code, no data.
- **Top 8 page:** the browse grid needs `thumb` (derived from the slug, so it isn't sent) and the genre family (computed client-side from `genres`, which is already in the index). The 120 KB page budget still holds and is re-measured.
- **Game pages and company pages:** they have no game index, so they pass the tray a slug→title map (717 titles, roughly 10 KB gzipped) for labels and alt text. The mini covers use `/snes/thumb/<slug>.jpg`, built from the slug. The added size is measured and kept small.

## Tests

- **`lib/snes/top8.ts` helpers:** add, remove and replace; full; already picked; unknown slug.
- **store:** read and write with storage blocked; a same-tab event updates subscribers; a storage event from another tab updates subscribers; the server snapshot is null.
- **★ button:** toggles and labels, the full-list popover (replace, Esc, outside click, focus return), and no `<button>` inside an `<a>` (assert DOM nesting). It works in the timeline, cover wall, shelf, scatter card and game page.
- **Tray:** hidden at 0 picks; shows n/8; collapses and is remembered; hidden on the Top 8 page; `main` gets bottom padding.
- **Filter:** `mine=1` round-trips through `parseQuery`/`toQuery` in `lib/snes/library.ts`, and filters to picked games.
- **Browse panel:** year, genre and sort; search filters the grid; tapping toggles; picked badges show; 60-then-more rendering; it uses the shared store.
- **Cross-page:** a ★ in the library → the Top 8 page shows it (same tab), and an edit on the Top 8 page updates a library ★ (storage event).

## Full regression UI test (last task)

Re-run the 12 Oct regression sweep and the interaction script (all 25 checks), plus:

- ★ on each surface on desktop and on phone
- the full-list replace popover
- tray collapse, its padding, and that it never covers the filter bar or the Time Machine deck
- the `mine=1` filter
- the browse panel's filters, sort, scroll-loading and toggling
- library ★ → open the Top 8 → the game is there
- contrast and target sizes for the new controls in light and dark mode

Fix every finding, then re-check.

## Not in this piece

Syncing the Top 8 between devices (needs accounts), and Wes's own played/ratings layer (piece 3).
