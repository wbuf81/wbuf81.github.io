# SNES Dataset Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A re-runnable, tested pipeline that builds `data/snes/games.json` (~717 US SNES releases), `data/snes/companies.json` and local box art from Wikipedia, IGDB and libretro-thumbnails.

**Architecture:**
- **Parsing and merging** are pure functions in `lib/snes/*.ts`, unit-tested with Jest on real wikitext snippets.
- **Thin `.mjs` scripts** in `scripts/snes/` fetch raw source data into a gitignored `.snes-cache/`, and load the TypeScript libs the way `scripts/add-health-week.mjs` does (`createRequire` + `ts-node/register`).
- **`build-games.mjs`** merges cache + `aliases.json` + `overrides.json` into committed data and prints a coverage report.

**Tech Stack:** Node 25 (`.nvmrc`), TypeScript libs loaded by ts-node from `.mjs` scripts, Jest via `next/jest`, macOS `sips` for image resizing (box-art step only; Mac-only is acceptable because box art is fetched once locally and committed).

**Spec:** `docs/superpowers/specs/2026-10-11-snes-dataset-design.md`

## Global Constraints

- Scope is licensed North American retail releases: rows of the Wikipedia list's `id="softwarelist"` table whose **North America** date cell holds a `{{dts}}` template. All other tables are skipped.
- **The site build never calls an outside service.** Only `scripts/snes/fetch-*.mjs` touch the network; `build-games.mjs` runs offline from `.snes-cache/`.
- `.snes-cache/` is gitignored. `data/snes/*.json`, `public/snes/box/*.jpg` and `public/snes/box/SOURCES.md` are committed.
- **Box art is hosted locally, never hotlinked:** 300 px wide JPEG, quality 82, `public/snes/box/<slug>.jpg`.
- `IGDB_CLIENT_ID` / `IGDB_CLIENT_SECRET` live only in `.env.local` (already gitignored by `.env*.local`) and are never committed or printed.
- `lib/snes/*.ts` must stay loadable by ts-node from a plain `.mjs` script:
  - Type-only imports use `import type`.
  - Relative imports carry the `.ts` extension (`./titles.ts`).
  - No `@/` alias imports.
  - No `enum`.
- Fetchers send `User-Agent: wesleybard.com SNES dataset builder (https://wesleybard.com)`, make one request at a time, retry 3 times with backoff on network errors / 429 / 5xx, and skip work already cached unless `--refresh` is passed.
- `build` **fails** (exit 1) when:
  - an override or alias names a slug that doesn't exist
  - an override tries to change a slug
  - two games share a slug
  - a game has no North American publisher
  - two companies share a slug
  - the game count is outside **700–740**

  Everything else is a warning in the coverage report.
- `esrb` is `null` for any game whose `releasedUS` sorts before `"1994-09"` (the ESRB began rating in Sept 1994; later re-ratings of old games don't count).
- **Slugs are permanent.** On rebuild, a game keeps the slug recorded for its Wikipedia article (or title, when it has no article) in the existing `data/snes/games.json`.
- **Spec deviations (agreed in planning):**
  - Enhancement chips come from Wikipedia's *List of Super NES enhancement chips* table, not IGDB, which doesn't record them.
  - `launchTitle` is derived as `releasedUS === "1991-08-23"`, Wikipedia's US launch date, which covers F-Zero, Super Mario World, Pilotwings, Gradius III and SimCity. Overrides can still correct it.
  - Companies come from the Wikipedia list's names, folded through `aliases.json` `companies`. Probable duplicates such as "SETA" / "SETA Corporation" are reported for a human to alias, never merged automatically.
  - The aggregate score is IGDB's `total_rating` (critics plus users, better SNES coverage than critics alone), `null` under 3 ratings.

## Review Focus

1. **An upstream title edit on Wikipedia must not change a slug.** Wes's `wes.json` keys depend on it. Pinned in Task 6 (`keeps the slug from the previous games.json`).
2. **A review box that only has scores for a port** (GBA, Wii, Genesis) must not leak those scores onto the SNES game. Pinned in Task 3 (`drops values tagged for other platforms`, `uses only _SNES keys in a multi-platform box`).
3. **Running without an IGDB key** must still build: IGDB fields null, no unmatched-IGDB noise. Pinned in Task 6 (`builds with no IGDB data`).
4. **An old game IGDB rates "E" from a later re-release** must show pre-ESRB (`null`). Pinned in Task 6 (`clears ESRB before Sept 1994`).
5. **An interrupted review fetch** (rate limit, laptop sleep) must resume without re-downloading. Pinned in Task 3 by writing the cache after every batch and skipping cached articles. Checked manually in Task 3 Step 7.

---

### Task 1: Types and title helpers

**Files:**
- Create: `lib/snes/types.ts`
- Create: `lib/snes/titles.ts`
- Test: `__tests__/snes-titles.test.ts`

**Interfaces:**
- Produces: every type below (used by all later tasks), plus:
  - `normalizeTitle(title: string): string`, the matching key across sources
  - `slugify(title: string): string`
  - `stripDiacritics(s: string): string`

- [ ] **Step 1: Write the types (no test; pure declarations)**

`lib/snes/types.ts`:
```ts
/*
 * Shapes for the /snes dataset. games.json holds facts only; Wes's opinions live in wes.json (piece 3),
 * keyed by the same permanent slug. Spec: docs/superpowers/specs/2026-10-11-snes-dataset-design.md
 */

export type DatePrecision = 'day' | 'month' | 'year';

export type Chip =
  | 'Super FX' | 'Super FX 2' | 'SA-1' | 'DSP-1' | 'DSP-2' | 'DSP-3' | 'DSP-4'
  | 'Cx4' | 'S-DD1' | 'SPC7110' | 'ST010' | 'ST011' | 'ST018' | 'OBC1' | 'S-RTC';

export type Esrb = 'K-A' | 'E' | 'T' | 'M';

export interface NintendoPowerScore {
  score: number;
  scale: 5 | 10 | 20;
}

export interface Scores {
  /** IGDB total_rating, 0–100, rounded; null under 3 ratings. */
  aggregate: number | null;
  aggregateCount: number;
  /** Each EGM reviewer's score out of 10, as printed. */
  egm: number[] | null;
  nintendoPower: NintendoPowerScore | null;
  /** Remaining SNES review-box fields, raw ("GI": "9.5/10", "GR": "96%"). */
  other: Record<string, string>;
}

export interface Game {
  slug: string;
  title: string;
  releasedUS: string;
  datePrecision: DatePrecision;
  developers: string[];
  publisher: string;
  genres: string[];
  players: number | null;
  chip: Chip | null;
  launchTitle: boolean;
  esrb: Esrb | null;
  summary: string | null;
  scores: Scores;
  boxArt: string | null;
  sources: { wikipedia: string | null; igdb: number | null };
}

export interface Company {
  slug: string;
  name: string;
  /** Raw names folded into this company by aliases.json. */
  aliases: string[];
  country: string | null;
}

/** One North American release from Wikipedia's list. */
export interface WikiListRow {
  title: string;
  /** Wikipedia article for the game; null when unlinked or linked to a section of another page. */
  article: string | null;
  developers: string[];
  publisher: string;
  releasedUS: string;
  datePrecision: DatePrecision;
}

export interface ChipRow {
  title: string;
  article: string | null;
  chip: Chip;
}

/** The fields of IGDB's /v4/games we request (see scripts/snes/fetch-igdb.mjs). */
export interface IgdbRaw {
  id: number;
  name: string;
  alternative_names?: { name: string }[];
  genres?: { name: string }[];
  game_modes?: { name: string }[];
  multiplayer_modes?: { platform?: number; offlinemax?: number; offlinecoopmax?: number }[];
  total_rating?: number;
  total_rating_count?: number;
  summary?: string;
  age_ratings?: { organization?: { name?: string } | number; rating_category?: { rating?: string } | number }[];
}

export interface IgdbFacts {
  id: number;
  genres: string[];
  players: number | null;
  esrb: Esrb | null;
  summary: string | null;
  aggregate: number | null;
  aggregateCount: number;
}

export interface Aliases {
  /** slug → IGDB game id, for titles the matcher can't pair. */
  igdb: Record<string, number>;
  /** slug → libretro Named_Boxarts file name. */
  boxart: Record<string, string>;
  /** raw company name → canonical company name. */
  companies: Record<string, string>;
  /** Wikipedia title → slug, to settle a collision or keep a slug through a rename. */
  slugs: Record<string, string>;
}

export type Override = {
  [K in Exclude<keyof Game, 'slug' | 'scores' | 'sources'>]?: Game[K];
} & { scores?: Partial<Scores>; note?: string };

export type Overrides = Record<string, Override>;

export interface CoverageReport {
  games: number;
  companies: number;
  boxArt: number;
  aggregate: number;
  egm: number;
  nintendoPower: number;
  esrb: number;
  /** Games released from Sept 1994, the only ones that can carry an ESRB rating. */
  esrbEligible: number;
  launchTitles: number;
  chips: number;
  igdbFetched: boolean;
  unmatchedIgdb: string[];
  missingBoxArt: string[];
  noArticle: string[];
  possibleDuplicateCompanies: string[][];
}
```

- [ ] **Step 2: Write the failing tests**

`__tests__/snes-titles.test.ts`:
```ts
import { normalizeTitle, slugify, stripDiacritics } from '@/lib/snes/titles';

describe('normalizeTitle', () => {
  test('moves a trailing article and drops a leading "the"', () => {
    expect(normalizeTitle('7th Saga, The (USA)')).toBe('7th saga');
    expect(normalizeTitle('The 7th Saga')).toBe('7th saga');
  });
  test('moves an article that sits before a subtitle', () => {
    expect(normalizeTitle('Legend of Zelda, The - A Link to the Past')).toBe(
      normalizeTitle('The Legend of Zelda: A Link to the Past'),
    );
  });
  test('treats a colon and a spaced dash alike', () => {
    expect(normalizeTitle("Super Mario World 2 - Yoshi's Island")).toBe('super mario world 2 yoshis island');
    expect(normalizeTitle("Super Mario World 2: Yoshi's Island")).toBe('super mario world 2 yoshis island');
  });
  test('turns Roman numerals II–VIII into digits, but leaves X alone', () => {
    expect(normalizeTitle('Street Fighter II Turbo')).toBe('street fighter 2 turbo');
    expect(normalizeTitle('Final Fantasy III')).toBe('final fantasy 3');
    expect(normalizeTitle('Mega Man X')).toBe('mega man x');
  });
  test('unifies "&" and "and", drops region tags and diacritics', () => {
    expect(normalizeTitle('Tetris & Dr. Mario (USA) (Rev 1)')).toBe('tetris and dr mario');
    expect(normalizeTitle('Pokémon Jūma')).toBe('pokemon juma');
  });
});

describe('slugify', () => {
  test('makes URL-safe slugs', () => {
    expect(slugify("Super Mario World 2: Yoshi's Island")).toBe('super-mario-world-2-yoshis-island');
    expect(slugify('Tetris & Dr. Mario')).toBe('tetris-and-dr-mario');
    expect(slugify('A.S.P. Air Strike Patrol')).toBe('a-s-p-air-strike-patrol');
    expect(slugify('Aaahh!!! Real Monsters')).toBe('aaahh-real-monsters');
    expect(slugify('')).toBe('');
  });
});

test('stripDiacritics', () => {
  expect(stripDiacritics('Shōgi')).toBe('Shogi');
});
```

- [ ] **Step 3: Run the tests and confirm they fail**

Run: `npx jest __tests__/snes-titles.test.ts`
Expected: FAIL with "Cannot find module '@/lib/snes/titles'".

- [ ] **Step 4: Implement**

`lib/snes/titles.ts`:
```ts
/*
 * Title helpers shared by every source. normalizeTitle is the matching key between Wikipedia, IGDB and
 * libretro, which spell the same game differently ("7th Saga, The (USA)" vs "The 7th Saga"); slugify makes
 * the permanent URL slug. Loaded by plain Node scripts too: keep imports type-only and extension-explicit.
 */

const ROMAN: Record<string, string> = { ii: '2', iii: '3', iv: '4', v: '5', vi: '6', vii: '7', viii: '8' };

export function stripDiacritics(s: string): string {
  return s.normalize('NFKD').replace(/[̀-ͯ]/g, '');
}

export function normalizeTitle(title: string): string {
  let s = stripDiacritics(title).toLowerCase();
  s = s.replace(/\s*\([^)]*\)/g, ' ');
  s = s.replace(/^([^,]+),\s*(the|a|an)\b/, '$2 $1');
  s = s.replace(/&/g, ' and ');
  s = s.replace(/['’`]/g, '');
  s = s.replace(/[^a-z0-9]+/g, ' ').trim();
  s = s.replace(/^the\s+/, '');
  return s
    .split(' ')
    .map((w) => ROMAN[w] ?? w)
    .join(' ');
}

export function slugify(title: string): string {
  return stripDiacritics(title)
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/['’`]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
```

- [ ] **Step 5: Run the tests and confirm they pass**

Run: `npx jest __tests__/snes-titles.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 6: Commit**

```bash
git add lib/snes/types.ts lib/snes/titles.ts __tests__/snes-titles.test.ts
git commit -m "feat(snes): dataset types and title matching helpers"
```

---

### Task 2: Wikipedia list and chip parsers, plus the list fetcher

**Files:**
- Create: `lib/snes/wikitext.ts` (shared wikitext utilities)
- Create: `lib/snes/wikiList.ts`
- Create: `scripts/snes/lib.mjs` (paths, cache, polite fetch, TS loader)
- Create: `scripts/snes/fetch-wikipedia-list.mjs`
- Modify: `.gitignore` (add `.snes-cache/`)
- Modify: `package.json` scripts
- Test: `__tests__/snes-wikilist.test.ts`

**Interfaces:**
- Consumes: `WikiListRow`, `ChipRow`, `Chip`, `DatePrecision` from `lib/snes/types.ts`.
- Produces:
  - `lib/snes/wikitext.ts`:
    - `stripNoise(s: string): string`
    - `linkText(s: string): string`
    - `splitTopLevel(s: string, sep?: string): string[]`
    - `tableRows(table: string): string[][]`
  - `lib/snes/wikiList.ts`:
    - `parseDts(cell: string): { date: string; precision: DatePrecision } | null`
    - `parseTitleCell(cell: string): { title: string; article: string | null }`
    - `parseSoftwareList(wikitext: string): { rows: WikiListRow[]; skipped: number }`
    - `normalizeChip(raw: string): Chip | null`
    - `parseChipList(wikitext: string): ChipRow[]`
  - `scripts/snes/lib.mjs`:
    - `repoRoot`, `CACHE_DIR`, `DATA_DIR`, `BOX_DIR`, `UA`, `refresh`
    - `sleep(ms)`, `cachePath(name)`, `readJson(file, fallback)`, `writeJson(file, data)`
    - `fetchWithRetry(url, init?, tries?)`, `wikiParse(page)`, `loadTs(relPath)`
  - Cache files: `.snes-cache/wiki-list.wiki` and `.snes-cache/wiki-chips.wiki` (raw wikitext).

- [ ] **Step 1: Write the failing tests**

`__tests__/snes-wikilist.test.ts`. The fixtures are rows copied from the live page on 11 Oct 2026, trimmed:
```ts
import { parseDts, parseTitleCell, parseSoftwareList, parseChipList, normalizeChip } from '@/lib/snes/wikiList';
import { splitTopLevel, linkText, stripNoise } from '@/lib/snes/wikitext';

const LIST = `intro text
{|class="wikitable plainrowheaders sortable sticky-header-multi" id="softwarelist"
|-
!rowspan="2"|Title<ref name="NintendoList">{{cite web |url=http://x |title=Super NES Games}}</ref>
!rowspan="2"|Developer(s)
!rowspan="2"|Publisher(s)
!colspan="3"|Release date
!rowspan="2" class="unsortable"|{{abbr|Ref.|Reference}}
|-
!style="width:12%;"|Japan
!style="width:12%;"|North America
!style="width:12%;"|PAL region
|-
|id="0–9"|''[[3 Ninjas Kick Back (video game)|3 Ninjas Kick Back]]''
|[[Malibu Interactive]]
|[[Sony Imagesoft]]
|{{unreleased}}||{{dts|1994|6}}||{{unreleased}}
|
|-
|''[[3×3 Eyes#Video games|3×3 Eyes Jūma Hōkan]]''
|System Supply N-Tech
|[[Banpresto]]
|{{dts|1995|12|22}}||{{unreleased}}||{{unreleased}}
|
|-
|data-sort-value="7th Saga"|''[[The 7th Saga]]''<br />•''Elnard''<sup>JP</sup>
|[[Produce (company)|Produce]]
|{{vgrtbl|JP|[[Gameplan21]]|NA|[[Enix]]}}
|{{dts|1993|4|23}}||{{dts|1993|9}}||{{unreleased}}
|
|-
|''[[A.S.P. Air Strike Patrol]]''<br />•''Desert Fighter''<sup>PAL</sup>
|Opus
|{{vgrtbl|JP/NA|[[SETA Corporation|SETA]]|PAL|[[System 3 (company)|System 3]]}}
|{{unreleased}}||{{dts|1995|1}}||{{unreleased}}
|
|-
|''[[Super Metroid]]''
||{{hlist|[[Nintendo R&D1]]|[[Intelligent Systems]]}}
|[[Nintendo]]
|{{dts|1994|3|19}}||{{dts|1994|4|18}}||{{dts|1994|7|28}}
|<ref>{{cite web |url=http://gamespot |title=''Super Metroid'' Release}}</ref>
|-
|''Kirby Bundle''
|[[HAL Laboratory]] <small>(''Kirby's Avalanche'' only)</small><br />[[Compile (company)|Compile]]
|[[Nintendo]]
|{{unreleased}}||{{dts|1994|10|}}||{{unreleased}}
|
|-
|''[[Super Bomberman 3]]''
|[[Hudson Soft]]
|[[Hudson Soft]]
|{{dts|1995|4|28}}||{{unreleased}}{{efn|name=Bomberman|Released as part of ''[[Super Bomberman Collection]]'' (2026)}}||{{dts|1995|5}}
|
|}
after`;

describe('parseDts', () => {
  test('reads day, month and year precision, tolerating a trailing empty field', () => {
    expect(parseDts('{{dts|1994|4|18}}')).toEqual({ date: '1994-04-18', precision: 'day' });
    expect(parseDts('{{dts|1994|10|}}')).toEqual({ date: '1994-10', precision: 'month' });
    expect(parseDts('{{dts|1993}}')).toEqual({ date: '1993', precision: 'year' });
    expect(parseDts('{{unreleased}}')).toBeNull();
  });
});

describe('wikitext helpers', () => {
  test('splitTopLevel ignores separators inside links and templates', () => {
    expect(splitTopLevel('JP|[[A|B]]|NA|{{x|y}}')).toEqual(['JP', '[[A|B]]', 'NA', '{{x|y}}']);
    expect(splitTopLevel('{{dts|1993|4}}||{{unreleased}}', '||')).toEqual(['{{dts|1993|4}}', '{{unreleased}}']);
  });
  test('linkText keeps display text and drops italics', () => {
    expect(linkText("''[[Produce (company)|Produce]]''")).toBe('Produce');
  });
  test('stripNoise drops refs, comments, small and sup tags, and efn notes', () => {
    expect(stripNoise('A<ref name="x"/>B<ref>c</ref><!-- d -->C<small>(e)</small><sup>JP</sup>{{efn|f}}')).toBe('ABC');
  });
});

describe('parseSoftwareList', () => {
  const { rows } = parseSoftwareList(LIST);
  const byTitle = Object.fromEntries(rows.map((r) => [r.title, r]));

  test('keeps only rows with a North American date', () => {
    expect(rows.map((r) => r.title)).toEqual([
      '3 Ninjas Kick Back',
      'The 7th Saga',
      'A.S.P. Air Strike Patrol',
      'Super Metroid',
      'Kirby Bundle',
    ]);
  });
  test('reads the article, the NA date and precision', () => {
    expect(byTitle['3 Ninjas Kick Back']).toMatchObject({
      article: '3 Ninjas Kick Back (video game)', releasedUS: '1994-06', datePrecision: 'month',
    });
    expect(byTitle['Super Metroid']).toMatchObject({ releasedUS: '1994-04-18', datePrecision: 'day' });
    expect(byTitle['Kirby Bundle']).toMatchObject({ article: null, releasedUS: '1994-10' });
  });
  test('picks the North American publisher out of a region table', () => {
    expect(byTitle['The 7th Saga'].publisher).toBe('Enix');
    expect(byTitle['A.S.P. Air Strike Patrol'].publisher).toBe('SETA');
  });
  test('reads developers from hlist and line breaks, without the small print', () => {
    expect(byTitle['Super Metroid'].developers).toEqual(['Nintendo R&D1', 'Intelligent Systems']);
    expect(byTitle['Kirby Bundle'].developers).toEqual(['HAL Laboratory', 'Compile']);
  });
  test('throws when the table is missing', () => {
    expect(() => parseSoftwareList('no table here')).toThrow(/softwarelist/);
  });
});

describe('parseTitleCell', () => {
  test('a section link is not the game article', () => {
    expect(parseTitleCell("''[[3×3 Eyes#Video games|3×3 Eyes Jūma Hōkan]]''")).toEqual({
      title: '3×3 Eyes Jūma Hōkan', article: null,
    });
  });
});

describe('chips', () => {
  const CHIPS = `==Super FX==
text
==List of Super NES games with enhancement chips==
{|class="wikitable sortable" width=100%
|-
!Title
!Chip
!Year
!Developer
!Publisher
|-
|''[[Mega Man X2]]'' <sup>NA, PAL</sup><br />''Rockman X2'' <sup>JP</sup>||CX4||1994||[[Capcom]]||Capcom (NA, JP, PAL)
|-
|''[[Pilotwings (video game)|Pilotwings]]''||DSP-1/1B<ref group=note>Attract mode crash.</ref>||1990||[[Nintendo EAD]]||[[Nintendo]]
|-
|''[[Super Mario RPG]]''||SA1||1996||[[Square]]||[[Nintendo]]
|-
|''[[Mystery Game]]''||RTC-9999||1996||X||Y
|}`;
  test('normalizes chip names', () => {
    expect(normalizeChip('Super FX GSU-2')).toBe('Super FX 2');
    expect(normalizeChip('Super FX GSU-1')).toBe('Super FX');
    expect(normalizeChip('SPC7110, RTC-4513')).toBe('SPC7110');
    expect(normalizeChip('OBC-1')).toBe('OBC1');
    expect(normalizeChip('Rockwell RC2324DPL')).toBeNull();
  });
  test('parses the games table, skipping unknown chips', () => {
    expect(parseChipList(CHIPS)).toEqual([
      { title: 'Mega Man X2', article: 'Mega Man X2', chip: 'Cx4' },
      { title: 'Pilotwings', article: 'Pilotwings (video game)', chip: 'DSP-1' },
      { title: 'Super Mario RPG', article: 'Super Mario RPG', chip: 'SA-1' },
    ]);
  });
});
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `npx jest __tests__/snes-wikilist.test.ts`
Expected: FAIL with "Cannot find module '@/lib/snes/wikiList'".

- [ ] **Step 3: Implement the wikitext helpers**

`lib/snes/wikitext.ts`:
```ts
/*
 * Just enough wikitext handling for the SNES tables and review boxes: strip footnotes and markup, read link
 * display text, split on separators that sit outside [[links]] and {{templates}}, and walk table rows.
 */

export function stripNoise(s: string): string {
  return s
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<ref[^>]*\/>/g, '')
    .replace(/<ref[^>]*>[\s\S]*?<\/ref>/g, '')
    .replace(/<small>[\s\S]*?<\/small>/g, '')
    .replace(/<sup>[\s\S]*?<\/sup>/g, '')
    .replace(/\{\{(?:r|efn|sfn|refn)\|[^{}]*\}\}/gi, '')
    .replace(/&nbsp;/g, ' ');
}

export function linkText(s: string): string {
  return s
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2')
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
    .replace(/''+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function splitTopLevel(s: string, sep = '|'): string[] {
  const parts: string[] = [];
  let depth = 0;
  let cur = '';
  for (let i = 0; i < s.length; ) {
    const two = s.slice(i, i + 2);
    if (two === '{{' || two === '[[') {
      depth++;
      cur += two;
      i += 2;
    } else if ((two === '}}' || two === ']]') && depth > 0) {
      depth--;
      cur += two;
      i += 2;
    } else if (depth === 0 && s.startsWith(sep, i)) {
      parts.push(cur);
      cur = '';
      i += sep.length;
    } else {
      cur += s[i];
      i++;
    }
  }
  parts.push(cur);
  return parts;
}

/** The cells of each data row in a wikitable (header rows dropped). Cells may sit one per line or `||`-joined. */
export function tableRows(table: string): string[][] {
  const out: string[][] = [];
  for (const raw of table.split(/\n\|-[^\n]*\n/).slice(1)) {
    const cells: string[] = [];
    let header = false;
    for (const line of raw.split('\n')) {
      if (line.startsWith('!')) {
        header = true;
        break;
      }
      if (line.startsWith('|')) cells.push(...splitTopLevel(line.slice(1), '||'));
      else if (cells.length && line.trim()) cells[cells.length - 1] += '\n' + line;
    }
    if (!header && cells.length) out.push(cells);
  }
  return out;
}

/** Drops leading cell attributes: `id="A"|text` → `text`. */
export function stripCellAttrs(cell: string): string {
  const parts = splitTopLevel(cell);
  if (parts.length > 1 && /^\s*([a-z-]+\s*=\s*"[^"]*"\s*)+$/i.test(parts[0])) return parts.slice(1).join('|');
  return cell;
}
```

- [ ] **Step 4: Implement the list and chip parsers**

`lib/snes/wikiList.ts`:
```ts
/*
 * Parses Wikipedia's "List of Super Nintendo Entertainment System games" (the id="softwarelist" table:
 * title, developers, publishers, JP / NA / PAL dates) and the games table of "List of Super NES enhancement
 * chips". A row counts as a US release when its North America cell holds a {{dts}} date.
 */
import type { Chip, ChipRow, DatePrecision, WikiListRow } from './types.ts';
import { linkText, splitTopLevel, stripCellAttrs, stripNoise, tableRows } from './wikitext.ts';

export function parseDts(cell: string): { date: string; precision: DatePrecision } | null {
  const m = cell.match(/\{\{dts\|(\d{4})(?:\|(\d{1,2})?)?(?:\|(\d{1,2})?)?\s*\}\}/i);
  if (!m) return null;
  const [, y, mo, d] = m;
  const pad = (n: string) => n.padStart(2, '0');
  if (mo && d) return { date: `${y}-${pad(mo)}-${pad(d)}`, precision: 'day' };
  if (mo) return { date: `${y}-${pad(mo)}`, precision: 'month' };
  return { date: y, precision: 'year' };
}

export function parseTitleCell(cell: string): { title: string; article: string | null } {
  const first = stripCellAttrs(cell).split(/<br\s*\/?>/i)[0];
  const link = first.match(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/);
  const title = linkText(first).replace(/^•/, '').trim();
  const article = link && !link[1].includes('#') ? link[1].trim() : null;
  return { title, article };
}

const firstOfHlist = (s: string) => {
  const h = s.match(/\{\{hlist\|([\s\S]*)\}\}/i);
  return h ? splitTopLevel(h[1])[0] : s;
};

function parseDevelopers(cell: string): string[] {
  const c = stripCellAttrs(cell);
  const h = c.match(/\{\{hlist\|([\s\S]*)\}\}/i);
  const parts = h ? splitTopLevel(h[1]) : c.split(/<br\s*\/?>/i);
  return parts.map(linkText).filter(Boolean);
}

function naPublisher(cell: string): string | null {
  const c = stripCellAttrs(cell);
  const v = c.match(/\{\{vgrtbl\|([\s\S]*)\}\}/i);
  if (!v) return linkText(firstOfHlist(c)) || null;
  const parts = splitTopLevel(v[1]);
  for (let i = 0; i + 1 < parts.length; i += 2) {
    const regions = parts[i].split('/').map((r) => r.trim().toUpperCase());
    if (regions.includes('NA')) return linkText(firstOfHlist(parts[i + 1])) || null;
  }
  return null;
}

export function parseSoftwareList(wikitext: string): { rows: WikiListRow[]; skipped: number } {
  const start = wikitext.indexOf('id="softwarelist"');
  if (start < 0) throw new Error('softwarelist table not found — has the Wikipedia page changed shape?');
  const end = wikitext.indexOf('\n|}', start);
  const table = stripNoise(wikitext.slice(start, end < 0 ? undefined : end));
  const rows: WikiListRow[] = [];
  let skipped = 0;
  for (const cells of tableRows(table)) {
    if (cells.length < 6) {
      skipped++;
      continue;
    }
    const na = parseDts(cells[4]);
    if (!na) continue;
    const { title, article } = parseTitleCell(cells[0]);
    rows.push({
      title,
      article,
      developers: parseDevelopers(cells[1]),
      publisher: naPublisher(cells[2]) ?? '',
      releasedUS: na.date,
      datePrecision: na.precision,
    });
  }
  return { rows, skipped };
}

const CHIPS: [RegExp, Chip][] = [
  [/GSU-2/i, 'Super FX 2'],
  [/GSU-1|^Super FX/i, 'Super FX'],
  [/^SA-?1/i, 'SA-1'],
  [/^DSP-1/i, 'DSP-1'],
  [/^DSP-2/i, 'DSP-2'],
  [/^DSP-3/i, 'DSP-3'],
  [/^DSP-4/i, 'DSP-4'],
  [/^CX4/i, 'Cx4'],
  [/^S-DD1/i, 'S-DD1'],
  [/^SPC7110/i, 'SPC7110'],
  [/^ST010/i, 'ST010'],
  [/^ST011/i, 'ST011'],
  [/^ST018/i, 'ST018'],
  [/^OBC-?1/i, 'OBC1'],
  [/^S-RTC/i, 'S-RTC'],
];

export function normalizeChip(raw: string): Chip | null {
  const s = raw.trim();
  for (const [re, chip] of CHIPS) if (re.test(s)) return chip;
  return null;
}

export function parseChipList(wikitext: string): ChipRow[] {
  const head = wikitext.indexOf('==List of Super NES games with enhancement chips==');
  if (head < 0) throw new Error('enhancement chip games table not found — has the Wikipedia page changed shape?');
  const start = wikitext.indexOf('{|', head);
  const end = wikitext.indexOf('\n|}', start);
  const table = stripNoise(wikitext.slice(start, end < 0 ? undefined : end));
  const out: ChipRow[] = [];
  for (const cells of tableRows(table)) {
    if (cells.length < 2) continue;
    const chip = normalizeChip(linkText(cells[1]));
    if (!chip) continue;
    out.push({ ...parseTitleCell(cells[0]), chip });
  }
  return out;
}
```

- [ ] **Step 5: Run the tests and confirm they pass**

Run: `npx jest __tests__/snes-wikilist.test.ts`
Expected: PASS. If the `Kirby Bundle` developers test fails because `<small>` was stripped before the `<br />` split, check that `stripNoise` runs on the whole table first (it does in `parseSoftwareList`). The test exercises the full path.

- [ ] **Step 6: Write the shared script helpers**

`scripts/snes/lib.mjs`:
```js
/**
 * Shared plumbing for the SNES dataset scripts: paths, the .snes-cache/ folder, a polite fetch with
 * retries, Wikipedia's parse API, and loading the tested TypeScript in lib/snes/ (the same ts-node route
 * add-health-week.mjs uses).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

export const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const CACHE_DIR = path.join(repoRoot, '.snes-cache');
export const DATA_DIR = path.join(repoRoot, 'data/snes');
export const BOX_DIR = path.join(repoRoot, 'public/snes/box');
export const UA = 'wesleybard.com SNES dataset builder (https://wesleybard.com)';
export const refresh = process.argv.includes('--refresh');

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function cachePath(name) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  return path.join(CACHE_DIR, name);
}

export function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    if (err.code === 'ENOENT') return fallback;
    throw err;
  }
}

export function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
}

/** Retries network errors, 429 and 5xx with backoff (1s, 2s, 4s); any other non-OK status is final. */
export async function fetchWithRetry(url, init = {}, tries = 4) {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url, {
        ...init,
        headers: { 'User-Agent': UA, ...(init.headers ?? {}) },
        signal: AbortSignal.timeout(30000),
      });
      if (res.status === 429 || res.status >= 500) throw new Error(`HTTP ${res.status} for ${url}`);
      if (!res.ok) throw Object.assign(new Error(`HTTP ${res.status} for ${url}`), { final: true });
      return res;
    } catch (err) {
      if (err.final || attempt >= tries) throw err;
      console.warn(`  retrying (${err.message})`);
      await sleep(1000 * 2 ** (attempt - 1));
    }
  }
}

export async function wikiParse(page) {
  const url =
    'https://en.wikipedia.org/w/api.php?action=parse&prop=wikitext&format=json&formatversion=2&redirects=1&page=' +
    encodeURIComponent(page);
  const body = await (await fetchWithRetry(url)).json();
  if (body.error) throw new Error(`Wikipedia: ${body.error.info}`);
  return body.parse.wikitext;
}

const require = createRequire(import.meta.url);
let registered = false;
/** Loads a TypeScript module from the repo, e.g. loadTs('lib/snes/wikiList.ts'). */
export function loadTs(relPath) {
  if (!registered) {
    require('ts-node/register');
    registered = true;
  }
  return require(path.join(repoRoot, relPath));
}
```

- [ ] **Step 7: Write the list fetcher**

`scripts/snes/fetch-wikipedia-list.mjs`:
```js
#!/usr/bin/env node
/**
 * Saves the raw wikitext of Wikipedia's SNES games list and enhancement-chip list to .snes-cache/,
 * then parses them as a sanity check. Skips pages already cached unless --refresh.
 *
 *   npm run snes:fetch:list [-- --refresh]
 */
import fs from 'fs';
import { cachePath, loadTs, refresh, wikiParse } from './lib.mjs';

const PAGES = {
  'wiki-list.wiki': 'List of Super Nintendo Entertainment System games',
  'wiki-chips.wiki': 'List of Super NES enhancement chips',
};

for (const [file, page] of Object.entries(PAGES)) {
  const out = cachePath(file);
  if (fs.existsSync(out) && !refresh) {
    console.log(`cached  ${page}`);
    continue;
  }
  fs.writeFileSync(out, await wikiParse(page));
  console.log(`fetched ${page}`);
}

const { parseSoftwareList, parseChipList } = loadTs('lib/snes/wikiList.ts');
const { rows, skipped } = parseSoftwareList(fs.readFileSync(cachePath('wiki-list.wiki'), 'utf8'));
const chips = parseChipList(fs.readFileSync(cachePath('wiki-chips.wiki'), 'utf8'));
console.log(`${rows.length} North American releases (${skipped} malformed rows skipped), ${chips.length} chip games`);
```

- [ ] **Step 8: Wire up npm and gitignore**

Append to `.gitignore`:
```
# SNES dataset: raw source responses, rebuilt by npm run snes:fetch
.snes-cache/
```

In `package.json` `"scripts"`, add after `"github:contributions"`:
```json
    "snes:fetch:list": "node scripts/snes/fetch-wikipedia-list.mjs"
```

- [ ] **Step 9: Run it against live Wikipedia**

Run: `npm run snes:fetch:list`
Expected: two `fetched` lines, then about `717 North American releases (0 malformed rows skipped), ~70 chip games`. A count far from 717 means the parser and the live page disagree. Inspect `.snes-cache/wiki-list.wiki` before going on.

- [ ] **Step 10: Commit**

```bash
git add lib/snes/wikitext.ts lib/snes/wikiList.ts scripts/snes/lib.mjs scripts/snes/fetch-wikipedia-list.mjs __tests__/snes-wikilist.test.ts .gitignore package.json
git commit -m "feat(snes): parse Wikipedia's US release list and chip list"
```

---

### Task 3: Review-box parser and the reviews fetcher

**Files:**
- Create: `lib/snes/reviews.ts`
- Create: `scripts/snes/fetch-wiki-reviews.mjs`
- Modify: `package.json` scripts
- Test: `__tests__/snes-reviews.test.ts`

**Interfaces:**
- Consumes:
  - `stripNoise`, `linkText`, `splitTopLevel` from `lib/snes/wikitext.ts`
  - `Scores`, `NintendoPowerScore` from types
  - `parseSoftwareList` (in the script)
- Produces:
  - `extractReviewBox(wikitext: string): string | null`, returning the raw `{{Video game reviews …}}` text
  - `reviewFields(box: string): Record<string, string>`, the SNES-only values keyed by field or reviewer name
  - `snesValue(value: string): string | null`
  - `parseEgm(value: string): number[] | null`
  - `parseNintendoPower(value: string): NintendoPowerScore | null`
  - `reviewScores(fields: Record<string, string>): Pick<Scores, 'egm' | 'nintendoPower' | 'other'>`
  - Cache file: `.snes-cache/reviews.json`, shaped `{ [article: string]: string | null }` (raw box text, or null when the article has none)

- [ ] **Step 1: Write the failing tests**

`__tests__/snes-reviews.test.ts`. The fixtures are trimmed from live articles on 11 Oct 2026:
```ts
import {
  extractReviewBox, reviewFields, snesValue, parseEgm, parseNintendoPower, reviewScores,
} from '@/lib/snes/reviews';

const SUPER_MARIO_WORLD = `{{Infobox video game}}
Text.
{{Video game reviews
| SNES = true
| GBA = true
| GR_SNES = 94.44%<ref>{{cite web |url=http://gamerankings |title=x}}</ref>
| MC_GBA = 92/100
| EGM_GBA = 9/10, 9/10, 9/10
| EGM_SNES = 9/10, 9/10, 9/10, 9/10{{sfn|Harris|1991|p=18}}
| GI_SNES = 10/10
| rev1 = ''[[Nintendo Power]]''
| rev1Score = 4.5/5 (SNES)
}}
More text {{other template}}.`;

const F_ZERO = `{{Video game reviews
| GR = 83% (SNES & Wii)
| GSpot = 8/10 (Wii)
| IGN = 7.5/10 (SNES)
| MM = 90%
| rev1 = ''[[Entertainment Weekly]]''
| rev1Score = A− (SNES)
}}`;

const MORTAL_KOMBAT_II = `{{Video game reviews
| GR = SMD: 86%
| EGM = SNES: 9/10, 8/10, 8/10, 8/10
| Fam = SNES: 8/10, 7/10, 7/10, 6/10<ref>{{cite magazine |last1=Noda |first1=Minoru}}</ref>
| GI = SSAT: 7/10
}}`;

const ACTRAISER = `{{video game reviews
| EGM = 9/10, 8/10,<br/>9/10, 8/10
| TOT = (UK) 91%
}}`;

describe('extractReviewBox', () => {
  test('returns the whole template, nested braces and all', () => {
    const box = extractReviewBox(SUPER_MARIO_WORLD)!;
    expect(box.startsWith('{{Video game reviews')).toBe(true);
    expect(box.endsWith('}}')).toBe(true);
    expect(box).toContain('rev1Score');
    expect(box).not.toContain('More text');
  });
  test('is null when the article has no review box', () => {
    expect(extractReviewBox('{{Infobox video game}} Just prose.')).toBeNull();
  });
});

describe('reviewFields', () => {
  test('uses only _SNES keys in a multi-platform box, plus named reviewers', () => {
    expect(reviewFields(extractReviewBox(SUPER_MARIO_WORLD)!)).toEqual({
      GR: '94.44%',
      EGM: '9/10, 9/10, 9/10, 9/10',
      GI: '10/10',
      'Nintendo Power': '4.5/5',
    });
  });
  test('drops values tagged for other platforms and strips SNES tags', () => {
    expect(reviewFields(F_ZERO)).toEqual({ GR: '83%', IGN: '7.5/10', MM: '90%', 'Entertainment Weekly': 'A−' });
  });
  test('reads platform prefixes', () => {
    expect(reviewFields(MORTAL_KOMBAT_II)).toEqual({
      EGM: '9/10, 8/10, 8/10, 8/10',
      Fam: '8/10, 7/10, 7/10, 6/10',
    });
  });
  test('turns line breaks into spaces and keeps non-platform tags', () => {
    expect(reviewFields(ACTRAISER)).toEqual({ EGM: '9/10, 8/10, 9/10, 8/10', TOT: '(UK) 91%' });
  });
});

describe('score parsers', () => {
  test('snesValue', () => {
    expect(snesValue('SNES: 9/10, GEN: 8/10')).toBe('9/10');
    expect(snesValue('86% (Genesis)')).toBeNull();
  });
  test('parseEgm reads every reviewer', () => {
    expect(parseEgm('9/10, 9.5/10, 9.5/10, 9/10')).toEqual([9, 9.5, 9.5, 9]);
    expect(parseEgm('7.75/10')).toEqual([7.75]);
    expect(parseEgm('A')).toBeNull();
  });
  test('parseNintendoPower keeps its scale', () => {
    expect(parseNintendoPower('4.5/5')).toEqual({ score: 4.5, scale: 5 });
    expect(parseNintendoPower('16 / 20')).toEqual({ score: 16, scale: 20 });
    expect(parseNintendoPower('great')).toBeNull();
    expect(parseNintendoPower('6/5')).toBeNull();
  });
  test('reviewScores splits EGM and Nintendo Power from the rest', () => {
    expect(reviewScores({ EGM: '9/10, 8/10', NP: '3.9/5', GI: '9.5/10' })).toEqual({
      egm: [9, 8], nintendoPower: { score: 3.9, scale: 5 }, other: { GI: '9.5/10' },
    });
    expect(reviewScores({})).toEqual({ egm: null, nintendoPower: null, other: {} });
  });
});
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `npx jest __tests__/snes-reviews.test.ts`
Expected: FAIL with "Cannot find module '@/lib/snes/reviews'".

- [ ] **Step 3: Implement**

`lib/snes/reviews.ts`:
```ts
/*
 * Reads the {{Video game reviews}} box on a game's Wikipedia article down to the SNES version's scores.
 * Boxes come in two dialects: per-platform keys (EGM_SNES, GR_GBA), or plain keys whose values carry a
 * platform tag ("SNES: 9/10", "8/10 (Wii)"). Anything tagged for another platform is dropped, so a port's
 * score never shows up on the SNES game. Nintendo Power has no standard field; it appears as a named
 * reviewer (rev1 = Nintendo Power, rev1Score = 4.5/5).
 */
import type { NintendoPowerScore, Scores } from './types.ts';
import { linkText, splitTopLevel, stripNoise } from './wikitext.ts';

export function extractReviewBox(wikitext: string): string | null {
  const start = wikitext.search(/\{\{\s*video game reviews/i);
  if (start < 0) return null;
  let depth = 0;
  for (let i = start; i < wikitext.length - 1; i++) {
    const two = wikitext.slice(i, i + 2);
    if (two === '{{') {
      depth++;
      i++;
    } else if (two === '}}') {
      depth--;
      i++;
      if (depth === 0) return wikitext.slice(start, i + 1);
    }
  }
  return null;
}

const META = new Set([
  'title', 'subtitle', 'state', 'width', 'align', 'qid', 'na', 'collapsed', 'float', 'headline',
  'italic title', 'noplatform', 'compilation',
]);

const OTHER_PLATFORMS =
  /^(wii|wiiu|wii u|gba|ds|nds|3ds|ios|android|switch|ns|n64|gc|ngc|gb|gbc|smd|md|gen|genesis|sms|gg|scd|segacd|32x|ps|ps1|psx|ps2|ps3|ps4|psp|psn|xbox|x360|xbla|pc|win|mac|arc|arcade|ssat|sat|jag|3do|amiga|dos|cd32|cdi|vc|nes|pce|tg16)$/i;

/** The SNES part of a review value, or null if it's tagged only for other platforms. */
export function snesValue(value: string): string | null {
  let v = value.trim();
  const prefix = v.match(/^([A-Za-z0-9]{2,6}):\s*(.*)$/);
  if (prefix) {
    if (/^snes$/i.test(prefix[1])) v = prefix[2].split(/[,;]?\s+(?=[A-Za-z0-9]{2,6}:\s)/)[0];
    else if (OTHER_PLATFORMS.test(prefix[1])) return null;
  }
  const suffix = v.match(/\(([^)]*)\)\s*$/);
  if (suffix && suffix.index !== undefined && suffix.index > 0) {
    const tags = suffix[1];
    if (/snes|super nes|super nintendo/i.test(tags)) v = v.slice(0, suffix.index);
    else if (tags.split(/[\s,&/]+/).filter(Boolean).every((t) => OTHER_PLATFORMS.test(t))) return null;
  }
  return v.trim() || null;
}

export function reviewFields(box: string): Record<string, string> {
  const body = stripNoise(box).replace(/<br\s*\/?>/gi, ' ');
  const inner = body.replace(/^\{\{\s*video game reviews/i, '').replace(/\}\}\s*$/, '');
  const params: Record<string, string> = {};
  for (const part of splitTopLevel(inner).slice(1)) {
    const eq = part.indexOf('=');
    if (eq < 0) continue;
    const key = part.slice(0, eq).trim();
    const value = linkText(part.slice(eq + 1));
    if (key && value) params[key] = value;
  }
  const multi = Object.keys(params).some((k) => /_SNES$/i.test(k));
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    if (META.has(key.toLowerCase()) || /^true$/i.test(value) || /url$/i.test(key)) continue;
    if (/^rev\d+score$/i.test(key)) continue;
    const rev = key.match(/^rev(\d+)$/i);
    if (rev) {
      const score = params[`rev${rev[1]}Score`] ?? params[`rev${rev[1]}score`];
      const s = score ? snesValue(score) : null;
      if (s) out[value] = s;
      continue;
    }
    let name = key;
    if (multi) {
      const m = key.match(/^(.+)_SNES$/i);
      if (!m) continue;
      name = m[1];
    }
    const s = snesValue(value);
    if (s) out[name] = s;
  }
  return out;
}

export function parseEgm(value: string): number[] | null {
  const scores = Array.from(value.matchAll(/(\d+(?:\.\d+)?)\s*\/\s*10\b/g), (m) => Number(m[1])).filter(
    (n) => n >= 0 && n <= 10,
  );
  return scores.length ? scores : null;
}

export function parseNintendoPower(value: string): NintendoPowerScore | null {
  const m = value.match(/(\d+(?:\.\d+)?)\s*\/\s*(5|10|20)\b/);
  if (!m) return null;
  const score = Number(m[1]);
  const scale = Number(m[2]) as 5 | 10 | 20;
  return score <= scale ? { score, scale } : null;
}

const NP_KEY = /^(np|nintendo power)$/i;

export function reviewScores(fields: Record<string, string>): Pick<Scores, 'egm' | 'nintendoPower' | 'other'> {
  let egm: number[] | null = null;
  let nintendoPower: NintendoPowerScore | null = null;
  const other: Record<string, string> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (key === 'EGM') egm = parseEgm(value);
    else if (NP_KEY.test(key)) nintendoPower = parseNintendoPower(value);
    else other[key] = value;
  }
  return { egm, nintendoPower, other };
}
```

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `npx jest __tests__/snes-reviews.test.ts`
Expected: PASS.

- [ ] **Step 5: Write the reviews fetcher**

The MediaWiki query API returns up to 50 pages per request, so 717 articles take about 15 requests.

`scripts/snes/fetch-wiki-reviews.mjs`:
```js
#!/usr/bin/env node
/**
 * Saves each US game's {{Video game reviews}} box (raw wikitext, or null when the article has none) to
 * .snes-cache/reviews.json, 50 articles per request. The cache is written after every batch, so an
 * interrupted run resumes where it stopped. Needs .snes-cache/wiki-list.wiki (npm run snes:fetch:list).
 *
 *   npm run snes:fetch:reviews [-- --refresh]
 */
import fs from 'fs';
import { cachePath, fetchWithRetry, loadTs, readJson, refresh, sleep, writeJson } from './lib.mjs';

const listFile = cachePath('wiki-list.wiki');
if (!fs.existsSync(listFile)) {
  console.error('No .snes-cache/wiki-list.wiki yet — run npm run snes:fetch:list first.');
  process.exit(1);
}
const { parseSoftwareList } = loadTs('lib/snes/wikiList.ts');
const { extractReviewBox } = loadTs('lib/snes/reviews.ts');

const out = cachePath('reviews.json');
const cache = refresh ? {} : readJson(out, {});
const articles = [...new Set(parseSoftwareList(fs.readFileSync(listFile, 'utf8')).rows.map((r) => r.article))]
  .filter(Boolean)
  .filter((a) => !(a in cache));
console.log(`${articles.length} articles to fetch (${Object.keys(cache).length} cached)`);

for (let i = 0; i < articles.length; i += 50) {
  const batch = articles.slice(i, i + 50);
  const url =
    'https://en.wikipedia.org/w/api.php?action=query&prop=revisions&rvprop=content&rvslots=main' +
    '&format=json&formatversion=2&redirects=1&titles=' +
    encodeURIComponent(batch.join('|'));
  const body = await (await fetchWithRetry(url)).json();
  // Map the API's normalized and redirected titles back to the article names we asked for.
  const back = new Map(batch.map((a) => [a, a]));
  for (const { from, to } of [...(body.query.normalized ?? []), ...(body.query.redirects ?? [])]) {
    for (const [asked, current] of back) if (current === from) back.set(asked, to);
  }
  const content = new Map(
    (body.query.pages ?? []).map((p) => [p.title, p.revisions?.[0]?.slots?.main?.content ?? null]),
  );
  for (const asked of batch) {
    const text = content.get(back.get(asked));
    cache[asked] = text ? extractReviewBox(text) : null;
  }
  writeJson(out, cache);
  console.log(`  ${Math.min(i + 50, articles.length)} / ${articles.length}`);
  await sleep(500);
}

const withBox = Object.values(cache).filter(Boolean).length;
console.log(`review boxes: ${withBox} of ${Object.keys(cache).length} articles`);
```

- [ ] **Step 6: Add the npm script and run it**

In `package.json` `"scripts"`, add:
```json
    "snes:fetch:reviews": "node scripts/snes/fetch-wiki-reviews.mjs"
```

Run: `npm run snes:fetch:reviews`
Expected: about 15 batches, then a line like `review boxes: ~400 of ~709 articles` (the exact number is unknown; record it).

- [ ] **Step 7: Check that an interrupted run resumes**

Run: `npm run snes:fetch:reviews`
Expected: `0 articles to fetch (~709 cached)` and no network batches.

- [ ] **Step 8: Commit**

```bash
git add lib/snes/reviews.ts scripts/snes/fetch-wiki-reviews.mjs __tests__/snes-reviews.test.ts package.json
git commit -m "feat(snes): read EGM, Nintendo Power and other SNES review scores from Wikipedia"
```

---

### Task 4: IGDB mapper and fetcher

**Files:**
- Create: `lib/snes/igdb.ts`
- Create: `scripts/snes/fetch-igdb.mjs`
- Modify: `package.json` scripts
- Modify: `.env.example` (document the two keys)
- Test: `__tests__/snes-igdb.test.ts`

**Interfaces:**
- Consumes: `IgdbRaw`, `IgdbFacts`, `Esrb` from types.
- Produces:
  - `SNES_PLATFORM_ID = 19`
  - `trimSummary(s: string, max?: number): string`
  - `mapIgdbGame(raw: IgdbRaw): IgdbFacts`
  - Cache file: `.snes-cache/igdb.json`, shaped `IgdbRaw[]` (every IGDB game on platform 19)

- [ ] **Step 1: Write the failing tests**

`__tests__/snes-igdb.test.ts`:
```ts
import { mapIgdbGame, trimSummary } from '@/lib/snes/igdb';
import type { IgdbRaw } from '@/lib/snes/types';

const base: IgdbRaw = { id: 1103, name: 'Super Metroid' };

test('maps genres, rounded aggregate and count', () => {
  expect(
    mapIgdbGame({ ...base, genres: [{ name: 'Platform' }, { name: 'Adventure' }], total_rating: 91.6, total_rating_count: 41 }),
  ).toMatchObject({ id: 1103, genres: ['Platform', 'Adventure'], aggregate: 92, aggregateCount: 41 });
});

test('aggregate is null under 3 ratings', () => {
  expect(mapIgdbGame({ ...base, total_rating: 80, total_rating_count: 2 })).toMatchObject({ aggregate: null, aggregateCount: 2 });
  expect(mapIgdbGame(base)).toMatchObject({ aggregate: null, aggregateCount: 0 });
});

test('players: the largest offline count on the SNES, else 1 for single-player, else unknown', () => {
  expect(mapIgdbGame({ ...base, multiplayer_modes: [{ platform: 19, offlinemax: 4 }, { platform: 6, offlinemax: 8 }] }).players).toBe(4);
  expect(mapIgdbGame({ ...base, multiplayer_modes: [{ offlinecoopmax: 2 }] }).players).toBe(2);
  expect(mapIgdbGame({ ...base, game_modes: [{ name: 'Single player' }] }).players).toBe(1);
  expect(mapIgdbGame(base).players).toBeNull();
});

test('ESRB from expanded age ratings; other boards and unknown ratings ignored', () => {
  const rating = (org: string, r: string) => ({ organization: { name: org }, rating_category: { rating: r } });
  expect(mapIgdbGame({ ...base, age_ratings: [rating('PEGI', '12'), rating('ESRB', 'T')] }).esrb).toBe('T');
  expect(mapIgdbGame({ ...base, age_ratings: [rating('ESRB', 'K-A')] }).esrb).toBe('K-A');
  expect(mapIgdbGame({ ...base, age_ratings: [rating('ESRB', 'E10+')] }).esrb).toBeNull();
  expect(mapIgdbGame({ ...base, age_ratings: [{ organization: 1, rating_category: 8 }] }).esrb).toBeNull();
});

test('trimSummary cuts at a sentence boundary under the limit', () => {
  const s = 'First sentence here. ' + 'Second sentence is longer. '.repeat(30);
  const t = trimSummary(s, 100);
  expect(t.length).toBeLessThanOrEqual(100);
  expect(t.endsWith('.')).toBe(true);
  expect(trimSummary('Short.', 400)).toBe('Short.');
  expect(trimSummary('x'.repeat(50) + ' ' + 'y'.repeat(80), 100)).toBe('x'.repeat(50) + '…');
});
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `npx jest __tests__/snes-igdb.test.ts`
Expected: FAIL with "Cannot find module '@/lib/snes/igdb'".

- [ ] **Step 3: Implement**

`lib/snes/igdb.ts`:
```ts
/*
 * Maps an IGDB game record to the facts games.json takes from IGDB: genres, max players on the SNES,
 * ESRB rating, a trimmed summary and the aggregate (total_rating: critics and users, 0–100).
 */
import type { Esrb, IgdbFacts, IgdbRaw } from './types.ts';

export const SNES_PLATFORM_ID = 19;
const MIN_RATINGS = 3;
const ESRB_RATINGS = new Set<Esrb>(['K-A', 'E', 'T', 'M']);

export function trimSummary(s: string, max = 400): string {
  const t = s.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const end = cut.lastIndexOf('. ');
  if (end > max / 2) return cut.slice(0, end + 1);
  return cut.slice(0, max - 1).replace(/\s+\S*$/, '') + '…';
}

function esrbOf(raw: IgdbRaw): Esrb | null {
  for (const r of raw.age_ratings ?? []) {
    const org = typeof r.organization === 'object' ? r.organization.name : undefined;
    const rating = typeof r.rating_category === 'object' ? r.rating_category.rating : undefined;
    if (org !== 'ESRB' || !rating) continue;
    const up = rating.toUpperCase().replace(/\s/g, '');
    const value = (up === 'KA' ? 'K-A' : up) as Esrb;
    return ESRB_RATINGS.has(value) ? value : null;
  }
  return null;
}

function playersOf(raw: IgdbRaw): number | null {
  const modes = (raw.multiplayer_modes ?? []).filter((m) => m.platform === undefined || m.platform === SNES_PLATFORM_ID);
  const max = Math.max(0, ...modes.map((m) => Math.max(m.offlinemax ?? 0, m.offlinecoopmax ?? 0)));
  if (max >= 2) return max;
  return (raw.game_modes ?? []).some((g) => /single/i.test(g.name)) ? 1 : null;
}

export function mapIgdbGame(raw: IgdbRaw): IgdbFacts {
  const count = raw.total_rating_count ?? 0;
  return {
    id: raw.id,
    genres: (raw.genres ?? []).map((g) => g.name),
    players: playersOf(raw),
    esrb: esrbOf(raw),
    summary: raw.summary ? trimSummary(raw.summary) : null,
    aggregate: count >= MIN_RATINGS && raw.total_rating !== undefined ? Math.round(raw.total_rating) : null,
    aggregateCount: count,
  };
}
```

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `npx jest __tests__/snes-igdb.test.ts`
Expected: PASS.

- [ ] **Step 5: Write the IGDB fetcher**

`scripts/snes/fetch-igdb.mjs`:
```js
#!/usr/bin/env node
/**
 * Saves every IGDB game on the SNES (platform 19) to .snes-cache/igdb.json, 500 per request.
 * Needs IGDB_CLIENT_ID and IGDB_CLIENT_SECRET in .env.local (a free Twitch developer app:
 * https://dev.twitch.tv/console). Without them it explains and exits 0, so the rest of the pipeline runs.
 *
 *   npm run snes:fetch:igdb [-- --refresh]
 */
import fs from 'fs';
import path from 'path';
import { cachePath, fetchWithRetry, refresh, repoRoot, sleep, writeJson } from './lib.mjs';

const envFile = path.join(repoRoot, '.env.local');
if (fs.existsSync(envFile)) process.loadEnvFile(envFile);
const { IGDB_CLIENT_ID: id, IGDB_CLIENT_SECRET: secret } = process.env;
const out = cachePath('igdb.json');

if (!id || !secret) {
  console.log('IGDB skipped: add IGDB_CLIENT_ID and IGDB_CLIENT_SECRET to .env.local (see .env.example). ' +
    'The build still runs, with genres, players, ESRB, summaries and aggregate scores left empty.');
  process.exit(0);
}
if (fs.existsSync(out) && !refresh) {
  console.log('cached  IGDB (pass --refresh to fetch again)');
  process.exit(0);
}

const tokenUrl =
  `https://id.twitch.tv/oauth2/token?client_id=${encodeURIComponent(id)}` +
  `&client_secret=${encodeURIComponent(secret)}&grant_type=client_credentials`;
const { access_token: token } = await (await fetchWithRetry(tokenUrl, { method: 'POST' })).json();

const FIELDS = [
  'name', 'alternative_names.name', 'genres.name', 'game_modes.name',
  'multiplayer_modes.platform', 'multiplayer_modes.offlinemax', 'multiplayer_modes.offlinecoopmax',
  'total_rating', 'total_rating_count', 'summary',
  'age_ratings.organization.name', 'age_ratings.rating_category.rating',
].join(',');

const games = [];
for (let offset = 0; ; offset += 500) {
  const res = await fetchWithRetry('https://api.igdb.com/v4/games', {
    method: 'POST',
    headers: { 'Client-ID': id, Authorization: `Bearer ${token}`, Accept: 'application/json' },
    body: `fields ${FIELDS}; where platforms = (19); sort id asc; limit 500; offset ${offset};`,
  });
  const page = await res.json();
  games.push(...page);
  console.log(`  ${games.length} games`);
  if (page.length < 500) break;
  await sleep(300); // IGDB allows 4 requests a second
}
writeJson(out, games);
console.log(`IGDB: ${games.length} SNES games cached`);
```

- [ ] **Step 6: Document the keys and add the npm script**

Append to `.env.example`:
```
# SNES dataset: a free Twitch developer app (https://dev.twitch.tv/console), used by npm run snes:fetch:igdb.
# Put real values in .env.local, never here.
IGDB_CLIENT_ID=
IGDB_CLIENT_SECRET=
```

In `package.json` `"scripts"`, add:
```json
    "snes:fetch:igdb": "node scripts/snes/fetch-igdb.mjs"
```

- [ ] **Step 7: Run it**

Run: `npm run snes:fetch:igdb`
Expected:
- **Without keys:** the "IGDB skipped" message, exit code 0.
- **With keys:** about 2,000–4,000 games cached, since IGDB lists Japanese and European SNES games too. If IGDB rejects a field name (HTTP 400), print the response body, then fix `FIELDS` against https://api-docs.igdb.com/#game and the `IgdbRaw` type together.

- [ ] **Step 8: Commit**

```bash
git add lib/snes/igdb.ts scripts/snes/fetch-igdb.mjs __tests__/snes-igdb.test.ts package.json .env.example
git commit -m "feat(snes): IGDB genres, players, ESRB, summaries and aggregate scores"
```

---

### Task 5: Box-art matcher

**Files:**
- Create: `lib/snes/boxart.ts`
- Test: `__tests__/snes-boxart.test.ts`

**Interfaces:**
- Consumes: `normalizeTitle` from `lib/snes/titles.ts`.
- Produces:
  - `LIBRETRO_RAW = 'https://raw.githubusercontent.com/libretro-thumbnails/Nintendo_-_Super_Nintendo_Entertainment_System/master/Named_Boxarts/'`
  - `parseLibretroName(file: string): { file: string; key: string; rank: number } | null`
  - `indexBoxart(paths: string[]): Map<string, string>`, mapping a normalized title to the best US file name

- [ ] **Step 1: Write the failing tests**

`__tests__/snes-boxart.test.ts`. The file names are real libretro names from 11 Oct 2026:
```ts
import { indexBoxart, parseLibretroName } from '@/lib/snes/boxart';
import { normalizeTitle } from '@/lib/snes/titles';

const PATHS = [
  'Named_Boxarts/7th Saga, The (USA).png',
  'Named_Boxarts/F-Zero (Europe).png',
  'Named_Boxarts/F-Zero (USA).png',
  'Named_Boxarts/F-Zero (USA, Europe) (Virtual Console, Classic Mini, Switch Online).png',
  "Named_Boxarts/Super Mario World 2 - Yoshi's Island (USA) (Rev 1).png",
  "Named_Boxarts/Super Mario World 2 - Yoshi's Island (USA).png",
  'Named_Boxarts/Super Metroid (Japan, USA) (En,Ja).png',
  'Named_Boxarts/Super Metroid - Redux (USA).png',
  'Named_Boxarts/Tetris _ Dr. Mario (USA).png',
  'Named_Boxarts/Street Fighter II (USA) (Beta).png',
  'Named_Boxarts/2020 Super Baseball (Japan).png',
];

test('only US, non-reissue, non-prototype art qualifies', () => {
  expect(parseLibretroName('Named_Boxarts/F-Zero (Europe).png')).toBeNull();
  expect(parseLibretroName('Named_Boxarts/F-Zero (USA, Europe) (Virtual Console, Classic Mini, Switch Online).png')).toBeNull();
  expect(parseLibretroName('Named_Boxarts/Street Fighter II (USA) (Beta).png')).toBeNull();
  expect(parseLibretroName('Named_Boxarts/Super Metroid (Japan, USA) (En,Ja).png')).toMatchObject({ key: 'super metroid' });
});

test('indexes the best US file per title', () => {
  const index = indexBoxart(PATHS);
  expect(index.get(normalizeTitle('The 7th Saga'))).toBe('7th Saga, The (USA).png');
  expect(index.get(normalizeTitle('F-Zero'))).toBe('F-Zero (USA).png');
  expect(index.get(normalizeTitle("Super Mario World 2: Yoshi's Island"))).toBe("Super Mario World 2 - Yoshi's Island (USA).png");
  expect(index.get(normalizeTitle('Super Metroid'))).toBe('Super Metroid (Japan, USA) (En,Ja).png');
  expect(index.get(normalizeTitle('Tetris & Dr. Mario'))).toBe('Tetris _ Dr. Mario (USA).png');
  expect(index.has(normalizeTitle('Street Fighter II'))).toBe(false);
});
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `npx jest __tests__/snes-boxart.test.ts`
Expected: FAIL with "Cannot find module '@/lib/snes/boxart'".

- [ ] **Step 3: Implement**

`lib/snes/boxart.ts`:
```ts
/*
 * Picks US box art from libretro-thumbnails' No-Intro-named files ("7th Saga, The (USA).png"). libretro
 * swaps characters filenames can't hold for "_", so "Tetris _ Dr. Mario" is "Tetris & Dr. Mario".
 * Reissues (Virtual Console, Classic Mini), betas, prototypes and hacks never qualify; a plain "(USA)"
 * beats a shared region, and an original printing beats a revision.
 */
import { normalizeTitle } from './titles.ts';

export const LIBRETRO_RAW =
  'https://raw.githubusercontent.com/libretro-thumbnails/Nintendo_-_Super_Nintendo_Entertainment_System/master/Named_Boxarts/';

const EXCLUDE = /virtual console|classic mini|switch online|beta|proto|sample|demo|pirate|unl|hack|aftermarket|competition/i;

export function parseLibretroName(file: string): { file: string; key: string; rank: number } | null {
  const base = file.replace(/^.*\//, '').replace(/\.png$/i, '');
  const at = base.indexOf(' (');
  if (at < 0) return null;
  const tags = (base.slice(at).match(/\(([^)]*)\)/g) ?? []).map((t) => t.slice(1, -1));
  const region = tags[0] ?? '';
  if (!/\bUSA\b/.test(region) || tags.some((t) => EXCLUDE.test(t))) return null;
  const rank = (region === 'USA' ? 2 : 1) + (tags.some((t) => /^Rev\b/.test(t)) ? 0 : 0.5);
  return { file: `${base}.png`, key: normalizeTitle(base.slice(0, at).replace(/ _ /g, ' & ')), rank };
}

export function indexBoxart(paths: string[]): Map<string, string> {
  const best = new Map<string, { file: string; rank: number }>();
  for (const p of paths) {
    const entry = parseLibretroName(p);
    if (!entry) continue;
    const cur = best.get(entry.key);
    if (!cur || entry.rank > cur.rank) best.set(entry.key, entry);
  }
  return new Map(Array.from(best, ([key, e]) => [key, e.file]));
}
```

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `npx jest __tests__/snes-boxart.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/snes/boxart.ts __tests__/snes-boxart.test.ts
git commit -m "feat(snes): match US box art in libretro-thumbnails"
```

---

### Task 6: Merge and build

**Files:**
- Create: `lib/snes/build.ts`
- Create: `scripts/snes/build-games.mjs`
- Create: `data/snes/aliases.json`, `data/snes/overrides.json`
- Modify: `package.json` scripts
- Test: `__tests__/snes-build.test.ts`

**Interfaces:**
- Consumes:
  - all types
  - `normalizeTitle`, `slugify` (titles)
  - `reviewFields`, `reviewScores` (reviews)
  - `mapIgdbGame` (igdb)
  - `parseSoftwareList`, `parseChipList` (in the script)
- Produces:
  - `ESRB_START = '1994-09'`, `LAUNCH_DAY = '1991-08-23'`, `GAME_COUNT_RANGE: [number, number] = [700, 740]`
  - `companyKey(name: string): string`
  - `buildDataset(input: BuildInputs): { games: Game[]; companies: Company[]; report: CoverageReport; errors: string[] }`
  - `formatReport(r: CoverageReport): string`
  - `interface BuildInputs { list: WikiListRow[]; chips: ChipRow[]; reviewBoxes: Record<string, string | null>; igdb: IgdbRaw[] | null; aliases: Aliases; overrides: Overrides; previous: Game[]; hasBoxArt: (slug: string) => boolean; countRange?: [number, number] }`
  - Files: `data/snes/games.json` (`Game[]`) and `data/snes/companies.json` (`Company[]`)

- [ ] **Step 1: Write the failing tests**

`__tests__/snes-build.test.ts`:
```ts
import { buildDataset, companyKey, formatReport, type BuildInputs } from '@/lib/snes/build';
import type { WikiListRow, IgdbRaw, Game } from '@/lib/snes/types';

const row = (title: string, over: Partial<WikiListRow> = {}): WikiListRow => ({
  title, article: title, developers: ['Nintendo EAD'], publisher: 'Nintendo',
  releasedUS: '1991-08-23', datePrecision: 'day', ...over,
});

const inputs = (over: Partial<BuildInputs> = {}): BuildInputs => ({
  list: [
    row('F-Zero'),
    row('Super Metroid', { developers: ['Nintendo R&D1', 'Intelligent Systems'], releasedUS: '1994-04-18' }),
    row('Donkey Kong Country', { developers: ['Rare'], releasedUS: '1994-11-21' }),
  ],
  chips: [{ title: 'Super Metroid', article: null, chip: 'SA-1' }],
  reviewBoxes: { 'Super Metroid': '{{Video game reviews\n| EGM = 9/10, 9/10, 9/10, 9/10\n| GI = 9.5/10\n}}' },
  igdb: [
    { id: 1, name: 'F-Zero', total_rating: 80.4, total_rating_count: 30, age_ratings: [{ organization: { name: 'ESRB' }, rating_category: { rating: 'E' } }] },
    { id: 2, name: 'Metroid 3', alternative_names: [{ name: 'Super Metroid' }], total_rating: 93, total_rating_count: 50 },
    { id: 3, name: 'Donkey Kong Country', age_ratings: [{ organization: { name: 'ESRB' }, rating_category: { rating: 'K-A' } }] },
  ] as IgdbRaw[],
  aliases: { igdb: {}, boxart: {}, companies: {}, slugs: {} },
  overrides: {},
  previous: [],
  hasBoxArt: (slug) => slug !== 'donkey-kong-country',
  countRange: [1, 10],
  ...over,
});

test('merges every source into a game record', () => {
  const { games, errors } = buildDataset(inputs());
  expect(errors).toEqual([]);
  const sm = games.find((g) => g.slug === 'super-metroid')!;
  expect(sm).toMatchObject({
    title: 'Super Metroid', developers: ['nintendo-r-and-d1', 'intelligent-systems'], publisher: 'nintendo',
    chip: 'SA-1', launchTitle: false, boxArt: '/snes/box/super-metroid.jpg',
    sources: { wikipedia: 'Super Metroid', igdb: 2 },
  });
  expect(sm.scores).toEqual({ aggregate: 93, aggregateCount: 50, egm: [9, 9, 9, 9], nintendoPower: null, other: { GI: '9.5/10' } });
});

test('sorts by release date and marks launch-day games', () => {
  const { games } = buildDataset(inputs());
  expect(games.map((g) => g.slug)).toEqual(['f-zero', 'super-metroid', 'donkey-kong-country']);
  expect(games[0].launchTitle).toBe(true);
});

test('clears ESRB before Sept 1994', () => {
  const { games } = buildDataset(inputs());
  expect(games.find((g) => g.slug === 'f-zero')!.esrb).toBeNull();
  expect(games.find((g) => g.slug === 'donkey-kong-country')!.esrb).toBe('K-A');
});

test('builds with no IGDB data', () => {
  const { games, report, errors } = buildDataset(inputs({ igdb: null }));
  expect(errors).toEqual([]);
  expect(games.every((g) => g.scores.aggregate === null && g.genres.length === 0 && g.sources.igdb === null)).toBe(true);
  expect(report.igdbFetched).toBe(false);
  expect(report.unmatchedIgdb).toEqual([]);
});

test('keeps the slug from the previous games.json when the title changes upstream', () => {
  const previous = [{ slug: 'f-zero', title: 'F-Zero', sources: { wikipedia: 'F-Zero', igdb: 1 } }] as Game[];
  const list = [row('F-ZERO', { article: 'F-Zero' })];
  const { games } = buildDataset(inputs({ list, previous }));
  expect(games[0]).toMatchObject({ slug: 'f-zero', title: 'F-ZERO' });
});

test('applies overrides last, and refuses unknown slugs and slug changes', () => {
  const ok = buildDataset(inputs({ overrides: { 'f-zero': { players: 1, scores: { nintendoPower: { score: 4, scale: 5 } }, note: 'NP Sept 1991' } } }));
  const fz = ok.games.find((g) => g.slug === 'f-zero')!;
  expect(fz.players).toBe(1);
  expect(fz.scores.nintendoPower).toEqual({ score: 4, scale: 5 });
  expect(fz.scores.aggregate).toBe(80);
  expect(fz).not.toHaveProperty('note');

  expect(buildDataset(inputs({ overrides: { 'no-such-game': { players: 2 } } })).errors[0]).toMatch(/no-such-game/);
  expect(buildDataset(inputs({ overrides: { 'f-zero': { slug: 'fzero' } as never } })).errors[0]).toMatch(/slug/);
});

test('fails on a slug collision, an alias for a missing game, a missing publisher, or a bad count', () => {
  expect(buildDataset(inputs({ list: [row('F-Zero'), row('F Zero', { article: 'Other' })] })).errors[0]).toMatch(/collision/);
  expect(buildDataset(inputs({ aliases: { igdb: { ghost: 9 }, boxart: {}, companies: {}, slugs: {} } })).errors[0]).toMatch(/ghost/);
  expect(buildDataset(inputs({ list: [row('F-Zero', { publisher: '' })] })).errors[0]).toMatch(/publisher/);
  expect(buildDataset(inputs({ countRange: [700, 740] })).errors[0]).toMatch(/700/);
});

test('aliases.json can pin an IGDB id, fold companies and settle a slug', () => {
  const { games, companies } = buildDataset(inputs({
    aliases: { igdb: { 'f-zero': 2 }, boxart: {}, companies: { 'Nintendo EAD': 'Nintendo' }, slugs: { 'Donkey Kong Country': 'dkc' } },
  }));
  expect(games.find((g) => g.slug === 'f-zero')!.sources.igdb).toBe(2);
  expect(games.find((g) => g.slug === 'f-zero')!.developers).toEqual(['nintendo']);
  expect(games.some((g) => g.slug === 'dkc')).toBe(true);
  expect(companies.find((c) => c.slug === 'nintendo')).toEqual({ slug: 'nintendo', name: 'Nintendo', aliases: ['Nintendo EAD'], country: null });
});

test('reports coverage, unmatched titles and likely duplicate companies', () => {
  const list = [...inputs().list, row('Mystery Cart', { article: null, publisher: 'SETA Corporation' }), row('Other', { publisher: 'SETA' })];
  const { report } = buildDataset(inputs({ list }));
  expect(report).toMatchObject({ games: 5, boxArt: 4, aggregate: 2, egm: 1, launchTitles: 3, chips: 1, igdbFetched: true });
  expect(report.unmatchedIgdb).toEqual(['Mystery Cart', 'Other']);
  expect(report.missingBoxArt).toEqual(['Donkey Kong Country']);
  expect(report.noArticle).toEqual(['Mystery Cart']);
  expect(report.possibleDuplicateCompanies).toEqual([['SETA', 'SETA Corporation']]);
  expect(formatReport(report)).toMatch(/5 games/);
});

test('companyKey ignores corporate suffixes', () => {
  expect(companyKey('SETA Corporation')).toBe(companyKey('SETA'));
  expect(companyKey('Konami')).not.toBe(companyKey('Kemco'));
});
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `npx jest __tests__/snes-build.test.ts`
Expected: FAIL with "Cannot find module '@/lib/snes/build'".

- [ ] **Step 3: Implement**

`lib/snes/build.ts`:
```ts
/*
 * Merges the cached sources into games.json and companies.json. Wikipedia's list is the spine (which games,
 * dates, developers, publisher); IGDB, review boxes, the chip list and box art join by article or by
 * normalizeTitle. aliases.json settles what matching can't, and overrides.json is applied last, so
 * re-running never loses a hand correction. Pure: the script does all reading and writing.
 */
import type {
  Aliases, ChipRow, Company, CoverageReport, Game, IgdbRaw, Override, Overrides, WikiListRow,
} from './types.ts';
import { normalizeTitle, slugify } from './titles.ts';
import { reviewFields, reviewScores } from './reviews.ts';
import { mapIgdbGame } from './igdb.ts';

export const ESRB_START = '1994-09';
export const LAUNCH_DAY = '1991-08-23';
export const GAME_COUNT_RANGE: [number, number] = [700, 740];

export interface BuildInputs {
  list: WikiListRow[];
  chips: ChipRow[];
  reviewBoxes: Record<string, string | null>;
  igdb: IgdbRaw[] | null;
  aliases: Aliases;
  overrides: Overrides;
  previous: Game[];
  hasBoxArt: (slug: string) => boolean;
  countRange?: [number, number];
}

const SUFFIX = /\b(inc|corp|corporation|co|ltd|limited|company|software|entertainment|games|interactive|of america|usa)\b/g;

export function companyKey(name: string): string {
  return normalizeTitle(name).replace(SUFFIX, ' ').replace(/\s+/g, ' ').trim();
}

const byCount = (a: IgdbRaw, b: IgdbRaw | undefined) => !b || (a.total_rating_count ?? 0) > (b.total_rating_count ?? 0);

export function buildDataset(input: BuildInputs) {
  const errors: string[] = [];
  const { aliases } = input;
  const [lo, hi] = input.countRange ?? GAME_COUNT_RANGE;
  const companyName = (raw: string) => aliases.companies[raw] ?? raw;
  const prevKey = (wikipedia: string | null, title: string) => wikipedia ?? `title:${title}`;
  const prevSlug = new Map(input.previous.map((g) => [prevKey(g.sources.wikipedia, g.title), g.slug]));

  const igdbById = new Map<number, IgdbRaw>();
  const igdbPrimary = new Map<string, IgdbRaw>();
  const igdbAlt = new Map<string, IgdbRaw>();
  for (const raw of input.igdb ?? []) {
    igdbById.set(raw.id, raw);
    const key = normalizeTitle(raw.name);
    if (byCount(raw, igdbPrimary.get(key))) igdbPrimary.set(key, raw);
    for (const alt of raw.alternative_names ?? []) {
      const k = normalizeTitle(alt.name);
      if (byCount(raw, igdbAlt.get(k))) igdbAlt.set(k, raw);
    }
  }

  const chipByArticle = new Map<string, ChipRow['chip']>();
  const chipByKey = new Map<string, ChipRow['chip']>();
  for (const c of input.chips) {
    if (c.article) chipByArticle.set(c.article, c.chip);
    chipByKey.set(normalizeTitle(c.title), c.chip);
  }

  const games: Game[] = [];
  const titleOf = new Map<string, string>();
  const unmatchedIgdb: string[] = [];
  const noArticle: string[] = [];

  for (const row of input.list) {
    const slug = aliases.slugs[row.title] ?? prevSlug.get(prevKey(row.article, row.title)) ?? slugify(row.title);
    if (titleOf.has(slug)) {
      errors.push(`slug collision: "${slug}" for "${titleOf.get(slug)}" and "${row.title}" — settle it in aliases.json "slugs"`);
      continue;
    }
    titleOf.set(slug, row.title);
    const key = normalizeTitle(row.title);
    const pinned = aliases.igdb[slug];
    const igdbRaw = pinned !== undefined ? igdbById.get(pinned) : igdbPrimary.get(key) ?? igdbAlt.get(key);
    if (input.igdb && !igdbRaw) unmatchedIgdb.push(row.title);
    if (!row.article) noArticle.push(row.title);
    const facts = igdbRaw ? mapIgdbGame(igdbRaw) : null;
    const box = row.article ? input.reviewBoxes[row.article] ?? null : null;

    games.push({
      slug,
      title: row.title,
      releasedUS: row.releasedUS,
      datePrecision: row.datePrecision,
      developers: row.developers.map((d) => slugify(companyName(d))),
      publisher: slugify(companyName(row.publisher)),
      genres: facts?.genres ?? [],
      players: facts?.players ?? null,
      chip: (row.article ? chipByArticle.get(row.article) : undefined) ?? chipByKey.get(key) ?? null,
      launchTitle: row.releasedUS === LAUNCH_DAY,
      esrb: facts?.esrb ?? null,
      summary: facts?.summary ?? null,
      scores: { aggregate: facts?.aggregate ?? null, aggregateCount: facts?.aggregateCount ?? 0, ...reviewScores(box ? reviewFields(box) : {}) },
      boxArt: input.hasBoxArt(slug) ? `/snes/box/${slug}.jpg` : null,
      sources: { wikipedia: row.article, igdb: igdbRaw?.id ?? null },
    });
  }

  const bySlug = new Map(games.map((g) => [g.slug, g]));
  for (const [slug, override] of Object.entries(input.overrides)) {
    const game = bySlug.get(slug);
    if (!game) {
      errors.push(`overrides.json names "${slug}", which is not a game`);
      continue;
    }
    if ('slug' in override) {
      errors.push(`overrides.json "${slug}" tries to change the slug — slugs are permanent; use aliases.json "slugs" for a collision`);
      continue;
    }
    const { note: _note, scores, ...fields } = override as Override;
    Object.assign(game, fields);
    if (scores) game.scores = { ...game.scores, ...scores };
  }
  for (const kind of ['igdb', 'boxart'] as const) {
    for (const slug of Object.keys(aliases[kind])) {
      if (!bySlug.has(slug)) errors.push(`aliases.json "${kind}" names "${slug}", which is not a game`);
    }
  }
  for (const game of games) {
    if (game.releasedUS < ESRB_START) game.esrb = null;
    if (!game.publisher) errors.push(`"${game.title}" has no North American publisher`);
  }
  if (games.length < lo || games.length > hi) {
    errors.push(`${games.length} games is outside ${lo}–${hi} — the Wikipedia list probably changed shape`);
  }
  games.sort((a, b) => (a.releasedUS === b.releasedUS ? a.title.localeCompare(b.title) : a.releasedUS < b.releasedUS ? -1 : 1));

  const raws = new Map<string, Set<string>>();
  for (const row of input.list) {
    for (const raw of [...row.developers, row.publisher]) {
      if (!raw) continue;
      const name = companyName(raw);
      if (!raws.has(name)) raws.set(name, new Set());
      if (raw !== name) raws.get(name)!.add(raw);
    }
  }
  const companies: Company[] = Array.from(raws, ([name, set]) => ({ slug: slugify(name), name, aliases: [...set].sort(), country: null }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const companySlugs = new Map<string, string>();
  for (const c of companies) {
    if (companySlugs.has(c.slug)) errors.push(`companies "${companySlugs.get(c.slug)}" and "${c.name}" share the slug "${c.slug}" — fold one into the other in aliases.json "companies"`);
    companySlugs.set(c.slug, c.name);
  }
  const groups = new Map<string, string[]>();
  for (const c of companies) groups.set(companyKey(c.name), [...(groups.get(companyKey(c.name)) ?? []), c.name]);

  const report: CoverageReport = {
    games: games.length,
    companies: companies.length,
    boxArt: games.filter((g) => g.boxArt).length,
    aggregate: games.filter((g) => g.scores.aggregate !== null).length,
    egm: games.filter((g) => g.scores.egm).length,
    nintendoPower: games.filter((g) => g.scores.nintendoPower).length,
    esrb: games.filter((g) => g.esrb).length,
    esrbEligible: games.filter((g) => g.releasedUS >= ESRB_START).length,
    launchTitles: games.filter((g) => g.launchTitle).length,
    chips: games.filter((g) => g.chip).length,
    igdbFetched: input.igdb !== null,
    unmatchedIgdb,
    missingBoxArt: games.filter((g) => !g.boxArt).map((g) => g.title),
    noArticle,
    possibleDuplicateCompanies: [...groups.values()].filter((names) => names.length > 1).map((names) => names.sort()),
  };
  return { games, companies, report, errors };
}

const list = (items: string[]) => (items.length ? `  (${items.slice(0, 12).join('; ')}${items.length > 12 ? '; …' : ''})` : '');

export function formatReport(r: CoverageReport): string {
  const pad = (label: string) => `  ${label.padEnd(20)}`;
  return [
    `SNES dataset — ${r.games} games, ${r.companies} companies`,
    `${pad('box art')}${r.boxArt} / ${r.games}${list(r.missingBoxArt)}`,
    `${pad('aggregate score')}${r.igdbFetched ? `${r.aggregate} / ${r.games}` : 'not fetched (no IGDB key)'}`,
    `${pad('EGM')}${r.egm} / ${r.games}`,
    `${pad('Nintendo Power')}${r.nintendoPower} / ${r.games}`,
    `${pad('ESRB')}${r.esrb} / ${r.esrbEligible} games released from Sept 1994`,
    `${pad('launch titles')}${r.launchTitles}`,
    `${pad('enhancement chips')}${r.chips}`,
    `${pad('unmatched in IGDB')}${r.unmatchedIgdb.length}${list(r.unmatchedIgdb)}`,
    `${pad('no Wikipedia article')}${r.noArticle.length}${list(r.noArticle)}`,
    `${pad('possible duplicates')}${r.possibleDuplicateCompanies.length}${list(r.possibleDuplicateCompanies.map((g) => g.join(' / ')))}`,
  ].join('\n');
}
```

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `npx jest __tests__/snes-build.test.ts`
Expected: PASS. If `reports coverage` fails on `aggregate`: Donkey Kong Country has no `total_rating_count`, so the expected 2 comes from F-Zero (30) and Super Metroid (50).

- [ ] **Step 5: Create the hand-edited files**

`data/snes/aliases.json`:
```json
{
  "igdb": {},
  "boxart": {},
  "companies": {},
  "slugs": {}
}
```

`data/snes/overrides.json`:
```json
{}
```

- [ ] **Step 6: Write the build script**

`scripts/snes/build-games.mjs`:
```js
#!/usr/bin/env node
/**
 * Builds data/snes/games.json and data/snes/companies.json from .snes-cache/ (offline) plus the hand-edited
 * data/snes/aliases.json and data/snes/overrides.json, then prints the coverage report. Exits 1, writing
 * nothing, if the data breaks a rule (unknown override or alias, slug collision, missing publisher, count
 * outside 700–740).
 *
 *   npm run snes:build [-- --json]
 */
import fs from 'fs';
import path from 'path';
import { BOX_DIR, DATA_DIR, cachePath, loadTs, readJson, writeJson } from './lib.mjs';

const listFile = cachePath('wiki-list.wiki');
if (!fs.existsSync(listFile)) {
  console.error('No .snes-cache/wiki-list.wiki yet — run npm run snes:fetch first.');
  process.exit(1);
}
const { parseSoftwareList, parseChipList } = loadTs('lib/snes/wikiList.ts');
const { buildDataset, formatReport } = loadTs('lib/snes/build.ts');

const chipsFile = cachePath('wiki-chips.wiki');
const { games, companies, report, errors } = buildDataset({
  list: parseSoftwareList(fs.readFileSync(listFile, 'utf8')).rows,
  chips: fs.existsSync(chipsFile) ? parseChipList(fs.readFileSync(chipsFile, 'utf8')) : [],
  reviewBoxes: readJson(cachePath('reviews.json'), {}),
  igdb: readJson(cachePath('igdb.json'), null),
  aliases: readJson(path.join(DATA_DIR, 'aliases.json'), { igdb: {}, boxart: {}, companies: {}, slugs: {} }),
  overrides: readJson(path.join(DATA_DIR, 'overrides.json'), {}),
  previous: readJson(path.join(DATA_DIR, 'games.json'), []),
  hasBoxArt: (slug) => fs.existsSync(path.join(BOX_DIR, `${slug}.jpg`)),
});

if (errors.length) {
  console.error(`Build refused — nothing written:\n${errors.map((e) => `  ✗ ${e}`).join('\n')}`);
  process.exit(1);
}
writeJson(path.join(DATA_DIR, 'games.json'), games);
writeJson(path.join(DATA_DIR, 'companies.json'), companies);
console.log(process.argv.includes('--json') ? JSON.stringify(report, null, 2) : formatReport(report));
```

- [ ] **Step 7: Add the npm script and run the first build**

In `package.json` `"scripts"`, add:
```json
    "snes:build": "node scripts/snes/build-games.mjs"
```

Run: `npm run snes:build`
Expected: a report beginning `SNES dataset — 717 games, …`, with box art `0 / 717` (box art comes in Task 7). It may instead refuse with slug collisions. If so, add a `slugs` entry per collision in `data/snes/aliases.json`, using the year as a suffix (for example `"SimCity": "simcity"` and the other title → `"<slug>-1996"`), and re-run until it writes.

- [ ] **Step 8: Commit**

```bash
git add lib/snes/build.ts scripts/snes/build-games.mjs __tests__/snes-build.test.ts data/snes/aliases.json data/snes/overrides.json package.json
git commit -m "feat(snes): merge sources into games.json and companies.json with a coverage report"
```

Do not commit `data/snes/games.json` or `companies.json` yet; Task 8 commits the researched data together with its tests.

---

### Task 7: Box-art fetcher

**Files:**
- Create: `scripts/snes/fetch-boxart.mjs`
- Modify: `package.json` scripts
- Output: `public/snes/box/<slug>.jpg`, `public/snes/box/sources.json`, `public/snes/box/SOURCES.md`

**Interfaces:**
- Consumes:
  - `indexBoxart`, `LIBRETRO_RAW` (boxart)
  - `normalizeTitle` (titles)
  - `data/snes/games.json` from Task 6
  - `aliases.json` `boxart`
- Produces:
  - A JPEG per matched game.
  - `public/snes/box/sources.json`, shaped `{ [slug]: libretroFileName }`.
  - `SOURCES.md`, regenerated from `sources.json`.
  - Cache file: `.snes-cache/libretro-tree.json` (`string[]` of `Named_Boxarts/` paths).

- [ ] **Step 1: Write the fetcher**

`scripts/snes/fetch-boxart.mjs`:
```js
#!/usr/bin/env node
/**
 * Downloads US box art from libretro-thumbnails for every game in data/snes/games.json that has none yet,
 * resizes it to 300 px wide JPEG (quality 82) with macOS sips, and saves it as public/snes/box/<slug>.jpg.
 * Records where each came from in public/snes/box/sources.json and SOURCES.md. Run snes:build again
 * afterwards so games.json picks the new images up. Mac-only (sips); the images are committed.
 *
 *   npm run snes:fetch:boxart [-- --refresh]
 */
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { BOX_DIR, DATA_DIR, cachePath, fetchWithRetry, loadTs, readJson, refresh, sleep, writeJson } from './lib.mjs';

const games = readJson(path.join(DATA_DIR, 'games.json'), null);
if (!games) {
  console.error('No data/snes/games.json yet — run npm run snes:build first.');
  process.exit(1);
}
const { indexBoxart, LIBRETRO_RAW } = loadTs('lib/snes/boxart.ts');
const { normalizeTitle } = loadTs('lib/snes/titles.ts');
const aliases = readJson(path.join(DATA_DIR, 'aliases.json'), { boxart: {} });

const treeFile = cachePath('libretro-tree.json');
let tree = refresh ? null : readJson(treeFile, null);
if (!tree) {
  const url = 'https://api.github.com/repos/libretro-thumbnails/Nintendo_-_Super_Nintendo_Entertainment_System/git/trees/master?recursive=1';
  const body = await (await fetchWithRetry(url, { headers: { Accept: 'application/vnd.github+json' } })).json();
  if (body.truncated) console.warn('GitHub truncated the file list; some art may be reported missing.');
  tree = body.tree.map((t) => t.path).filter((p) => p.startsWith('Named_Boxarts/'));
  writeJson(treeFile, tree);
}
const index = indexBoxart(tree);

fs.mkdirSync(BOX_DIR, { recursive: true });
const sourcesFile = path.join(BOX_DIR, 'sources.json');
const sources = readJson(sourcesFile, {});
const tmp = cachePath('box-download.png');
const missing = [];
let downloaded = 0;

for (const game of games) {
  const out = path.join(BOX_DIR, `${game.slug}.jpg`);
  if (fs.existsSync(out) && !refresh) continue;
  const file = aliases.boxart[game.slug] ?? index.get(normalizeTitle(game.title));
  if (!file) {
    missing.push(game.title);
    continue;
  }
  const res = await fetchWithRetry(LIBRETRO_RAW + encodeURIComponent(file));
  fs.writeFileSync(tmp, Buffer.from(await res.arrayBuffer()));
  const sips = spawnSync('sips', ['--resampleWidth', '300', '-s', 'format', 'jpeg', '-s', 'formatOptions', '82', tmp, '--out', out], { encoding: 'utf8' });
  if (sips.status !== 0) {
    console.warn(`  could not convert ${file}: ${sips.stderr.trim()}`);
    continue;
  }
  sources[game.slug] = file;
  downloaded++;
  if (downloaded % 50 === 0) {
    writeJson(sourcesFile, sources);
    console.log(`  ${downloaded} downloaded`);
  }
  await sleep(100);
}
writeJson(sourcesFile, sources);

const rows = Object.entries(sources).sort(([a], [b]) => a.localeCompare(b));
fs.writeFileSync(
  path.join(BOX_DIR, 'SOURCES.md'),
  `# SNES box art\n\nUS box art from [libretro-thumbnails](https://github.com/libretro-thumbnails/Nintendo_-_Super_Nintendo_Entertainment_System) ` +
    `(\`Named_Boxarts\`), resized to 300 px wide. Box art is the property of each game's publisher; it is shown here ` +
    `for reference in a non-commercial history of the console. Regenerated by \`npm run snes:fetch:boxart\`.\n\n` +
    `| Slug | libretro file |\n|---|---|\n${rows.map(([slug, file]) => `| ${slug} | ${file} |`).join('\n')}\n`,
);
console.log(`box art: ${downloaded} downloaded, ${rows.length} on disk, ${missing.length} unmatched`);
if (missing.length) console.log(`  unmatched (add aliases.json "boxart" entries): ${missing.join('; ')}`);
```

- [ ] **Step 2: Add the npm scripts**

In `package.json` `"scripts"`, add:
```json
    "snes:fetch:boxart": "node scripts/snes/fetch-boxart.mjs",
    "snes:fetch": "npm run snes:fetch:list && npm run snes:fetch:reviews && npm run snes:fetch:igdb",
    "snes": "npm run snes:fetch && npm run snes:build && npm run snes:fetch:boxart && npm run snes:build"
```

- [ ] **Step 3: Run it**

Run: `npm run snes:fetch:boxart`
Expected: about 700 downloads over a few minutes, ending `box art: ~690 downloaded, ~690 on disk, ~25 unmatched`.

Then check the size: `du -sh public/snes/box`. Expected: about 15–30 MB. If it's over 40 MB, lower `formatOptions` to 75 and re-run with `--refresh`.

- [ ] **Step 4: Rebuild and spot-check**

Run: `npm run snes:build`
Expected: the box art line now reads about `690 / 717`.

Then open three images to check they're the right US covers: `open public/snes/box/super-metroid.jpg public/snes/box/the-7th-saga.jpg public/snes/box/f-zero.jpg`.

- [ ] **Step 5: Commit**

```bash
git add scripts/snes/fetch-boxart.mjs package.json
git commit -m "feat(snes): download and resize US box art from libretro-thumbnails"
```

The images are committed in Task 8, with the data they belong to.

---

### Task 8: Research pass, data tests and docs

This task is done **with Wes**. The coverage report is the to-do list, and the judgement calls are his to approve.

**Files:**
- Modify: `data/snes/aliases.json`, `data/snes/overrides.json`
- Create: `__tests__/snes-data.test.ts`
- Add: `data/snes/games.json`, `data/snes/companies.json`, `public/snes/box/*`
- Modify: `CLAUDE.md` (new "/snes dataset" section)

**Interfaces:**
- Consumes: everything above.
- Produces: the committed dataset that pieces 2–5 read.

- [ ] **Step 1: Run the whole pipeline and save the report**

Run: `npm run snes 2>&1 | tee /tmp/snes-report.txt`
Expected: the coverage report. Paste it to Wes.

- [ ] **Step 2: Fold duplicate companies**

For each pair under `possible duplicates`, confirm with Wes that they are the same company, then add the alias. Example: `"SETA Corporation": "SETA"` under `companies` in `data/snes/aliases.json`. Pairs that are really different companies are left alone. Re-run `npm run snes:build` after the batch.

- [ ] **Step 3: Pin unmatched IGDB titles**

For each title under `unmatched in IGDB`, search the cache for it. For example, for *Mystery Cart*:
`node -e "const g=require('./.snes-cache/igdb.json');console.log(g.filter(x=>/mystery/i.test(x.name+JSON.stringify(x.alternative_names||[]))).map(x=>[x.id,x.name]))"`

Add the right id under `igdb` in `aliases.json`, keyed by slug. Leave a title unmatched only if IGDB truly lacks it, and list those for Wes. Re-run `npm run snes:build`.

- [ ] **Step 4: Pin unmatched box art**

For each title in the box-art fetcher's `unmatched` line, search `.snes-cache/libretro-tree.json` for a near name, for example:
`node -e "console.log(require('./.snes-cache/libretro-tree.json').filter(p=>/zelda/i.test(p)))"`

Add the right US file under `boxart` in `aliases.json`. Then run `npm run snes:fetch:boxart && npm run snes:build`.

- [ ] **Step 5: Write the data tests**

`__tests__/snes-data.test.ts`:
```ts
import fs from 'fs';
import path from 'path';
import type { Company, Game, Overrides, Aliases } from '@/lib/snes/types';
import { ESRB_START, GAME_COUNT_RANGE } from '@/lib/snes/build';

const read = <T,>(file: string): T => JSON.parse(fs.readFileSync(path.join(process.cwd(), file), 'utf8'));
const games = read<Game[]>('data/snes/games.json');
const companies = read<Company[]>('data/snes/companies.json');
const overrides = read<Overrides>('data/snes/overrides.json');
const aliases = read<Aliases>('data/snes/aliases.json');
const slugs = new Set(games.map((g) => g.slug));
const companySlugs = new Set(companies.map((c) => c.slug));

test('the game count is in the expected range', () => {
  expect(games.length).toBeGreaterThanOrEqual(GAME_COUNT_RANGE[0]);
  expect(games.length).toBeLessThanOrEqual(GAME_COUNT_RANGE[1]);
});

test('slugs are unique and URL-safe; titles carry no wiki markup', () => {
  expect(slugs.size).toBe(games.length);
  for (const g of games) {
    expect(g.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    expect(g.title).toMatch(/^[^{}[\]|<>]+$/);
  }
});

test('US release dates fall between launch and 1998, in the format their precision says', () => {
  const format = { day: /^\d{4}-\d{2}-\d{2}$/, month: /^\d{4}-\d{2}$/, year: /^\d{4}$/ };
  for (const g of games) {
    expect(g.releasedUS).toMatch(format[g.datePrecision]);
    expect(g.releasedUS >= '1991-08').toBe(true);
    expect(g.releasedUS < '1999').toBe(true);
  }
});

test('every developer and publisher is a company', () => {
  for (const g of games) {
    expect(companySlugs.has(g.publisher)).toBe(true);
    for (const d of g.developers) expect(companySlugs.has(d)).toBe(true);
  }
});

test('every box art file exists locally', () => {
  for (const g of games.filter((x) => x.boxArt)) {
    expect(g.boxArt).toBe(`/snes/box/${g.slug}.jpg`);
    expect(fs.existsSync(path.join(process.cwd(), 'public', g.boxArt!))).toBe(true);
  }
});

test('scores stay inside their scales', () => {
  for (const { scores } of games) {
    if (scores.aggregate !== null) expect(scores.aggregate).toBeGreaterThanOrEqual(0);
    if (scores.aggregate !== null) expect(scores.aggregate).toBeLessThanOrEqual(100);
    for (const s of scores.egm ?? []) expect(s >= 0 && s <= 10).toBe(true);
    if (scores.nintendoPower) expect(scores.nintendoPower.score).toBeLessThanOrEqual(scores.nintendoPower.scale);
  }
});

test('no ESRB rating before the ESRB existed', () => {
  for (const g of games.filter((x) => x.releasedUS < ESRB_START)) expect(g.esrb).toBeNull();
});

test('launch day includes F-Zero and Super Mario World', () => {
  const launch = games.filter((g) => g.launchTitle).map((g) => g.title);
  expect(launch).toEqual(expect.arrayContaining(['F-Zero', 'Super Mario World']));
});

test('every override and alias names a real game', () => {
  for (const slug of [...Object.keys(overrides), ...Object.keys(aliases.igdb), ...Object.keys(aliases.boxart)]) {
    expect(slugs.has(slug)).toBe(true);
  }
});
```

Run: `npx jest __tests__/snes-data.test.ts`
Expected: PASS. A failure here is a real data problem: fix it with an override or alias, then rebuild. Don't weaken the test.

- [ ] **Step 6: Document the pipeline in CLAUDE.md**

Add this section after the `/health` section in `CLAUDE.md`:
````markdown
## /snes dataset
Piece 1 of the `/snes` history (spec `docs/superpowers/specs/2026-10-11-snes-dataset-design.md`, plan `docs/superpowers/plans/2026-10-11-snes-dataset.md`). No UI yet; it builds the data pieces 2–5 read.

```
npm run snes                 # everything: fetch → build → box art → build
npm run snes:fetch           # Wikipedia list + chips, review boxes, IGDB, into .snes-cache/ (gitignored)
npm run snes:build           # offline: games.json + companies.json + coverage report (--json for machine-readable)
npm run snes:fetch:boxart    # missing box art → public/snes/box/<slug>.jpg (macOS sips), then build again
```
- **Files:**
  - `data/snes/games.json` holds facts only. Wes's opinions will live in `wes.json`, keyed by the same slug.
  - `data/snes/companies.json`, `aliases.json` and `overrides.json` are the other data files.
  - Parsers are in `lib/snes/`, scripts in `scripts/snes/`.
  - `lib/snes/*.ts` must stay loadable by ts-node from `.mjs`: use `import type` and `.ts` relative imports.
- **Slugs are permanent:** the build reuses the slug already recorded for a game's Wikipedia article. Never hand-edit a slug in `games.json`; settle collisions in `aliases.json` `slugs`.
- **Never hand-edit `games.json`.** A correction goes in `overrides.json`, keyed by slug, with a `note` saying why. It is applied last, so a rebuild keeps it. An override or alias naming a missing slug fails the build.
- **The coverage report is the research to-do list:** unmatched IGDB titles, missing box art, possible duplicate companies, and Nintendo Power / EGM coverage. Magazine scores found by hand go in `overrides.json` (`scores.nintendoPower: { score, scale }`, `scores.egm: [..]`).
- **IGDB** needs `IGDB_CLIENT_ID` / `IGDB_CLIENT_SECRET` in `.env.local` (free Twitch dev app). Without them the build still runs with IGDB fields empty. The aggregate score is IGDB `total_rating`, null under 3 ratings.
- **ESRB is null before Sept 1994** whatever IGDB says (re-releases got rated later). `launchTitle` = released 1991-08-23.
- Box art is hosted locally, credited in `public/snes/box/SOURCES.md` (generated from `sources.json`).
````

- [ ] **Step 7: Run the whole suite**

Run: `npm test`
Expected: PASS. It includes the Next build through `pretest`; nothing in `/snes` is a page yet, so the build output is unchanged.

- [ ] **Step 8: Commit the data**

```bash
git add data/snes public/snes __tests__/snes-data.test.ts CLAUDE.md
git commit -m "data(snes): 717 US releases with scores, companies and box art"
```

- [ ] **Step 9: Hand the report to Wes**

Share the final coverage report with Wes, plus the open research items:
- titles IGDB lacks
- games with no box art
- Nintendo Power / EGM coverage

These feed the ongoing gap-filling. Do not merge or push `snes` to `main` without asking: `main` auto-deploys.
