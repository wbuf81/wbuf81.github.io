# SNES dataset — design

Piece 1 of 5 of the `/snes` project: an interactive history of the Super Nintendo in the US, with every licensed US release on a timeline, scores, box art, and Wes's own play log from his Analogue Pocket run.

| Piece | What | Depends on |
|---|---|---|
| **1. Dataset (this spec)** | Research pipeline producing `data/snes/games.json`, `companies.json`, box art | — |
| 2. Library & timeline | `/snes` timeline + shelf views, filters/sorts in the URL, `/snes/[slug]` game pages, `/snes/company/[slug]`, blow-on-the-cart random pick | 1 |
| 3. Wes's layer | `data/snes/wes.json`: statuses, ratings, Top 10, tiers, owned-back-in-the-day; `snes:log` script driven by Claude; dev-only edit mode | 1 |
| 4. Stats & charts | Releases per year, publisher leaderboard, Wes's progress, critics vs Wes | 1, 3 |
| 5. The story | Scrollytelling intro (opening with Wes's 1991 ShopKo purchase) + era chapters on the timeline | 2 |
| Later | Visitor favourites in their own browser, shareable as a link | 2, 3 |

Each piece gets its own spec → plan → build. Nothing in this piece is visible on the site; it ships data and the tests that guard it.

## Goal

A committed, tested dataset of the ~720 officially licensed North American SNES releases (Aug 1991 – 1998), rebuilt by re-runnable scripts, so every later piece reads one local file and the site build never calls an outside service.

**Success:** `npm run snes:build` produces `data/snes/games.json` and `data/snes/companies.json`, prints a coverage report, and `npm test` passes with every game valid. Re-running the pipeline never loses a hand correction.

## Scope

- **In:** licensed US retail releases.
- **Out:** Japan- or Europe-only games, unlicensed and homebrew carts, prize and limited editions, and the Satellaview. The Wikipedia list's other tables (limited edition, championship, unlicensed, other non-retail) are skipped.
- The US-release filter is the "NA" date column of the Wikipedia list's main table. A row with no NA date is not a US release.

## Sources

| Source | Gives | Access |
|---|---|---|
| Wikipedia, *List of Super Nintendo Entertainment System games*, main table | Title, developer(s), publisher, NA release date, article link | MediaWiki API (`action=parse&prop=wikitext`), no key |
| Wikipedia, each game's article, `{{Video game reviews}}` box | EGM (`EGM=`), Nintendo Power (`NP=` and variants), other review fields kept raw | MediaWiki API, no key |
| IGDB | Genres, max players, aggregate rating and count, summary, ESRB (age ratings), enhancement chip where present | Twitch client-credentials; `IGDB_CLIENT_ID` / `IGDB_CLIENT_SECRET` in `.env.local` (gitignored, never committed) |
| libretro-thumbnails, `Nintendo_-_Super_Nintendo_Entertainment_System/Named_Boxarts` | US box art (`<Title> (USA).png`) | GitHub raw, no key |

Verified 11 Oct 2026:
- The main table carries JP / NA / PAL dates per row as `{{dts}}` templates.
- *Super Metroid*'s article carries `EGM = 9/10 ×4` and `GI = 9.5/10`.
- *Bebe's Kids* and *Pocky & Rocky 2* carry no review box.

**Magazine scores will be partial, concentrated on well-known games.** The coverage report measures the gap, and filling it is ongoing research rather than a launch blocker.

## Pipeline

```
scripts/snes/
  fetch-wikipedia-list.mjs  → .snes-cache/wiki-list.json
  fetch-wiki-reviews.mjs    → .snes-cache/reviews.json      (reads wiki-list for article names)
  fetch-igdb.mjs            → .snes-cache/igdb.json         (reads wiki-list for titles)
  fetch-boxart.mjs          → public/snes/box/<slug>.jpg + public/snes/box/SOURCES.md
  build-games.mjs           → data/snes/games.json, data/snes/companies.json, coverage report
lib/snes.ts                 types + pure helpers, plain-Node loadable (same rule as lib/health.ts)
data/snes/overrides.json    hand corrections, applied last
data/snes/aliases.json      title aliases (per source) and company aliases
```

npm scripts: `snes:fetch` (all four fetchers), `snes:build`, `snes` (both).

- **The cache** (`.snes-cache/`, gitignored) holds raw source responses, so `build` runs offline and is fast to iterate. Fetchers are polite: one request at a time, a User-Agent naming the site, and they skip anything already cached unless run with `--refresh`.
- **Box art:**
  - Images are downloaded once, resized to 300 px wide, and saved as JPEG at quality ~82, roughly 25–40 KB each and ~25 MB in total.
  - They are committed and hosted locally, never hotlinked (site rule).
  - `SOURCES.md` credits libretro-thumbnails and lists any image sourced elsewhere through an override.
- **Matching across sources** is done by `normalizeTitle()` in `lib/snes.ts`. It:
  - lowercases the title
  - moves trailing articles back to the front ("7th Saga, The" → "the 7th saga")
  - unifies "&" and "and", Roman and Arabic numerals in sequels, and punctuation and diacritics
  - strips region and revision tags

  What still fails to match is reported, never guessed. A human adds an entry in `aliases.json` or `overrides.json`.
- **Overrides** (`overrides.json`) are keyed by slug and deep-merged over the built record. Their uses:
  - Correcting a date, adding a missing score, pointing at different box art, or setting `launchTitle`.
  - An override may carry a `note` saying why. Overrides never expire silently: one naming a slug that no longer exists fails the build.

## Records

`data/snes/games.json`: an array sorted by `releasedUS`, then title. Facts only; Wes's opinions live in piece 3's `wes.json`, keyed by the same slug.

```ts
type Game = {
  slug: string;                 // permanent; URL and wes.json key. Derived from the title once, then frozen
  title: string;                // US title as printed
  releasedUS: string;           // "1994-04-18" | "1994-04" | "1994"
  datePrecision: "day" | "month" | "year";
  developers: string[];         // company slugs
  publisher: string;            // company slug
  genres: string[];             // IGDB genre names, small fixed vocabulary
  players: number | null;       // max simultaneous
  chip: "Super FX" | "Super FX 2" | "SA-1" | "DSP-1" | "DSP-2" | "DSP-3" | "DSP-4"
      | "Cx4" | "S-DD1" | "SPC7110" | "ST010" | "ST011" | "ST018" | "OBC1" | "S-RTC" | null;
  launchTitle: boolean;         // on shelves in launch week, Aug 1991; set by override after research
  esrb: "K-A" | "E" | "T" | "M" | null;   // null = pre-ESRB (before Sept 1994) or unrated
  summary: string | null;       // IGDB, trimmed to ≤ 400 chars at a sentence boundary
  scores: {
    aggregate: number | null;   // IGDB 0–100; null when fewer than 3 ratings
    aggregateCount: number;
    egm: number[] | null;       // each reviewer's score out of 10, as printed
    nintendoPower: { score: number; scale: 5 | 10 | 20 } | null;   // NP's scale changed over the years
    other: Record<string, string>;   // remaining review-box fields, raw, for later use
  };
  boxArt: string | null;        // "/snes/box/<slug>.jpg"
  sources: { wikipedia: string | null; igdb: number | null };
};
```

`data/snes/companies.json`:

```ts
type Company = { slug: string; name: string; aliases: string[]; country: string | null };
```

- Company names from every source are resolved through `aliases.json` ("Squaresoft" → `square`, "Ultra Games" → `konami`), so a company page lists every game.
- An unresolved name creates no company. It is reported, and the build fails if a game's publisher is unresolved.

**Derived, not stored:**
- The **era** of a game comes from `eraFor(date)` in `lib/snes.ts`, with boundaries defined in piece 5, so redrawing eras needs no re-import.
- **Display conversions** of scores happen in the UI.

## The coverage report

Printed by every `snes:build`. It works as the research to-do list:

```
SNES dataset — 719 games, 168 companies
  box art            712 / 719   (7 missing: …)
  aggregate score    640 / 719
  EGM                214 / 719
  Nintendo Power     188 / 719
  ESRB               301 / 461 games released after Sept 1994
  launch titles        5
  unmatched titles     9  (wikipedia ↔ igdb: …; wikipedia ↔ libretro: …)
  unknown companies    3  (…)
```

`--json` writes the same report to stdout as JSON, for Claude to read.

## Tests

- **`__tests__/snes-data.test.ts`** checks the committed data and runs on every deploy:
  - Slugs are unique and URL-safe.
  - `releasedUS` falls between 1991-08 and 1998-12, and its format matches `datePrecision`.
  - Every developer and publisher slug resolves in `companies.json`.
  - Every `boxArt` file exists in `public/`.
  - Scores are within their scales.
  - `esrb` is null for any game dated before 1994-09.
  - The game count is between 700 and 740 (guards against a broken scrape).
  - Every override names an existing slug.
- **`__tests__/snes-lib.test.ts`** checks the pure helpers:
  - `normalizeTitle` cases, including articles, numerals, "&", subtitles and region tags
  - `slugify`
  - date and precision parsing from `{{dts}}`
  - review-box parsing (EGM's four scores, NP's scale)
  - company alias resolution
- **Fetchers are not tested against live services.** The parsers they call are tested on saved fixture snippets in `__tests__/fixtures/snes/`.

## Errors

- A fetcher hitting a network error or rate limit backs off and retries 3 times. It then stops with the cache intact, and re-running resumes.
- A missing IGDB key makes `fetch-igdb` exit with a clear message. The other fetchers and `build` still run, with IGDB fields null.
- `build` fails when:
  - an override or alias names something that doesn't exist
  - a publisher is unresolved
  - two games collide on a slug
  - the game count falls outside 700–740

  Everything else is a warning in the coverage report.

## Not in this piece

UI of any kind, `wes.json`, eras, the story, and charts. Launch-title research and magazine-score gap filling continue after this piece ships, as overrides.
