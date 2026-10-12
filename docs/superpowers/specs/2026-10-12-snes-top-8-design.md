# SNES Top 8: design

A MySpace "Top 8" for Super Nintendo games, in the spirit of my9games.net. Any visitor picks 8 SNES games and drags them into order. MySpace-style "friend requests" suggest more games. The visitor picks one of six themes and saves a 1080×1080 picture to share, or copies a link that rebuilds the list.

Approved prototype (12 Oct 2026): https://claude.ai/artifact/LQAeVS1Uiuth7JgWwLSQpT (version 2, the 3×3 layout). Its source is at `/private/tmp/claude-501/-Users-wes-Documents-Claude/c709f3f4-5f2b-48c6-9705-f69cc5882242/scratchpad/top8/template.html`; it's a reference only and may be gone.

## Decisions (from Wes)

| Topic | Decision |
|---|---|
| Format | MySpace Top 8. Exactly 8 slots. |
| Audience and sharing | Anyone can build one. Shared as a saved PNG plus a link that rebuilds it (`?g=…`). No accounts, no database, no global ranking. |
| Recommendations | A "friend requests" box built from our own data, with Accept and Deny |
| Profile | A theme picker, plus one optional display name (approved as part of the design summary) |
| Image | Square, 1080×1080, PNG |
| Image layout | A 3×3 grid. Cell 1 is a themed title tile ("‹Name›'s / Top 8"); cells 2–9 hold the 8 covers, as large as the square allows, with a one-line title under each. |
| Themes | Six themes, all drawn in code with no game logos or ripped art: **MySpace Classic**, **Glitter**, **Console** (grey SNES plastic with lavender and purple buttons), **Grand Prix** (F-Zero-inspired neon speed stripes, track grid, chequered flags, LED lap timer), **Crystal Menu** (Final Fantasy-inspired blue gradient menu windows, white borders, pointing cursor, `Lv1`…`Lv8`), **Polygon Space** (Star Fox-inspired low-poly shapes, starfield, green wireframe cockpit) |
| Reorder | Drag and drop on touch, mouse and keyboard |

## Page

**Route:** `/videogames/snes-history/top-8`. Noindex like the rest of the section. It has its own static share card, so every shared link previews the same "My SNES Top 8" card; a static site can't make a personal preview per link.

**Layout:** the editor and the live preview sit side by side on desktop and stack on phones. The editor is styled as MySpace boxes, with blue header bars and Verdana-ish labels on the site's light or dark page.

1. **Edit profile box:**
   - Display name: optional, at most 24 characters, trimmed. Only letters, numbers, spaces and `'.-_&!` are kept.
   - Theme chips: six buttons with `aria-pressed`.
   - Search: matches all 717 titles, ignoring case and punctuation, so "zelda" finds "The Legend of Zelda: A Link to the Past" and "ff" doesn't need to match anything. It shows up to 12 results with cover thumbs and years. Esc or a click outside closes the list. Arrow keys move through results and Enter adds one.
2. **Friend Space box:**
   - **Header:** "‹Name›'s Friend Space" or "My Friend Space", and "n of 8".
   - **Slots:** eight in a 4×2 grid on desktop and 2×4 on phones. A filled slot shows its rank badge, the cover, the title as a MySpace-blue underlined name, and ✕ to remove. An empty slot shows "Add a friend".
   - **Reorder:** dragging moves a game and shifts the rest; empty slots stay in place. The keyboard works too: focus a slot, press Space to lift it, use the arrows, Space to drop, Esc to cancel. Moves are announced through `aria-live`.
3. **Friend requests box:**
   - **Header:** "You have N new friend requests!".
   - **Rows:** five, each with the cover, title, year and a reason line.
   - **Accept** puts the game in the first empty slot. If all 8 are full, the slots glow and the hint says "Tap a slot to put ‹game› there"; Esc cancels.
   - **Deny** hides the game for this visitor (remembered).
4. **Preview box:**
   - The live canvas, scaled to fit.
   - **Save picture** downloads `my-snes-top-8.png`.
   - **Share:** shown only where `navigator.canShare({ files })` is true. It opens the system share sheet with the PNG and the link.
   - **Copy link:** "Link copied" toast; falls back to a selectable text field if the clipboard is refused.
   - **Start over:** clears the list, with an inline "Are you sure?" confirm.

**State:** `{ slots: (slug|null)[8], theme, name, denied: slug[] }`.

- **On load:**
  - URL parameters win: `?g=slug,slug,…` (up to 8, with unknown slugs dropped and `_` for an empty slot), `&skin=<theme>`, `&n=<name>`.
  - Otherwise `localStorage['snes-top8']` is used. Every read and write is wrapped in try/catch.
- **Saving:** every change is saved. The URL updates with `replaceState` once the visitor edits; a plain visit isn't rewritten.

## Recommendations (`lib/snes/top8.ts`, pure)

`recommend(picks, games, denied, n = 5)` → `{ slug, reason }[]`.

- **With no picks**, it returns these starters in order, skipping denied ones: super-mario-world, the-legend-of-zelda-a-link-to-the-past, super-metroid, chrono-trigger, donkey-kong-country, super-mario-kart, final-fantasy-iii, street-fighter-ii-the-world-warrior. The reason is "a classic to start with".
- **Scoring:** every candidate that isn't picked or denied scores:
  - **+3** for each pick whose IGDB `similar` list includes it. Reason: "because you picked ‹pick›".
  - **+2** for each pick in the same `series`. Reason: "more ‹series›".
  - **+1** for each genre it shares with the picks' genres, counted once per genre. This adds to candidates that already scored; it only adds new candidates when fewer than 5 have scored, and then only games scoring 8.0 or more. Reason: "you like ‹genre› games".
  - **+score/10:** EGM average, else aggregate/10, else player score/10, else 6.
- **Result:** sort by score descending, then title, and take the top n. Each reason comes from the strongest signal that game received.
- **Deterministic:** no randomness.

## The picture (`app/snes/top8/render.ts`, browser-only)

`renderTop8(ctx, { slots, theme, name, images, fonts })` draws onto a 1080×1080 canvas. The page preview and the saved PNG come from the same function.

- **Grid:**
  - margin 22, gap 14
  - cell width (1080 − 44 − 28)/3
  - cover height = width × 209/300 (box-art aspect)
  - label band 40px
  - centred vertically
- **The two bands above and below the grid** are each theme's decoration space, so nothing there looks empty or unfinished. The theme decides what goes there.
- **Theme module interface:** `{ id, label, bg(), title(x,y,w,h), frame(x,y,w,h,n), label(x,y,w,n,slug), over?(), empty: { fill, ink } }`. There's one file per theme under `app/snes/top8/themes/`.
- **Title tile:** two lines, "‹Name›'s" or "My", then "Top 8", plus the theme's flourish and `wesleybard.com/videogames`.
- **Labels** truncate with "…" at the tile width.
- **Empty slots** draw the theme's "Add a friend" placeholder, so a half-built Top 8 still saves cleanly.
- **Images:** full 300px box art from `/snes/box/<slug>.jpg`. It's same-origin, so the canvas isn't tainted and `toBlob` works. Each image is loaded once and cached. A missing or failed image draws the title in its place.
- **Fonts:**
  - New via `next/font/google`: Press Start 2P (Crystal Menu) and Orbitron 700/900 (Grand Prix).
  - Reused: VT323 (Grand Prix, Polygon Space) and the site's IBM Plex Sans for the other themes. Verdana with Arial and sans fallbacks for MySpace.
  - Canvas needs the real family names, so the renderer reads `font.style.fontFamily` from the `next/font` objects. It also awaits `document.fonts.load(...)` for each face before the first draw and redraws when they arrive.
- **Crystal Menu cursor:** sits inside the grid margin, next to slot 1, never clipped by the edge.

## Libraries

- **`@dnd-kit/core` and `@dnd-kit/sortable`:** these give touch, mouse and keyboard sorting with screen-reader announcements. Pin exact versions. They're loaded only on this page.
- **Nothing else new:** the picture is drawn with plain canvas.

## Links in

- **Hub:** a new card "My SNES Top 8", whose image is a static render of an example Top 8 in the MySpace theme.
- **Library hero:** "🏆 Make your SNES Top 8 →".
- **Share card:** `scripts/og/build-og.py` gains a `top8` card, a square example picture letterboxed into 1200×630 as a JPEG under 300 KB. The page's `openGraph` and `twitter` metadata use it.

## Payload

The client gets a slim game index: `[slug, title, year, genres, series, similar, score]` for 717 games. Box-art paths follow the slug, so they aren't sent.

- **Budget:** page HTML plus RSC payload at most 120 KB gzipped, guarded by a jest test the same way as the Time Machine's.

## Errors and edge cases

- **Duplicate pick:** "Already in your Top 8" toast.
- **`?g=` problems:** more than 8 slugs are cut to 8; unknown slugs are dropped silently; duplicates are de-duplicated.
- **Name:** with an empty name, titles read "My Top 8".
- **Storage blocked:** everything still works for the session.
- **Clipboard refused:** a selectable text field appears.
- **Share unsupported:** the Share button is hidden.
- **`toBlob` failure:** "Couldn't make the picture — try Save again" toast.

## Tests

- **`snes-top8-lib.test.ts`:**
  - **Recommendations:** starters, the similar/series/genre weights, denied games excluded, picked games excluded, the strongest-signal reason, deterministic order, and fewer than 5 candidates.
  - **URL:** parse and serialize round-trips; unknown, duplicate and too-many slugs; `_` empties.
  - **Name:** sanitizing.
- **`snes-top8-render.test.ts`:**
  - The layout maths: cell positions, cover size, centring.
  - Each theme's `title`, `frame` and `label` call into a recording mock 2D context without throwing, for full, empty and long-title cases.
  - The text-fitting helper.
- **`snes-top8-page.test.tsx`:**
  - Adding a game through search, removing it, accepting a request (first empty slot, and replace-mode when full), deny.
  - Keyboard reorder through dnd-kit's keyboard sensor.
  - Restore from `?g=` and from storage, and blocked storage.
  - Copy link with the clipboard refused.
  - Save calling `toBlob` and creating a download link.
  - The Share button hidden without `canShare`.
- **`snes-og.test.ts`:** the top8 card exists, is 1200×630 and under 300 KB. Metadata and noindex are set.
- **Payload budget test.**

## Full regression UI test (last task)

Run the end-to-end audit from 11 Oct again, extended, against the built site in a real browser.

- **Screens:**
  - homepage, hub, library (all 5 views plus the Filters panel)
  - three game pages, a company page
  - the Time Machine (4 weeks)
  - the new Top 8 page: empty, partly filled, full, each theme, replace-mode
- **Every screen, at:** 375 (touch), 768 and 1280; light and dark.
- **Checks:**
  - contrast measured from colours
  - text at least 11px
  - touch targets at least 44px on phones
  - no horizontal overflow, also at 200% zoom
  - reduced motion
  - heading order
  - accessible names
  - image dimensions
  - console errors and 404s
- **Interaction regressions, scripted:**
  - tap-to-preview clips on phones and hover clips on desktop
  - the scatter's hover card
  - Time Machine scrubbing, keys and `?w=`
  - On This Day
  - the Games nav link
  - featured homepage tile
  - on the Top 8 page: search, drag on touch and mouse, keyboard reorder, accept/deny, save (file downloaded and is a 1080×1080 PNG), copy link, restore from link
- **Pictures:** each of the six themes rendered with 8 games, 3 games and long titles, then checked by eye.
- **Output:** an audit report in `docs/superpowers/audits/`. Every failure gets fixed with a regression test where possible, then re-checked.

## Not in this piece

- A site-wide "most picked" ranking (needs a backend)
- Profile photos and profile songs
- A personal link preview per shared Top 8
- Wes's own Top 8 shown on the site (comes with piece 3)
