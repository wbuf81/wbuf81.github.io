# SNES Time Machine: design

Group A of the visualizations: what the world looked like the week each SNES game came out. It runs alongside the main pieces (dataset, library, Wes's layer, stats, story). Prototype approved by Wes on 11 Oct 2026: https://claude.ai/artifact/MmJ2p8m5h1sZGY1s4LLyEf (look T1 with the newspaper clipping; panel P2).

## Goal

Every week from the US launch (Fri 23 Aug 1991) to the last US release (Oct 1998), 373 weeks in all, shows:
- the Billboard Hot 100 #1 song
- the Billboard 200 #1 album
- the #1 film at the US weekend box office
- that week's US news
- the SNES games out that week
- what a console cost, in today's dollars

These show up in three places:
1. **`/videogames/snes-history/time-machine`**: a page you scrub through week by week. "Your SNES years" sits on top.
2. **Each game page**: a "Be Kind, Rewind" section for the week the game came out.
3. **Links in**: from the library header and from the `/videogames` hub.

**Success:**
- `npm run snes:pop` rebuilds `data/snes/weeks.json` and the artwork offline from cache.
- `npm test` passes, with every week valid.
- Both surfaces match the prototype.
- The Time Machine page stays at or under 150 KB gzipped, not counting images.

## Decisions (from Wes)

| Topic | Decision |
|---|---|
| Week panel contents | #1 song, #1 album, #1 movie, headline(s). No "also out this week" for other consoles yet. |
| Headlines | Auto-picked from Wikipedia's "YEAR in the United States" Events section, **unfiltered** ("the real history"). A per-week override can replace or hide a headline. |
| Prices | Hardware plus 30–50 well-known carts, researched from period ads and catalogs, each with a source. Prices are converted with CPI-U. Games with no researched price show no price. |
| Your SNES years | Narrated story from a birth year. The default is Wes's 1981 version with the ShopKo / F-Zero line. The Omaha ZIP code never appears. |
| Artwork | Album covers and movie posters are shown (Wes asked for them). |
| Look | T1: a dark CRT "screen" with an LED date, four cards (song, album, movie, price check), **The Omaha World-Pixel** newspaper clipping for the news, the games on the shelf, and a VCR deck (◀◀ ▶▶, scrubber, ⏏ random). |
| Game page section | **"Be Kind, Rewind"**, style P2 "coffee table": a cassette (song), a CD case (album), a movie ticket (film) and a newspaper clipping (headline), then a price line and "Open this week in the Time Machine →". |

## Data

### Sources (all from the MediaWiki API, no key; verified 11 Oct 2026)

| What | Page (one per year, 1991–1998) | Table shape |
|---|---|---|
| #1 song | `List of Billboard Hot 100 number ones of YEAR` | Issue date (Saturday), song, artist. `rowspan` carries a song across weeks. |
| #1 album | `List of Billboard 200 number-one albums of YEAR` | `! scope="row" \| {{dts\|August 24}}`, album, artist. `rowspan` carries an album across weeks. |
| #1 film | `List of YEAR box office number-one films in the United States` | `\|\|`-joined rows; `{{dts\|1991\|August\|25}}` (weekend end, Sunday); film; gross. `rowspan` on the film. |
| News | `YEAR in the United States` | The `== Events ==` section only. `=== Month ===` subheads, `* Month D – text` bullets, and nested `**` bullets under one date. Births and deaths are ignored. |
| Artwork | Each item's linked article, via `prop=pageimages&pilicense=any&pithumbsize=240` | Batched, 40 titles per request. In the prototype, 435 of 437 articles had an image. |

**Rate limits:** Wikipedia returned HTTP 429 when the prototype fetched too quickly. Fetchers make one request at a time, wait at least 2.5 s between requests, back off for 15 s × attempt on a 429, and keep every response in `.snes-cache/pop/`, so a re-run resumes.

### Pipeline

```
scripts/snes/fetch-pop.mjs      → .snes-cache/pop/{hot,album,box,news}-YEAR.json   (raw wikitext)
scripts/snes/fetch-pop-art.mjs  → public/snes/pop/<id>.webp (≤240 px, q≈75) + public/snes/pop/SOURCES.md
scripts/snes/build-weeks.mjs    → data/snes/weeks.json + coverage report
lib/snes/pop.ts                 parsers: chart tables, box office, news events (pure, fixture-tested)
lib/snes/weeks.ts               week assembly + lookups (pure)
lib/snes/money.ts               CPI table + toToday(usd, year)
lib/snes/years.ts               age / school grade / narration (pure)
data/snes/prices.json           hand-researched prices, each with a source
data/snes/pop-overrides.json    per-week headline replace/hide, artwork fixes
```

npm scripts: `snes:pop:fetch` (both fetchers), `snes:pop:build`, `snes:pop` (both).

**Parsing:**
- `wikitext.ts` gains `tableGrid(table)`, which expands `rowspan` into a full grid (the existing `tableRows` doesn't). Columns are found by header text: issue date, weekend end date, song, album, film, artist, gross.
- Text cleanup reuses `stripNoise`, `unwrapTemplates` and `linkText`, plus handling for `{{Sortname|First|Last}}` and `{{dagger}}`.
- An item's Wikipedia article is the first `[[link]]` in its cell.

**Week assembly (`weeks.ts`):** each week starts on a Friday, from 1991-08-23 through the week containing the last game.
- **Song and album:** the chart entry whose issue date is on or before the week start + 1 day (Billboard issues are dated Saturdays).
- **Film:** the entry whose weekend end is on or before the week start + 2 days (Sunday).
- **News:** every event dated inside the week, up to 4, in date order. If there are none, the latest event in the 10 days before the week, flagged `near`. If still none, `null`, and the UI reads "A quiet week in the news". The prototype had 2 such weeks.
- **Games:** day-precision games dated inside the week. Month-precision games (657 of 717) appear as "Also out in ‹Month›" on every week that starts in that month.

### Records

```ts
type PopItem = { title: string; by: string | null; article: string | null; art: string | null }; // art = "/snes/pop/<id>.webp"
type Week = {
  start: string;                 // "1991-08-23" (Friday)
  song: PopItem; album: PopItem;
  film: PopItem & { gross: string | null };   // "$4,676,467"
  news: { date: string; text: string }[];     // 0–4, in-week
  near: { date: string; text: string } | null;
};
```

- `data/snes/weeks.json` holds the `Week[]`. Games are joined at render time from `games.json` and never copied in.
- Art ids are a stable slug of the article title, so the same album across 10 weeks is one file.
- The total art set is about 440 images, roughly 6 MB as WebP.

**`prices.json`:** `{ hardware: Price[], games: Record<slug, Price> }`, where `Price = { usd: number; date: "YYYY" | "YYYY-MM"; note?: string; source: string }`. The source is a URL or a citation such as a catalog, ad or magazine issue.
- Hardware starts with the Super NES at $199.99 (Aug 1991).
- The research task fills in the add-ons (Super Scope, the 1997 model) and 30–50 famous carts.
- Unsourced prices are not allowed.

**`money.ts`:**
- Holds a CPI-U annual-average table for 1991–1998 plus a `NOW` year and value.
- The 2025 annual average is the default. It's a constant with a comment saying to update it each January.
- `toToday(usd, year)` rounds to the whole dollar.
- The UI says "about $473 in today's money" and the footnote names the CPI and the base year.

**`pop-overrides.json`:**
- Keyed by week start: `{ "1993-04-23": { news: [...] | "hide", note } }`.
- Also keyed by art id: `{ art: { "<id>": "/snes/pop/custom.webp" | null } }`.
- An override naming a week or id that doesn't exist fails the build, as with the dataset's overrides.

### Coverage report (printed by `snes:pop:build`)

```
SNES weeks — 373 weeks (1991-08-23 → 1998-10-09)
  song / album / film   373 / 373 / 373
  news in-week          ~360   near-week ~11   none ~2
  artwork               435 / 437 articles   (missing: …)
  prices                hardware 3 · games 42
```

`--json` prints the same report as JSON.

## Artwork and credit

- Covers and posters are copyrighted (non-free on Wikipedia).
- The site hosts small versions (≤240 px wide, WebP) under the same rule as the box art: committed and served locally, never hotlinked.
- `public/snes/pop/SOURCES.md` lists each file's Wikipedia source page.
- Each card links to the item's Wikipedia article.
- The page footnote credits Billboard, the box office data (Box Office Mojo via Wikipedia) and Wikipedia.
- This is fair use of low-resolution images in a non-commercial history. If Wes ever wants to drop the art, the UI falls back to text-only cards (`art: null` is a supported state everywhere).

## UI

### Time Machine page (`app/videogames/snes-history/time-machine/page.tsx`)

The server page renders week 0 (launch week) in full HTML. A client `TimeMachine` component takes over after hydration.

- **Your SNES years** (client, `YearsStory`):
  - A birth-year input (1965–2012) defaults to 1981 and is remembered in localStorage `snes-birth-year`. Storage failures fall back to 1981.
  - **Narration:** age at launch, plus the grade they were about to start or were in, and age when the last game shipped.
  - **The Wes line**, shown only for 1981: "Wes saved up $200 and bought one at ShopKo in Omaha, Nebraska, with F-Zero as a launch title."
  - **Milestones:** 10 fixed games, each "you were N, in Xth grade". Clicking one jumps to that week.
  - **Grade math:** the school year starts in September, and grade = school-year start − birth year − 5 (0 = kindergarten, 13–16 = college).
- **Screen (T1):**
  - LED date and "Week N of 373".
  - Four cards: song, album and film, each with art and linking to Wikipedia, and a price check showing the console and, when that week has a researched cart price, that cart.
  - The Omaha World-Pixel clipping (a riff on the Omaha World-Herald, since Wes lived in Omaha; never the real paper's name):
    - masthead "The Omaha World-Pixel", top line "Vol. (year − 1990) · No. (week number) · Omaha, Nebraska · Late edition · 25¢"
    - lead story as the headline, with its date as a red kicker
    - other stories in a side column (stacked under the lead on phones)
    - slight tilt, fold line and coffee ring; no tilt under reduced motion.
  - The shelf: covers of that week's games, each linking to its game page, plus "Also out in ‹Month›" for month-precision games (first 12 shown, then "+N more").
- **VCR deck:**
  - Stays at the bottom of the screen on phones.
  - **Controls:** ◀◀ ▶▶ step a week, the range slider scrubs, and ⏏ jumps to a random week.
  - **Keyboard:** ← → step when focus isn't in a field.
  - **Slider:** dragging updates the screen without re-creating the slider.
- **Deep links:**
  - `?w=1994-04-15` opens the week containing that date. It is read after hydration, and an invalid value falls back to launch week.
  - Stepping updates the URL with `replaceState`.
  - Game pages and milestones link here with `?w=`.
- **Images:** `loading="lazy"` with explicit width and height. Only the current week's images load.

### "Be Kind, Rewind" on game pages (`app/snes/components/BeKindRewind.tsx`, server component)

- Placed in `GameView` after the booklet's specs and scores, before "Also out in…".
- **Header:** a VHS tape with the label "BE KIND, REWIND" and a red sticker: "The week it came out" for day-precision games, or "‹Month YYYY›" for month-precision games, which use the first week starting in that month.
- **P2 objects:** cassette (song), CD case (album), ticket (film, with gross) and newspaper clipping (lead headline with date). The four sit in one row on desktop and 2×2 on phones.
- **Price line:** shows the game's researched price if it has one ("$69.99 then, about $162 now"). Otherwise it shows the console's launch price.
- **Link:** "Open this week in the Time Machine →" links to `/videogames/snes-history/time-machine?w=<start>`.
- Rendered at build time from `weeks.json`, so it adds no client JavaScript.

### Links in

- **Library header:** a "📼 Time Machine" link next to the view tabs.
- **`/videogames` hub:** a second card.
- Both pages keep noindex and the robots `Disallow: /videogames`.

### Styling

- New classes use the `s-tm-*` and `s-bkr-*` prefixes in `app/snes/snes.css`, with tokens in `design-system.css`:
  - `--tm-led`
  - `--tm-paper`
  - `--tm-paper-ink`
  - `--tm-kicker`

  Each token has a dark twin where it sits on the light page. The screen and the paper keep their own colours in both themes.
- Fonts: VT323 (LED and tape label) and UnifrakturMaguntia (masthead) are loaded through `next/font/google`, only on these two surfaces, with `display: swap` and fallbacks. Body text uses the site's fonts.

## Errors

- **Fetch failures:** a 429 or network error backs off and retries up to 6 times, then stops with the cache intact.
- **Missing pieces:** a missing year page fails the fetch with the page title. A chart table with no recognisable date or title column fails the build and names the page.
- **Build failures:** `build-weeks` fails if any week lacks a song, album or film, if a week starts outside the range, or if an override is orphaned. A missing image is a warning, and the UI shows a text card.
- **Bad input:** the UI never crashes on missing art, `near` news or no news.

## Tests

- **`snes-pop.test.ts`:** parsers on saved fixture snippets in `__tests__/fixtures/snes/pop/`, covering:
  - rowspan carry-down
  - `{{dts}}` in both forms
  - `||` rows
  - `Sortname`
  - dagger
  - News: Events section only, nested `**` bullets, and births/deaths ignored.
- **`snes-weeks.test.ts`:**
  - on-or-before picking for charts (Saturday) and film (Sunday)
  - the news window and its `near` fallback
  - month-precision games
  - the 1991-08-23 start
  - F-Zero's week = Bryan Adams / Natalie Cole / *Hot Shots!* / "The Super Nintendo Entertainment System is first released in the United States."
- **`snes-money.test.ts`:** $199.99 in 1991 → about $473 with the CPI table; rounding.
- **`snes-years.test.ts`:** grade and age math (1981 → 10 at launch, about to start 5th; 7th grade at Super Metroid), unborn years, and the Wes line only for 1981.
- **`snes-weeks-data.test.ts`** (committed data, runs on deploy):
  - 373 weeks; contiguous Fridays
  - every week has song, album and film
  - every `art` file exists
  - every `prices.json` entry has a source and a valid slug
  - overrides resolve
- **`snes-time-machine.test.tsx`:**
  - renders launch week
  - ▶▶ / ◀◀ / slider / random
  - `?w=` deep link
  - keyboard stepping
  - the birth-year input changes the narration and survives blocked storage
  - milestones jump weeks
- **`snes-bkr.test.tsx`:** day vs month sticker; P2 objects render with and without art; the price line falls back to the console; the link carries `?w=`.

## Not in this piece

- "Also out this week on Genesis" (that comes with console wars, group B)
- Audio previews of songs
- TV ratings
- Price research beyond the 30–50 carts
- The other visualization groups (B: chart lab, C: connections)
