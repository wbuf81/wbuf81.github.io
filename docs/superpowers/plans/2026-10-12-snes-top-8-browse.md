# SNES Top 8 Browse Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One shared Top 8 that visitors add to from anywhere: ★ buttons on every library surface and game page, a floating tray, a "★ In my Top 8" filter, and a "Browse all games" panel on the Top 8 page.

**Architecture:**
- **Shared store:** `app/snes/top8/store.ts`, built on `useSyncExternalStore` over localStorage `snes-top8`, with same-tab CustomEvents and cross-tab `storage` events. Its server snapshot is `null`, so nothing Top 8-related renders on the server.
- **Pure helpers** in `lib/snes/top8.ts`.
- **Components:** reusable `Top8Star` (with a replace popover) and `Top8Tray`, mounted by the library and by the game and company pages.
- **Top 8 page:** its storage logic is refactored onto the store (keeping the shared-link rule) and it gains a `Top8Browse` panel.

**Tech stack:** Next.js 16 static export, React 19, TypeScript, Jest + Testing Library, the existing dnd-kit and next/font setup.

**Spec:** `docs/superpowers/specs/2026-10-12-snes-top-8-browse-design.md`, plus the base spec `docs/superpowers/specs/2026-10-12-snes-top-8-design.md`.

## Global Constraints

- **Storage:** key `snes-top8` (unchanged shape `Top8State`) and tray key `snes-top8-tray` (`'collapsed'` or absent). Every access is wrapped in try/catch.
- **Shared-link rule (unchanged):** opening a `?g=` link on the Top 8 page never writes storage until the visitor edits on that page. Edits from ★ or the tray write immediately.
- **Hydration:** no Top 8 UI is rendered on the server (the store's server snapshot is `null`). Nothing reads storage during render.
- **Markup:** never put a `<button>` inside an `<a>`. The ★ is a sibling overlaid on the tile corner.
- **Touch targets:** ≥ 44×44px on touch screens; desktop may show the ★ only on hover or focus, while touch screens always show it.
- **Colours:** tokens only. `snes.css` forbids hex; new tokens get dark twins in both dark blocks and are mirrored in `app/design/tokens.ts`.
- **Text:** ≥ 11px; contrast ≥ 4.5:1 in light and dark.
- **Reduced motion:** no animation.
- **Payload budgets:**
  - Top 8 page HTML+RSC ≤ 120 KB gzip, with props ≤ 50 KB (existing test).
  - The library page budget, re-measured and reported. It must not grow by more than 5 KB gzip.
  - The game-page title map, ≤ 12 KB gzip per page (test).
- **Noindex:** unchanged on every route.
- **Commits:** end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Branch `top-8-browse`. Never push.

## Review Focus

1. **Cross-tab and same-tab sync:** a ★ in one tab updates an open Top 8 page in another tab, and the tray on the same page updates immediately. No echo loops.
2. **Full list:** the replace popover never silently drops a game. Esc and outside clicks cancel; focus returns to the ★.
3. **Library filter `mine=1`:** with zero picks it shows the library's empty state, not a crash. Unknown URL params are kept.
4. **Tray never hides content:** `main` padding equals the tray height. Phone safe-area is respected. The tray never sits over the Time Machine's sticky deck; it isn't mounted on the Time Machine page at all.
5. **Top 8 page refactor:** every existing Top 8 test still passes. The shared-link rule holds. Browse-panel adds go through the same `addPick` and replace flow.

---

### Task 1: Pure pick helpers and the shared store

**Files:**
- Modify: `lib/snes/top8.ts`
- Create: `app/snes/top8/store.ts`, `__tests__/snes-top8-store.test.ts`
- Extend: `__tests__/snes-top8-lib.test.ts`

**Produces:**
- `isPicked(state, slug): boolean`
- `addPick(state, slug): { state: Top8State; full: boolean }`: fills the first null slot. If the slug is already picked, it returns the same state with `full: false`. If there's no slot, it returns the same state with `full: true`.
- `removePick(state, slug): Top8State`: sets that slot to null and keeps the others in place.
- `replacePick(state, index, slug): Top8State`: if the slug is already elsewhere, that other slot becomes null.
- In `store.ts` (`'use client'`):
  - `readTop8(): Top8State`: validates like `Top8.tsx`'s `readStored` does today. Move that validation here and export it.
  - `writeTop8(state)`: writes, then dispatches `new CustomEvent('snes-top8:change')` on `window`.
  - `subscribeTop8(cb)`: listens to `storage` (where `e.key === 'snes-top8'`) and to `snes-top8:change`; returns an unsubscribe.
  - `useTop8(): [Top8State | null, (fn: (s: Top8State) => Top8State) => void]`: uses `useSyncExternalStore(subscribe, getSnapshot, () => null)`. `getSnapshot` caches by the raw storage string, so the snapshot identity is stable.

- [ ] **Tests first:**
  - The helpers, including edge cases.
  - Store: write fires the event and subscribers see the new state; a `storage` event from another tab triggers subscribers; blocked storage gives `EMPTY_STATE` reads and no throw; the server snapshot is null (`renderToString` of a component using `useTop8` renders the null branch); and the snapshot is referentially stable across reads with no change.
- [ ] Implement.
- [ ] `npx jest`.
- [ ] Commit `feat(snes): shared Top 8 store and pick helpers`.

### Task 2: The ★ button and replace popover

**Files:**
- Create: `app/snes/components/Top8Star.tsx`, `__tests__/snes-top8-star.test.tsx`
- Modify: `app/snes/snes.css` (`.s-star*`, tokens only), `app/design-system.css` + `app/design/tokens.ts` (any new tokens)

**Produces:** `<Top8Star slug={string} title={string} variant="tile" | "page" onToast?={(msg) => void} />`.
- **Tile variant:** an absolutely positioned corner button, intended to sit inside a `position: relative` wrapper that is a sibling of the link. Desktop shows it on `:hover`/`:focus-within` of the wrapper; touch screens (`(hover: none)`) always show it. The visual is 28px, the hit area 44px on touch.
- **Page variant:** a labelled button reading "☆ Add to my Top 8" / "★ In your Top 8".
- **States:** `aria-pressed`. Labels exactly "Add ‹title› to your Top 8" / "Remove ‹title› from your Top 8".
- **Full list:** opens the popover (`role="dialog"`, `aria-label="Your Top 8 is full. Replace which?"`) with 8 mini covers as buttons labelled "Replace ‹title›". Tapping one replaces it. Esc or an outside click closes it, and focus returns to the ★. It stays within the viewport.
- **Toasts:** a tiny shared `useToast` living in the same file (or `app/snes/components/toast.tsx`) with an `aria-live` region.

- [ ] **Tests first:** toggling and labels; full → popover → replace; Esc and outside click; focus return; no `button` inside `a` when rendered inside a tile wrapper; works with storage blocked.
- [ ] Implement, `npx jest`, commit `feat(snes): add-to-Top-8 star with replace popover`.

### Task 3: Put ★ everywhere, plus the tray and the `mine` filter

**Files:**
- Modify:
  - `app/snes/components/GameTile.tsx` (wrapper + star)
  - `views/CoverWall.tsx`
  - `views/Shelf.tsx` (star on the spine band for touch; in the tip area for desktop, through a sibling wrapper)
  - `views/ScatterCard.tsx`
  - `GameView.tsx` (page variant beside the title, and stars on the strips via GameTile)
  - `Library.tsx` (mount the tray; the `mine` filter)
  - `FilterBar.tsx` (the "★ In my Top 8" toggle)
  - `lib/snes/library.ts` (`Filters.mine: boolean`, parse/toQuery `mine=1`, filter predicate takes the picks set)
  - `app/videogames/snes-history/[slug]/page.tsx` and `company/[slug]/page.tsx` (mount the tray with a titles map)
  - `app/snes/snes.css`
- Create: `app/snes/components/Top8Tray.tsx`, `__tests__/snes-top8-tray.test.tsx`. The server pages compute the slug→title map from `getGames()`; there is no new lib file.
- Extend: `__tests__/snes-library.test.ts`, `snes-views*.test.tsx`, `snes-game-page.test.tsx`, `snes-tile.test.tsx`

**Behaviour:** per the spec. The tray:
- renders only when the store is non-null and has at least one pick
- is fixed to the bottom with `padding-bottom: env(safe-area-inset-bottom)`
- has 8 mini slots (`/snes/thumb/<slug>.jpg`, 48px wide, links to the game page with `aria-label` = title), an "n/8" count and an "Open Top 8 →" link
- collapses to a "★ n/8" pill, remembered under `snes-top8-tray`
- adds `main` bottom padding equal to its height through a CSS class on `document.body` (`t8-tray-open`) set in an effect and removed on unmount

It's not mounted on the Top 8 or Time Machine pages. Existing hover-clip and tap-to-preview behaviour on tiles must be unchanged; a tap on the ★ must not trigger the tile's tap-to-preview.

- [ ] **Tests first:**
  - ★ present on each surface.
  - A tap on the ★ doesn't navigate or start a preview.
  - The tray appears after the first pick, collapse is remembered, it isn't rendered with 0 picks, and the body class is toggled.
  - `mine=1` filters and round-trips, with zero picks giving the empty state.
  - The game-page titles-map size guard: gzip ≤ 12 KB.
- [ ] Implement.
- [ ] `npx jest`; `npm test`. Measure the library page gzip before and after, and report it (growth ≤ 5 KB).
- [ ] Commit `feat(snes): add to Top 8 from the library and game pages, with a tray`.

### Task 4: Browse panel on the Top 8 page, and the store refactor

**Files:**
- Modify: `app/snes/components/Top8.tsx` (use the store for reads and writes while keeping the shared-link rule, the edited-only writes when opened from a link, and replace mode; mount `Top8Browse`), `app/snes/snes.css`
- Create: `app/snes/components/Top8Browse.tsx`, `__tests__/snes-top8-browse.test.tsx`

**Behaviour:** per the spec.
- **Controls:** year tabs, genre-family chips (`genreFamily` from `lib/snes/library.ts`) and sort (Top rated / A–Z / Release date).
- **Search:** the page's search text also filters the grid. Lift the query state, or pass it down.
- **Grid:** 96×67 thumbs from `/snes/thumb/<slug>.jpg`, with the title, a ★ badge and a picked frame. Tapping toggles: add (the replace flow when full) or remove.
- **Rendering:** 60 at first, more through an IntersectionObserver sentinel, with a "Show more" button fallback.
- **Count:** "Showing n of 717".
- **Storage:** while opened from a link and not yet edited, browse-panel edits count as edits (they set `edited`), just like other edits on this page.
- **Cross-page:** a ★ in the library (another tab) updates this page live through the store, unless the page was opened from a link and hasn't been edited. In that case the link's list stays on screen, and the stored list changes underneath without overwriting the view.

- [ ] **Tests first:** filters, sort, search, toggling, the full replace flow, 60-then-more, and a cross-tab storage event updating the slots. Every existing Top 8 page test stays green.
- [ ] Implement.
- [ ] `npx jest`; `npm test`. Re-measure the Top 8 budget.
- [ ] Commit `feat(snes): browse all games inside the Top 8 builder`.

### Task 5: Full regression UI test and fixes (controller-run)

Re-run the audit sweep and the 25-check interaction script, and add the checks listed in the spec's "Full regression UI test" section. Write `docs/superpowers/audits/2026-10-12-snes-browse-regression.md`. One fix dispatch, then a re-check.

## Execution notes

- Tasks run in order 1 → 5.
- Branch `top-8-browse` from main.
- Task 5 is controller-run.
