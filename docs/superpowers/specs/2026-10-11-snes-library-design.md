# SNES library and timeline — design

Piece 2 of 5 of the `/snes` project. Piece 1, the dataset (`docs/superpowers/specs/2026-10-11-snes-dataset-design.md`), built `data/snes/games.json` (717 US releases), `companies.json` and local box art. This piece is what people see and use: the `/snes` page, with five ways to browse, plus a page for every game and every company.

Visual decisions were made with mockups (saved in the repo's gitignored `.superpowers/brainstorm/`). Their outcomes are written out here, so this document stands alone.

## Goal

Someone opens `/snes`, sees every US SNES game laid out month by month, and can narrow the list with filters. They can switch between five views and open any game's booklet-style page. The site stays a static export on GitHub Pages.

**Success:**
- `npm test` and `npm run build` pass.
- `/snes`, all 717 game pages and all company pages are generated.
- The page works at 390 px with no sideways scroll, and in both themes.
- A filtered URL, e.g. `/snes?publisher=konami&view=wall`, reopens the same view.

## Scope

- **In:**
  - The `/snes` page: hero, filter bar, year tabs, and five views (Timeline, Heatmap, Cover wall, Game shelf, Score scatter).
  - `/snes/[slug]` game pages.
  - `/snes/company/[slug]` company pages.
  - Two dataset additions: manual links and 96 px thumbnails.
  - New design-system tokens.
- **Out (later pieces):**
  - Wes's played/rating/tier data (piece 3). The game page keeps a reserved slot for it.
  - Stats beyond the five views (piece 4).
  - The story and era chapters (piece 5).
  - Interactive toys (controller support, blow-on-the-cart random pick, sounds, Mode 7). These were deferred by Wes; "work on that later".
- **Visibility:** `/snes` is deployed but **unlinked and `noindex`**, the same arrangement as `/health`, until piece 3 ships:
  - no nav link
  - `robots: { index: false, follow: false }` on every `/snes` route
  - `Disallow: /snes` in `public/robots.txt`
  - not in the sitemap

## Visual design

**Game tile ("D1"):**
- A dark card in the screen colors on the light page.
- Contents: box art; title in Source Serif 4; `publisher · genre` in IBM Plex Mono; score chips (`EGM 9.0`, `NP 3.8/5`); a `Day One` chip on launch-day games.
- Width 136 px on desktop. On a phone, two tiles fit across with an 8 px gap at 390 px.

**Tile hover and keyboard focus:**
- A purple outline glow.
- The **"S3 arcade CRT" scanlines** ease in over about 0.4 s: heavy 2 px lines, a faint RGB phosphor grid and a vignette over the cover, with a slight saturation and contrast boost.
- No blink or flicker. Wes rejected a power-on flicker.
- `prefers-reduced-motion`: the scanlines appear without transition.
- On touch devices there is no hover. The tile simply opens.

**Page (layout "L1"):**
- A short hero. Eyebrow: "The Super Nintendo in America". Heading: "Every US SNES game, 1991–1998". One line with the count.
- A sticky filter bar.
- Year tabs: 1991 to 1998.
- Then the active view.

**Timeline:**
- Vertical, one row per month.
- The left rail shows the month in serif, the year in mono and "N games".
- The month's tiles wrap to the right.
- Launch day (Aug 23, 1991) carries an eyebrow, "Launch day · Aug 23".

**Heatmap:**
- A grid of years by months (Aug 1991 to Dec 1998). Each cell shows its count.
- Four purple steps from light to deep. The peak month (Nov 1994, 48 games) is the darkest.
- Months before launch are drawn dashed and empty.

**Cover wall:**
- Every cover in release order, packed tightly on a dark screen panel, using 96 px thumbnails.
- Games filtered out stay in place, dimmed to 18% and greyscale.
- Hover enlarges a cover 1.6×.

**Game shelf:**
- Drawn spines, 32 × 210 px, standing on a wooden shelf and plank.
- Each spine has a black "SUPER NINTENDO" band at the top, then a **vertical slice of that game's own cover art** behind the title, which runs vertically in serif with a darkening gradient for legibility, then a seal dot at the bottom.
- Hover pulls the spine up 16 px and shows a tooltip with the cover thumbnail and the title. Clicking opens the game page.

**Score scatter:**
- One dot per game that has the chosen score. Release date runs across; the score runs up, from 0 to 10.
- A handful of classics are labelled, with collision handling so labels never overlap.
- Hover shows the title and score. Clicking opens the game.

**Game page (booklet "G3"):**
- **Top:** a breadcrumb (`SNES / 1994 / April`), plus `◀ previous · next ▶` in release order.
- **Left column:** the cover in the S3 CRT treatment (always on), and below it the reserved **"Wes's take — coming in piece 3"** slot (a dashed purple box).
- **Right column:** a warm-paper "Instruction booklet":
  - The title, with genre and players chips underneath.
  - **The story:** the summary, or "No summary yet" while IGDB is pending.
  - **Specifications:** released, developer(s), publisher, players, genre, chip, rating (pre-ESRB before Sept 1994).
  - **What the magazines said:**
    - EGM as four reviewer bars.
    - Nintendo Power with its scale.
    - Every other review-box score as a list, with abbreviations expanded (GI → Game Informer, Fam → Famitsu).
  - **"Read the original manual →"**, when a link exists.
- **Below:** "Also out in <Month Year>": up to 8 tiles, plus "N more", which links to the timeline at that month.

**Company page:**
- Name, then counts: N games as developer and M as publisher.
- A compact timeline of their games, using the same month rows and tiles.

**Dark mode:**
- The page background and text follow the site tokens.
- The tiles keep their screen look; the screen colors are identical in both themes, as on the Tetris print.
- The booklet's warm paper gets a dark twin.

## Architecture

The page is built ahead of time, with one interactive layer:

```
app/snes/
  page.tsx                  server: hero + <Library> with every tile pre-rendered (Timeline as the initial view)
  [slug]/page.tsx           server: generateStaticParams over games.json → booklet page
  company/[slug]/page.tsx   server: generateStaticParams over companies.json → company page
  snes.css                  tokens only, every selector under .wb, blocks prefixed s- (s-tile, s-bar …)
  components/
    Library.tsx             'use client': URL ⇄ filter state, view switch, renders FilterBar + active view
    FilterBar.tsx           'use client'
    GameTile.tsx            shared by every page (server-renderable)
    views/Timeline.tsx      server-renderable; also re-rendered client-side when filtered
    views/Heatmap.tsx  CoverWall.tsx  Shelf.tsx  Scatter.tsx   'use client', loaded with next/dynamic on first use
    Booklet.tsx  MagazineScores.tsx  EgmBars.tsx
lib/snes/
  library.ts                pure: index building, filtering, sorting, grouping, heatmap, scatter, neighbours, URL ⇄ filters
  display.ts                pure: magazine names, score formatting, date labels, month names
```

- **Data at build time:** pages import `data/snes/games.json` and `companies.json` through `lib/snes/library.ts`. Nothing is fetched at runtime.
- **The slim index:**
  - `buildIndex(games)` produces the list the client needs: `slug, title, releasedUS, datePrecision, publisher, developers, genres, players, chip, launchTitle, egmAvg, np10, aggregate, boxArt, thumb`. `np10` is Nintendo Power converted to a 0–10 scale.
  - `/snes` passes it to `<Library>` as props, keeping it under about 120 KB.
  - The full records (summaries, every magazine score) stay on the game pages.
- **Initial render:**
  - The server renders the Timeline with all 717 tiles, so the content is there without JavaScript.
  - `<Library>` hydrates, reads `window.location.search` (a static export can't read query strings at build time), applies the filters, and re-renders.
  - The filter bar is not shown until hydration, so it never appears in a non-working state.
- **URL state:**
  - `?q=&year=1993,1994&publisher=<slug>&developer=<slug>&chip=<slug>&scores=egm,np,egm8&launch=1&genre=&players=&sort=date|title|egm|np|aggregate&view=timeline|heatmap|wall|shelf|scatter&y=egm|np|aggregate`.
  - Updates use `history.replaceState`, so filtering doesn't fill the back button.
  - Unknown parameters and invalid values are dropped silently, so a hand-edited or old URL never breaks the page.
- **Images:**
  - Tiles and the booklet use `public/snes/box/<slug>.jpg`.
  - The wall and shelf use `public/snes/thumb/<slug>.jpg`.
  - Every `<img>` has `loading="lazy"`, `decoding="async"` and explicit width and height, to avoid layout shift.
  - The 3 games without art get a styled placeholder: a dark tile with the title in serif.

## Behaviour

- **Filters combine with AND.**
  - **Search** matches titles using the dataset's `normalizeTitle`, so it ignores case, punctuation and accents, and treats "&" and "and" alike.
  - **Year** is multi-select. **Publisher** and **developer** are each a single company, chosen from a searchable list with game counts.
  - **Chip** lists only the chips present.
  - **Scores** offers three toggles: has EGM, has Nintendo Power, EGM average ≥ 8.
  - **Launch day** is a toggle.
  - **Genre** and **players** controls render only once at least one game has that data (after IGDB).
- **Sort:**
  - The Timeline is always chronological, and the sort control is hidden there.
  - The wall and shelf sort by date (the default), title, EGM average, Nintendo Power (0–10) or aggregate. Games missing the sort score go last, in date order.
- **Order within a month:** day-precision dates first, by day; then month-precision games, by title.
  - Year-only dates (none today, but the dataset allows them) form a "Sometime in <year>" group at the end of that year.
- **How each view uses the filters:**
  - **Heatmap:** counts only matching games. Clicking a month sets `view=timeline` and scrolls to that month.
  - **Cover wall:** dims non-matches rather than hiding them.
  - **Shelf:** shows only matches.
  - **Scatter:** plots matches that have the chosen score. Its y-axis switches between EGM, Nintendo Power (0–10) and aggregate.
- **Year tabs:** scroll to that year in the Timeline, Wall and Shelf. In the Heatmap and Scatter they are hidden, since those views already show all years.
- **No matches:** "No carts match those filters" and a *Clear filters* button.
- **Neighbours (◀ ▶):** previous and next in the dataset's release order. The first and last games show only one arrow.
- **Accessibility:**
  - Tiles, spines, heatmap cells and dots are links or buttons, with names such as "Super Metroid, April 1994, EGM 9.0".
  - The view switch is a tab list.
  - Focus shows the same glow as hover.
  - Charts have a text alternative: the heatmap cells carry counts, and the scatter has a visually hidden table of its points.

## Dataset additions (piece 1 pipeline)

- **Manual links.**
  - Add `manual: { url: string; source: 'nintendo' | 'archive' } | null` to `Game`.
  - A new fetcher, `scripts/snes/fetch-manuals.mjs`, queries the Internet Archive search API for the `manuals_snes` collection. That collection held 420 US items on 11 Oct 2026, titled like "Battletoads & Double Dragon ( USA)".
  - It keeps only items whose title carries `USA`, and caches them in `.snes-cache/manuals.json`.
  - `build-games` matches them to games with `normalizeTitle`, linking to `https://archive.org/details/<identifier>`.
  - Nintendo's official PDFs for the SNES Classic Edition's 21 games (`https://www.nintendo.co.jp/clvs/manuals/`) take precedence. They go in `aliases.json` under a new `manuals` key, mapping slug to URL, after confirming each link returns 200.
  - The coverage report gains a "manual" line. Gaps are filled over time with `aliases.json` `manuals` entries.
  - **Link only:** manuals are never downloaded or hosted.
- **Thumbnails.**
  - `fetch-boxart.mjs` also writes `public/snes/thumb/<slug>.jpg` at 96 px wide, quality 75, from the same source image.
  - `snes-data.test.ts` checks that every game with `boxArt` has a thumbnail.

## Design-system tokens

New tokens are added to `app/design-system.css`. Each one appears in both dark blocks and in `app/design/tokens.ts`, as `__tests__/design-system.test.ts` requires:

| Token | Light | Dark | Use |
|---|---|---|---|
| `--snes` | `#4f3d8f` | `#b3a6ea` | Purple accent: chip text, EGM bars, active filters |
| `--snes-glow` | `#8a7cc4` | `#8a7cc4` | Hover and focus glow |
| `--snes-soft` | `#ebe7f7` | `#2b2546` | Chip and active-filter fills |
| `--screen-2` | `#1b2530` | `#1b2530` | Tile body (screen colors are the same in both themes) |
| `--screen-rule` | `#2a3640` | `#2a3640` | Tile border |
| `--snes-h1`…`--snes-h4` | `#d9d3ef` `#ab9fd8` `#7a69bd` `#4f3d8f` | `#2b2546` `#4a3d80` `#6f5fb8` `#a99be0` | Heatmap steps |
| `--booklet` | `#fbfaf6` | `#1d222a` | Booklet paper |

- The heatmap steps and `--snes` text on `--snes-soft` are checked with the dataviz validator (contrast at least 3:1 for marks, 4.5:1 for text) before shipping.
- The `/design` page lists the new tokens.

## Testing

- **`__tests__/snes-library.test.ts`** checks the pure helpers:
  - `buildIndex` fields, including `egmAvg` and the `np10` scale conversion
  - every filter alone and combined, and accent-insensitive search
  - ordering within a month, and year-only grouping
  - `heatmapCounts`, including pre-launch months
  - `scatterPoints` per score
  - `neighbours` at the first and last games
  - `parseQuery` / `toQuery` round-tripping, dropping invalid values
- **`__tests__/snes-display.test.ts`** checks magazine names, score formatting and date labels ("April 18, 1994", "April 1994", "1994").
- **`__tests__/snes-pages.test.tsx`** renders, from a small fixture:
  - the `/snes` Timeline
  - a game page with every section, and one with the bare minimum (no scores, no summary, no art, no manual)
  - a company page
  - each view
  - once over the real `games.json`: no `undefined`, `NaN` or empty titles, and every image path exists
- **The existing design-system tests** cover `snes.css`: tokens only, `.wb` scoping, and dark twins.
- **The existing viewport and robots tests** extend to `/snes` being `noindex` and disallowed.
- **Checked in the browser before calling it done:**
  - 390 px with no sideways scroll
  - both themes
  - tile hover and focus
  - each view
  - a filtered URL reopening the same state
  - the built `/snes` HTML size measured and noted

## Risks

- **Page weight.** 717 pre-rendered tiles is a large HTML file. Mitigations:
  - lean markup per tile
  - lazy images
  - views other than the Timeline load only when opened

  Budget: `/snes` HTML at most 600 KB uncompressed. If it's over, the Timeline pre-renders only the first year and the client renders the rest.
- **Build time.** About 1,000 static pages. Acceptable for Next; the deploy time is measured on the first push.
- **Missing data.** Genre, players, summary and aggregate are empty until IGDB lands. Scores and manuals are partial. Every component renders the absent state deliberately: hidden controls, "No summary yet", no empty chips.
- **Hover-only details.** Every detail shown on hover (shelf tooltip, scatter labels) is also reachable by focus and on the game page.
