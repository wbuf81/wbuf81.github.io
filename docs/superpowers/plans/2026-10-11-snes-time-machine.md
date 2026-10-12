# SNES Time Machine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a weekly pop-culture dataset (charts, box office, news, artwork, prices) for every SNES week. Show it on a new Time Machine page (`/videogames/snes-history/time-machine`) and in a "Be Kind, Rewind" section on every game page.

**Architecture:**
- **Fetch and build:** fetchers save raw Wikipedia wikitext to `.snes-cache/pop/`. Pure, tested parsers in `lib/snes/pop.ts` turn it into chart rows. `lib/snes/weeks.ts` assembles 373 Friday-start weeks into `data/snes/weeks.json`. Artwork is downloaded once, converted to WebP and committed under `public/snes/pop/`.
- **Pages:** they read the JSON at build time. The Time Machine page is a server page plus one client component. The game-page section is a server component with no client JS.

**Tech stack:**
- Site: Next.js 16 app router (`output: 'export'`), React 19, TypeScript, Jest (next/jest, jsdom), Testing Library.
- Scripts: Node `.mjs` scripts that load the TS through ts-node (`loadTs`).
- Images: Pillow through `scripts/snes/webp.py`.

**Spec:** `docs/superpowers/specs/2026-10-11-snes-time-machine-design.md`. The approved prototype is https://claude.ai/artifact/MmJ2p8m5h1sZGY1s4LLyEf. Its working source is at `/private/tmp/claude-501/-Users-wes-Documents-Claude/c709f3f4-5f2b-48c6-9705-f69cc5882242/scratchpad/tm/template.html`, which is reference only and may be gone.

## Global Constraints

- **`lib/snes/` code:**
  - Use `import type` for types and `.ts` extensions on relative imports. No `@/` imports.
  - Keep it pure, so the plain-Node scripts can load it with `loadTs`.
- **Tests and components** import with `@/lib/snes/...` and `@/app/snes/components/...`, the same as the existing `__tests__/snes-*.test.ts(x)`. Test fixtures stay inline in the test files; there is no fixtures folder.
- **Routes:** the base is `SNES_BASE = '/videogames/snes-history'` from `lib/snes/routes.ts`. Add `TIME_MACHINE = \`${SNES_BASE}/time-machine\`` and `timeMachinePath(start)`. Static assets stay under `/snes/*`.
- **Search engines:** every new route sets `robots: { index: false, follow: false }`, and `public/robots.txt` keeps `Disallow: /videogames`.
- **Weeks:** the first week starts on Friday 1991-08-23 and the last is the week containing the last game in `games.json`. All dates are ISO `YYYY-MM-DD` strings, and date maths uses UTC.
- **Masthead and personal details:**
  - The masthead reads exactly **The Omaha World-Pixel**. Never use the real "Omaha World-Herald" name.
  - The Wes line appears only when the birth year is 1981, and reads exactly: "Wes saved up $200 and bought one at ShopKo in Omaha, Nebraska, with F-Zero as a launch title."
  - No ZIP code anywhere.
- **Headlines** are unfiltered. Only `data/snes/pop-overrides.json` may replace or hide them.
- **Artwork:** at most 240 px wide, WebP, committed, never hotlinked. Every item links to its Wikipedia article.
- **Prices:** every entry in `prices.json` has a `source`. CPI base: the 2025 annual average, a constant to update each January.
- **Colours** are tokens in `app/design-system.css`, with dark twins in both dark blocks, mirrored in `app/design/tokens.ts` the way the existing SNES group is. The CRT screen and the newspaper keep their own colours in both themes.
- **Fonts:** VT323 and UnifrakturMaguntia via `next/font/google`, loaded only by the Time Machine page and the game pages, with `display: 'swap'`, `preload: false` and fallbacks.
- **Budget:** the Time Machine page HTML plus RSC payload is at most 150 KB gzipped, not counting images.
- **Fetching Wikipedia:** one request at a time, at least 2.5 s between requests, and back off 15 s × attempt on a 429.
- **Commits** end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Work on `main` unless the controller says otherwise. Never push; the controller pushes.

## Review Focus

1. **Month-precision games** (657 of 717): a week must still show "Also out in ‹Month›", and the game page must label the panel with the month rather than claiming an exact week. Covered by tests in Task 2 and Task 7.
2. **A week with no in-week news, or no artwork:** the UI shows the `near` story or "A quiet week in the news", and text-only cards. It must never crash or show an empty box. Covered in Task 7 and Task 8.
3. **Scrubbing on a phone:** dragging the slider must not re-mount it. Re-rendering the deck mid-drag breaks touch dragging. Covered in Task 8 with a same-element assertion.
4. **Bad `?w=`** (garbage, before 1991, after 1998): falls back to the nearest valid week, or to launch week for garbage. Covered in Task 8.
5. **Blocked localStorage** (Safari private mode): the birth-year story still renders with 1981 and nothing throws. Covered in Task 8.

---

### Task 1: Wikitext grid and pop-culture parsers

**Files:**
- Modify: `lib/snes/wikitext.ts` (append `tableGrid`)
- Create: `lib/snes/pop.ts`
- Test: `__tests__/snes-pop.test.ts`

**Interfaces:**
- Produces:
  - `tableGrid(table: string): { header: string[]; rows: string[][] }`. Every cell is a raw wikitext string with its attributes stripped; `rowspan` is expanded downward.
  - `export type ChartRow = { date: string; title: string; by: string | null; article: string | null; gross?: string | null }`
  - `parseChart(wikitext: string, year: number): ChartRow[]`, which handles songs, albums and films. The header decides which columns are which.
  - `export type NewsItem = { date: string; text: string }`
  - `parseNews(wikitext: string, year: number): NewsItem[]`
  - `popText(cell: string): string`, which strips a cell to display text.
  - `firstArticle(cell: string): string | null`

- [ ] **Step 1: Write the failing tests**

```ts
// __tests__/snes-pop.test.ts
import { tableGrid } from '@/lib/snes/wikitext';
import { parseChart, parseNews, popText, firstArticle } from '@/lib/snes/pop';

const HOT = `{| class="wikitable"
! width=31|{{abbr|No.|Hot 100 consecutive No.1}}
!align="center"|Issue date
!align="center"|Song
!align="center"|Artist(s)
!align="center"|{{abbr|Ref.|References}}
|-
| bgcolor=#EDEAE0 align=center rowspan=3|753
|align="center"|August 17
|bgcolor=#FFFF99 align="center" rowspan="3"| "[[(Everything I Do) I Do It for You]]"{{dagger}}
|align="center" rowspan="3"| [[Bryan Adams]]
|align="center"|<ref>{{cite web|url=x|title=August 17, 1991}}</ref>
|-
|align="center"|August 24
|align="center"|<ref>x</ref>
|-
|align="center"|August 31
|align="center"|<ref>x</ref>
|}`;

const ALBUMS = `{| class="wikitable sortable plainrowheaders" style="text-align: center"
! scope=col| Issue date
! scope=col| Album
! scope=col| Artist(s)
! scope=col| Label
|-
! scope="row" | {{dts|August 24}}
| rowspan="1" | ''[[Unforgettable... with Love]]''
| {{Sortname|Natalie|Cole}}
| [[Elektra Records|Elektra]]
|-
! scope="row" | {{dts|August 31}}
|style="text-align: center;" rowspan=4|''[[Metallica (album)|Metallica]]''
|style="text-align: center;" rowspan=4|[[Metallica]]
| Elektra
|}`;

const BOX = `{| class="wikitable sortable"
! {{abbr|#|Week number}}
! Weekend end date
! Film
! Box office
! Notes
|-
| 33 || {{dts|1991|August|18}} || rowspan="2" | ''[[Hot Shots!]]'' || $6,330,309 || ||
|-
| 34 || {{dts|1991|August|25}} || $4,676,467 || ||
|}`;

const NEWS = `== Incumbents ==
* August 3 – not an event (incumbents)
== Events ==
=== August ===
* August 19 – [[Hurricane Bob]] hits the Northeastern United States.
* August 23 – The [[Super Nintendo Entertainment System]] is first released in the United States.<ref>x</ref>
* August 26
** The [[WWE|World Wrestling Federation]] holds its [[SummerSlam (1991)|SummerSlam]] event.
** Second thing that day.
=== September ===
* September 2 &ndash; The US recognizes the independence of [[Estonia]].
== Births ==
* August 10 – [[Maci Bookout]], reality star
`;

describe('tableGrid', () => {
  it('expands rowspan cells down into later rows', () => {
    const { header, rows } = tableGrid(HOT);
    expect(header).toEqual(['No.', 'Issue date', 'Song', 'Artist(s)', 'Ref.']);
    expect(rows).toHaveLength(3);
    expect(rows[2][1].trim()).toBe('August 31');
    expect(popText(rows[2][2])).toBe('(Everything I Do) I Do It for You');
    expect(popText(rows[2][3])).toBe('Bryan Adams');
  });
});

describe('parseChart', () => {
  it('reads Hot 100 rows with carried-down songs', () => {
    expect(parseChart(HOT, 1991)).toEqual([
      { date: '1991-08-17', title: '(Everything I Do) I Do It for You', by: 'Bryan Adams', article: '(Everything I Do) I Do It for You' },
      { date: '1991-08-24', title: '(Everything I Do) I Do It for You', by: 'Bryan Adams', article: '(Everything I Do) I Do It for You' },
      { date: '1991-08-31', title: '(Everything I Do) I Do It for You', by: 'Bryan Adams', article: '(Everything I Do) I Do It for You' },
    ]);
  });
  it('reads row-header dates and Sortname artists on the Billboard 200', () => {
    const rows = parseChart(ALBUMS, 1991);
    expect(rows[0]).toEqual({ date: '1991-08-24', title: 'Unforgettable... with Love', by: 'Natalie Cole', article: 'Unforgettable... with Love' });
    expect(rows[1]).toMatchObject({ date: '1991-08-31', title: 'Metallica', by: 'Metallica', article: 'Metallica (album)' });
  });
  it('reads ||-joined box office rows with gross and a carried film', () => {
    expect(parseChart(BOX, 1991)).toEqual([
      { date: '1991-08-18', title: 'Hot Shots!', by: null, article: 'Hot Shots!', gross: '$6,330,309' },
      { date: '1991-08-25', title: 'Hot Shots!', by: null, article: 'Hot Shots!', gross: '$4,676,467' },
    ]);
  });
  it('throws when no table has a date and title column', () => {
    expect(() => parseChart('{|\n! A\n! B\n|-\n| 1 || 2\n|}', 1991)).toThrow(/no chart table/);
  });
});

describe('parseNews', () => {
  it('reads only the Events section, including nested bullets under a date', () => {
    expect(parseNews(NEWS, 1991)).toEqual([
      { date: '1991-08-19', text: 'Hurricane Bob hits the Northeastern United States.' },
      { date: '1991-08-23', text: 'The Super Nintendo Entertainment System is first released in the United States.' },
      { date: '1991-08-26', text: 'The World Wrestling Federation holds its SummerSlam event.' },
      { date: '1991-08-26', text: 'Second thing that day.' },
      { date: '1991-09-02', text: 'The US recognizes the independence of Estonia.' },
    ]);
  });
});

describe('cell helpers', () => {
  it('strips quotes, italics, links, refs and daggers', () => {
    expect(popText(`"[[A|B]]"{{dagger}}<ref>x</ref>`)).toBe('B');
    expect(firstArticle(`''[[Metallica (album)|Metallica]]''`)).toBe('Metallica (album)');
    expect(firstArticle('plain')).toBeNull();
  });
});
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `npx jest __tests__/snes-pop.test.ts`
Expected: FAIL. `tableGrid` / `parseChart` aren't exported.

- [ ] **Step 3: Implement `tableGrid`.** Append to `lib/snes/wikitext.ts`:

```ts
/** A wikitable as a header plus a full grid of raw cells, with rowspan cells copied down into the rows they span. */
export function tableGrid(table: string): { header: string[]; rows: string[][] } {
  let header: string[] = [];
  const rows: string[][] = [];
  let pending = new Map<number, { left: number; cell: string }>();
  for (const raw of table.split(/\n\|-[^\n]*/)) {
    const cells: { head: boolean; cell: string }[] = [];
    for (const line of raw.split('\n')) {
      if (line.startsWith('{|') || line.startsWith('|+') || line.startsWith('|}')) continue;
      if (line.startsWith('!')) for (const c of splitTopLevel(line.slice(1), '!!')) for (const cc of splitTopLevel(c, '||')) cells.push({ head: true, cell: cc });
      else if (line.startsWith('|')) for (const c of splitTopLevel(line.slice(1), '||')) cells.push({ head: false, cell: c });
      else if (cells.length && line.trim()) cells[cells.length - 1].cell += '\n' + line;
    }
    if (!cells.length) continue;
    const rowHeader = cells.some((c) => /scope\s*=\s*"?row/i.test(c.cell));
    if (!rows.length && cells.every((c) => c.head) && !rowHeader) {
      header = cells.map((c) => linkText(unwrapTemplates(stripNoise(stripCellAttrs(c.cell)))));
      continue;
    }
    const row: string[] = [];
    const queue = [...cells];
    for (let col = 0; queue.length || pending.has(col); col++) {
      const carried = pending.get(col);
      if (carried) {
        row.push(carried.cell);
        if (carried.left <= 1) pending.delete(col);
        else pending.set(col, { left: carried.left - 1, cell: carried.cell });
        continue;
      }
      const { cell } = queue.shift()!;
      const attrs = cell.length > stripCellAttrs(cell).length ? cell.slice(0, cell.length - stripCellAttrs(cell).length) : '';
      const content = stripCellAttrs(cell);
      const span = Number(attrs.match(/rowspan\s*=\s*"?(\d+)/i)?.[1] ?? 1);
      if (span > 1) pending.set(col, { left: span - 1, cell: content });
      row.push(content);
    }
    rows.push(row);
    pending = new Map(pending);
  }
  return { header, rows };
}
```

Note: `stripCellAttrs` only strips quoted attributes (`a="b"`). Chart tables also use unquoted ones (`rowspan=3`, `bgcolor=#EDEAE0 align=center`). In the same commit, widen the regex in `stripCellAttrs` to accept unquoted values:

```ts
if (parts.length > 1 && /^\s*([a-z-]+\s*=\s*("[^"]*"|[^\s|"]+)\s*)+$/i.test(parts[0])) return parts.slice(1).join('|');
```

Then run `npx jest __tests__/snes-wikilist.test.ts __tests__/snes-reviews.test.ts` to prove the existing parsers still pass.

- [ ] **Step 4: Implement `lib/snes/pop.ts`**

```ts
/*
 * Parsers for the pop-culture pages behind the Time Machine: Billboard Hot 100 and Billboard 200 number ones,
 * the weekend box office number ones, and the Events section of "YEAR in the United States".
 */
import { linkText, stripNoise, tableGrid, unwrapTemplates } from './wikitext.ts';

export type ChartRow = { date: string; title: string; by: string | null; article: string | null; gross?: string | null };
export type NewsItem = { date: string; text: string };

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTH_RE = MONTHS.join('|');
const iso = (y: number, m: number, d: number) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

export function popText(cell: string): string {
  const s = unwrapTemplates(
    stripNoise(cell)
      .replace(/\{\{\s*(?:dagger|double-dagger|†)\s*(?:\|[^}]*)?\}\}/gi, '')
      .replace(/\{\{\s*sortname\s*\|([^|}]*)\|([^|}]*)(?:\|[^}]*)?\}\}/gi, '$1 $2')
      .replace(/\{\{\s*(?:sort|hs)\s*\|[^|}]*\|([^}]*)\}\}/gi, '$1'),
  )
    .replace(/<br\s*\/?>/gi, ' / ')
    .replace(/\{\{[^{}]*\}\}/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&ndash;/g, '–')
    .replace(/&amp;/g, '&');
  return linkText(s).replace(/^["“”\s]+|["“”\s]+$/g, '');
}

export function firstArticle(cell: string): string | null {
  return stripNoise(cell).match(/\[\[([^\]|#]+)/)?.[1].trim() ?? null;
}

/** "{{dts|August 24}}", "{{dts|1991|August|25}}" or plain "August 24[, 1991]" → ISO date. */
function cellDate(cell: string, year: number): string | null {
  const dts = cell.match(/\{\{\s*dts\s*\|([^}]*)\}\}/i);
  const text = dts ? dts[1].split('|').filter((p) => !p.includes('=')).join(' ') : popText(cell);
  const m = text.match(new RegExp(`(${MONTH_RE})\\s+(\\d{1,2})`)) ?? text.match(new RegExp(`(\\d{4})\\s+(${MONTH_RE})\\s+(\\d{1,2})`));
  if (!m) return null;
  if (/^\d{4}$/.test(m[1])) return iso(Number(m[1]), MONTHS.indexOf(m[2]) + 1, Number(m[3]));
  const y = Number(text.match(/\b(19\d\d|20\d\d)\b/)?.[1] ?? year);
  return iso(y, MONTHS.indexOf(m[1]) + 1, Number(m[2]));
}

const col = (header: string[], ...keys: string[]) => header.findIndex((h) => keys.some((k) => h.toLowerCase().includes(k)));

export function parseChart(wikitext: string, year: number): ChartRow[] {
  const out: ChartRow[] = [];
  let found = false;
  for (const m of wikitext.matchAll(/\{\|[\s\S]*?\n\|\}/g)) {
    const { header, rows } = tableGrid(m[0]);
    const di = col(header, 'issue date', 'weekend end', 'date');
    const ti = col(header, 'song', 'album', 'film', 'title');
    if (di < 0 || ti < 0) continue;
    found = true;
    const ai = col(header, 'artist');
    const gi = col(header, 'box office', 'gross');
    for (const r of rows) {
      const date = r[di] !== undefined ? cellDate(r[di], year) : null;
      if (!date || r[ti] === undefined) continue;
      const row: ChartRow = { date, title: popText(r[ti]), by: ai >= 0 && r[ai] !== undefined ? popText(r[ai]) || null : null, article: firstArticle(r[ti]) };
      if (gi >= 0) row.gross = r[gi] !== undefined ? popText(r[gi]) || null : null;
      out.push(row);
    }
  }
  if (!found) throw new Error('parseChart: no chart table with a date and title column');
  return out;
}

export function parseNews(wikitext: string, year: number): NewsItem[] {
  const events = wikitext.match(/==\s*Events\s*==([\s\S]*?)(?:\n==[^=]|$)/)?.[1] ?? '';
  const out: NewsItem[] = [];
  let month = 0;
  let current: string | null = null;
  for (const line of events.split('\n')) {
    const head = line.match(/^===\s*([A-Za-z]+)\s*===/);
    if (head) {
      month = MONTHS.indexOf(head[1]) + 1;
      current = null;
      continue;
    }
    if (!month || !line.startsWith('*')) continue;
    const depth = line.match(/^\*+/)![0].length;
    const body = line.slice(depth).trim();
    const dated = body.match(new RegExp(`^\\[?\\[?(${MONTH_RE})\\s+(\\d{1,2})\\]?\\]?\\s*(?:[–-]\\s*\\d{1,2}\\s*)?(?:&ndash;|–|-|:)?\\s*([\\s\\S]*)$`));
    if (depth === 1 && dated) {
      current = iso(year, MONTHS.indexOf(dated[1]) + 1, Number(dated[2]));
      const text = popText(dated[3]);
      if (text) out.push({ date: current, text });
    } else if (depth >= 2 && current) {
      const text = popText(body);
      if (text) out.push({ date: current, text });
    }
  }
  return out;
}
```

- [ ] **Step 5: Run the tests and confirm they pass**

Run: `npx jest __tests__/snes-pop.test.ts __tests__/snes-wikilist.test.ts __tests__/snes-reviews.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/snes/wikitext.ts lib/snes/pop.ts __tests__/snes-pop.test.ts
git commit -m "feat(snes): parsers for Billboard, box office and news pages

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Week assembly

**Files:**
- Create: `lib/snes/weeks.ts`
- Modify: `lib/snes/types.ts` (add `PopItem`, `Week`)
- Test: `__tests__/snes-weeks.test.ts`

**Interfaces:**
- Consumes: `ChartRow` and `NewsItem` from Task 1.
- Produces:
  - In `types.ts`:
    - `PopItem = { title: string; by: string | null; article: string | null; art: string | null }`
    - `Week = { start: string; song: PopItem; album: PopItem; film: PopItem & { gross: string | null }; news: NewsItem[]; near: NewsItem | null }`
  - `FIRST_WEEK = '1991-08-23'`
  - `weekStarts(lastGameDate: string): string[]`
  - `assembleWeeks(input: { starts: string[]; hot: ChartRow[]; album: ChartRow[]; box: ChartRow[]; news: NewsItem[]; art: (article: string | null) => string | null; overrides?: PopOverrides }): { weeks: Week[]; errors: string[] }`
  - `PopOverrides = { weeks?: Record<string, { news: NewsItem[] | 'hide'; note?: string }>; art?: Record<string, string | null> }`
  - `artId(article: string): string`, a stable file slug
  - `weekIndexFor(weeks: Week[], date: string): number`, the index of the week containing a date, clamped
  - `gamesForWeek(games: { slug: string; releasedUS: string; datePrecision: string }[], weeks: Week[], i: number): { exact: string[]; month: string[] }` (returns slugs)
  - `panelWeekFor(weeks, game): { index: number; label: 'week' | 'month' }`

- [ ] **Step 1: Write the failing tests**

```ts
// __tests__/snes-weeks.test.ts
import { FIRST_WEEK, artId, assembleWeeks, gamesForWeek, panelWeekFor, weekIndexFor, weekStarts } from '@/lib/snes/weeks';

const hot = [{ date: '1991-08-17', title: 'Song A', by: 'A', article: 'Song A' }, { date: '1991-08-24', title: 'Song B', by: 'B', article: 'Song B' }, { date: '1991-08-31', title: 'Song C', by: 'C', article: null }];
const album = [{ date: '1991-08-24', title: 'Unforgettable... with Love', by: 'Natalie Cole', article: 'Unforgettable... with Love' }, { date: '1991-08-31', title: 'Metallica', by: 'Metallica', article: 'Metallica (album)' }];
const box = [{ date: '1991-08-25', title: 'Hot Shots!', by: null, article: 'Hot Shots!', gross: '$4,676,467' }, { date: '1991-09-01', title: 'Film 2', by: null, article: 'Film 2', gross: null }];
const news = [
  { date: '1991-08-19', text: 'Hurricane Bob' },
  { date: '1991-08-23', text: 'The Super Nintendo Entertainment System is first released in the United States.' },
  { date: '1991-08-26', text: 'SummerSlam' },
];
const art = (a: string | null) => (a ? `/snes/pop/${artId(a)}.webp` : null);

describe('weekStarts', () => {
  it('runs Friday to Friday from launch through the week holding the last game', () => {
    const s = weekStarts('1991-09-07');
    expect(s[0]).toBe(FIRST_WEEK);
    expect(s).toEqual(['1991-08-23', '1991-08-30', '1991-09-06']);
  });
});

describe('assembleWeeks', () => {
  const { weeks, errors } = assembleWeeks({ starts: ['1991-08-23', '1991-08-30', '1991-09-06'], hot, album, box, news, art });
  it('picks Saturday charts on or before start + 1 and Sunday box office on or before start + 2', () => {
    expect(errors).toEqual([]);
    expect(weeks[0].song.title).toBe('Song B');
    expect(weeks[0].album.title).toBe('Unforgettable... with Love');
    expect(weeks[0].film).toMatchObject({ title: 'Hot Shots!', gross: '$4,676,467' });
    expect(weeks[1].album.title).toBe('Metallica');
    expect(weeks[1].film.title).toBe('Film 2');
  });
  it('keeps in-week news (max 4) and falls back to the latest story in the 10 days before', () => {
    expect(weeks[0].news.map((n) => n.text)).toEqual(['The Super Nintendo Entertainment System is first released in the United States.', 'SummerSlam']);
    expect(weeks[0].near).toBeNull();
    expect(weeks[2].news).toEqual([]);
    expect(weeks[2].near).toEqual({ date: '1991-08-26', text: 'SummerSlam' });
  });
  it('attaches art paths by article', () => {
    expect(weeks[0].song.art).toBe(`/snes/pop/${artId('Song B')}.webp`);
    expect(weeks[1].song.art).toBeNull();
  });
  it('reports a week missing a chart entry', () => {
    const r = assembleWeeks({ starts: ['1991-08-02'], hot, album, box, news, art });
    expect(r.errors.join(' ')).toMatch(/1991-08-02.*song/);
  });
  it('applies headline overrides and rejects unknown weeks', () => {
    const r = assembleWeeks({ starts: ['1991-08-23'], hot, album, box, news, art, overrides: { weeks: { '1991-08-23': { news: 'hide' }, '1990-01-05': { news: 'hide' } } } });
    expect(r.weeks[0].news).toEqual([]);
    expect(r.errors.join(' ')).toMatch(/1990-01-05/);
  });
});

describe('lookups', () => {
  const { weeks } = assembleWeeks({ starts: ['1991-08-23', '1991-08-30', '1991-09-06'], hot, album, box, news, art });
  it('finds the week holding a date and clamps outside the range', () => {
    expect(weekIndexFor(weeks, '1991-08-29')).toBe(0);
    expect(weekIndexFor(weeks, '1991-08-30')).toBe(1);
    expect(weekIndexFor(weeks, '1980-01-01')).toBe(0);
    expect(weekIndexFor(weeks, '2001-01-01')).toBe(2);
  });
  const games = [
    { slug: 'f-zero', releasedUS: '1991-08-23', datePrecision: 'day' },
    { slug: 'sept-month', releasedUS: '1991-09', datePrecision: 'month' },
  ];
  it('splits a week into exact-date games and month-only games for weeks starting in that month', () => {
    expect(gamesForWeek(games, weeks, 0)).toEqual({ exact: ['f-zero'], month: [] });
    expect(gamesForWeek(games, weeks, 2)).toEqual({ exact: [], month: ['sept-month'] });
  });
  it('places a month-only game in the first week starting that month and labels it by month', () => {
    expect(panelWeekFor(weeks, games[1])).toEqual({ index: 2, label: 'month' });
    expect(panelWeekFor(weeks, games[0])).toEqual({ index: 0, label: 'week' });
  });
  it('makes stable file-safe art ids', () => {
    expect(artId('Metallica (album)')).toBe('metallica-album');
    expect(artId('(Everything I Do) I Do It for You')).toBe('everything-i-do-i-do-it-for-you');
  });
});
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `npx jest __tests__/snes-weeks.test.ts`
Expected: FAIL (module missing).

- [ ] **Step 3: Implement.** Add to `lib/snes/types.ts`:

```ts
export type PopItem = { title: string; by: string | null; article: string | null; art: string | null };
export type Week = {
  start: string; // Friday, ISO
  song: PopItem;
  album: PopItem;
  film: PopItem & { gross: string | null };
  news: { date: string; text: string }[];
  near: { date: string; text: string } | null;
};
```

Create `lib/snes/weeks.ts`:

```ts
/*
 * The Time Machine's weeks: Friday-start weeks from the US launch, each with the Billboard number ones (Saturday
 * issue dates), the weekend box office number one (Sunday weekend end) and the news dated inside the week.
 */
import type { ChartRow, NewsItem } from './pop.ts';
import type { PopItem, Week } from './types.ts';

export const FIRST_WEEK = '1991-08-23';
const DAY = 86400000;
const toMs = (iso: string) => Date.parse(`${iso}T00:00:00Z`);
const toIso = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const addDays = (iso: string, n: number) => toIso(toMs(iso) + n * DAY);

export type PopOverrides = { weeks?: Record<string, { news: NewsItem[] | 'hide'; note?: string }>; art?: Record<string, string | null> };

export function artId(article: string): string {
  return article.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function weekStarts(lastGameDate: string): string[] {
  const last = toMs(lastGameDate.length === 7 ? `${lastGameDate}-28` : lastGameDate.length === 4 ? `${lastGameDate}-12-31` : lastGameDate);
  const out: string[] = [];
  for (let t = toMs(FIRST_WEEK); t <= last; t += 7 * DAY) out.push(toIso(t));
  return out;
}

/** The last row dated on or before `day` (rows sorted by date). */
function onOrBefore<T extends { date: string }>(rows: T[], day: string): T | null {
  let best: T | null = null;
  for (const r of rows) if (r.date <= day) best = r;
  return best;
}

export function assembleWeeks(input: {
  starts: string[]; hot: ChartRow[]; album: ChartRow[]; box: ChartRow[]; news: NewsItem[];
  art: (article: string | null) => string | null; overrides?: PopOverrides;
}): { weeks: Week[]; errors: string[] } {
  const byDate = <T extends { date: string }>(rows: T[]) => [...rows].sort((a, b) => a.date.localeCompare(b.date));
  const hot = byDate(input.hot), album = byDate(input.album), box = byDate(input.box), news = byDate(input.news);
  const errors: string[] = [];
  const item = (r: ChartRow): PopItem => ({ title: r.title, by: r.by, article: r.article, art: input.art(r.article) });
  const weeks: Week[] = [];
  for (const start of input.starts) {
    const end = addDays(start, 6);
    const s = onOrBefore(hot, addDays(start, 1)), a = onOrBefore(album, addDays(start, 1)), f = onOrBefore(box, addDays(start, 2));
    if (!s) errors.push(`${start}: no song`);
    if (!a) errors.push(`${start}: no album`);
    if (!f) errors.push(`${start}: no film`);
    if (!s || !a || !f) continue;
    let inWeek = news.filter((n) => n.date >= start && n.date <= end).slice(0, 4);
    const o = input.overrides?.weeks?.[start];
    if (o) inWeek = o.news === 'hide' ? [] : o.news;
    const before = news.filter((n) => n.date >= addDays(start, -10) && n.date < start);
    weeks.push({
      start, song: item(s), album: item(a), film: { ...item(f), gross: f.gross ?? null }, news: inWeek,
      near: inWeek.length || o?.news === 'hide' ? null : before[before.length - 1] ?? null,
    });
  }
  for (const key of Object.keys(input.overrides?.weeks ?? {})) if (!input.starts.includes(key)) errors.push(`override names unknown week ${key}`);
  return { weeks, errors };
}

export function weekIndexFor(weeks: Week[], date: string): number {
  const day = date.length === 7 ? `${date}-01` : date.length === 4 ? `${date}-01-01` : date;
  let i = 0;
  weeks.forEach((w, k) => { if (w.start <= day) i = k; });
  return i;
}

type Dated = { slug: string; releasedUS: string; datePrecision: string };

export function gamesForWeek(games: Dated[], weeks: Week[], i: number): { exact: string[]; month: string[] } {
  const start = weeks[i].start, end = addDays(start, 6), ym = start.slice(0, 7);
  return {
    exact: games.filter((g) => g.datePrecision === 'day' && g.releasedUS >= start && g.releasedUS <= end).map((g) => g.slug),
    month: games.filter((g) => g.datePrecision === 'month' && g.releasedUS === ym).map((g) => g.slug),
  };
}

export function panelWeekFor(weeks: Week[], game: Dated): { index: number; label: 'week' | 'month' } {
  if (game.datePrecision === 'day') return { index: weekIndexFor(weeks, game.releasedUS), label: 'week' };
  const ym = game.releasedUS.slice(0, 7);
  const first = weeks.findIndex((w) => w.start.startsWith(ym));
  return { index: first >= 0 ? first : weekIndexFor(weeks, game.releasedUS), label: 'month' };
}
```

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `npx jest __tests__/snes-weeks.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/snes/weeks.ts lib/snes/types.ts __tests__/snes-weeks.test.ts
git commit -m "feat(snes): assemble Time Machine weeks from charts, box office and news

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Money and "Your SNES years"

**Files:**
- Create: `lib/snes/money.ts`, `lib/snes/years.ts`
- Test: `__tests__/snes-money.test.ts`, `__tests__/snes-years.test.ts`

**Interfaces:**
- Produces:
  - `CPI: Record<number, number>`, `NOW_YEAR = 2025`, `NOW_CPI`, `toToday(usd: number, year: number): number`
  - `MILESTONES: { slug: string; text: string }[]`
  - `ageAt(birthYear, isoDate): number`
  - `schoolGrade(birthYear, isoDate): number`
  - `gradeName(n): string`
  - `story(birthYear): { lead: string; wes: string | null; close: string }` (plain strings, no HTML).
  - `WES_BIRTH_YEAR = 1981`, `WES_LINE`

- [ ] **Step 1: Write the failing tests**

```ts
// __tests__/snes-money.test.ts
import { CPI, NOW_CPI, NOW_YEAR, toToday } from '@/lib/snes/money';

it('converts with CPI-U annual averages and rounds to the dollar', () => {
  expect(CPI[1991]).toBe(136.2);
  expect(NOW_YEAR).toBe(2025);
  expect(toToday(199.99, 1991)).toBe(Math.round((199.99 * NOW_CPI) / 136.2));
  expect(toToday(199.99, 1991)).toBeGreaterThan(460);
  expect(toToday(199.99, 1991)).toBeLessThan(485);
});
it('refuses years outside the table', () => {
  expect(() => toToday(10, 1989)).toThrow(/no CPI for 1989/);
});
```

```ts
// __tests__/snes-years.test.ts
import { WES_LINE, ageAt, gradeName, schoolGrade, story } from '@/lib/snes/years';

it('works out age and school grade (school year starts in September)', () => {
  expect(ageAt(1981, '1991-08-23')).toBe(10);
  expect(schoolGrade(1981, '1991-09-15')).toBe(5);
  expect(schoolGrade(1981, '1994-04-18')).toBe(7);
  expect(gradeName(0)).toBe('in kindergarten');
  expect(gradeName(7)).toBe('in 7th grade');
  expect(gradeName(14)).toBe('in college');
  expect(gradeName(-2)).toBe('not in school yet');
});
it('narrates launch and the last game, with the Wes line only for 1981', () => {
  const s = story(1981);
  expect(s.lead).toMatch(/You were 10 when the Super Nintendo launched on August 23, 1991, about to start 5th grade\./);
  expect(s.wes).toBe(WES_LINE);
  expect(WES_LINE).toBe('Wes saved up $200 and bought one at ShopKo in Omaha, Nebraska, with F-Zero as a launch title.');
  expect(s.close).toMatch(/You were 17 when the last US SNES game shipped/);
  expect(story(1985).wes).toBeNull();
});
it('handles people born after the launch', () => {
  expect(story(1994).lead).toMatch(/weren't born yet/);
});
```

- [ ] **Step 2: Run and confirm they fail**

Run: `npx jest __tests__/snes-money.test.ts __tests__/snes-years.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

```ts
// lib/snes/money.ts
/* Prices in today's money: US CPI-U annual averages (BLS). Update NOW_YEAR / NOW_CPI each January. */
export const CPI: Record<number, number> = { 1991: 136.2, 1992: 140.3, 1993: 144.5, 1994: 148.2, 1995: 152.4, 1996: 156.9, 1997: 160.5, 1998: 163.0 };
export const NOW_YEAR = 2025;
export const NOW_CPI = 322.2; // 2025 annual average (approximate until BLS final)

export function toToday(usd: number, year: number): number {
  const then = CPI[year];
  if (!then) throw new Error(`toToday: no CPI for ${year}`);
  return Math.round((usd * NOW_CPI) / then);
}
```

Before committing, check the 2025 value against the BLS CPI-U annual average (series CUUR0000SA0). If BLS publishes a final figure that differs, use it and update the test bounds to match.

```ts
// lib/snes/years.ts
/* "Your SNES years": a visitor's age and school grade at moments in the SNES era, from a birth year. */
export const LAUNCH = '1991-08-23';
export const LAST_GAME = '1998-10-06';
export const WES_BIRTH_YEAR = 1981;
export const WES_LINE = 'Wes saved up $200 and bought one at ShopKo in Omaha, Nebraska, with F-Zero as a launch title.';
export const MILESTONES: { slug: string; text: string }[] = [
  { slug: 'super-mario-world', text: 'the SNES launched with Super Mario World' },
  { slug: 'the-legend-of-zelda-a-link-to-the-past', text: 'A Link to the Past came out' },
  { slug: 'street-fighter-ii-the-world-warrior', text: 'Street Fighter II hit' },
  { slug: 'star-fox', text: 'Star Fox flew in with the Super FX chip' },
  { slug: 'mortal-kombat', text: 'Mortal Kombat arrived (with sweat instead of blood)' },
  { slug: 'super-metroid', text: 'Super Metroid came out' },
  { slug: 'donkey-kong-country', text: 'Donkey Kong Country came out' },
  { slug: 'chrono-trigger', text: 'Chrono Trigger came out' },
  { slug: 'super-mario-rpg-legend-of-the-seven-stars', text: 'Super Mario RPG came out' },
  { slug: 'frogger', text: 'the last US SNES game (Frogger!) shipped' },
];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const parts = (iso: string) => iso.split('-').map(Number);
const ordinal = (n: number) => `${n}${n % 10 === 1 && n !== 11 ? 'st' : n % 10 === 2 && n !== 12 ? 'nd' : n % 10 === 3 && n !== 13 ? 'rd' : 'th'}`;

/** Age on a date, assuming a mid-year (1 July) birthday. */
export function ageAt(birthYear: number, iso: string): number {
  const [y, m] = parts(iso);
  return y - birthYear - ((m || 7) < 7 ? 1 : 0);
}
/** US school grade (0 = kindergarten): the school year starts in September; a child is in K the year they turn 5. */
export function schoolGrade(birthYear: number, iso: string): number {
  const [y, m] = parts(iso);
  const schoolYear = (m || 1) >= 9 ? y : y - 1;
  return schoolYear - birthYear - 5;
}
export function gradeName(n: number): string {
  if (n < 0) return 'not in school yet';
  if (n === 0) return 'in kindergarten';
  if (n <= 12) return `in ${ordinal(n)} grade`;
  if (n <= 16) return 'in college';
  return 'out of school';
}
export function story(birthYear: number): { lead: string; wes: string | null; close: string } {
  const a = ageAt(birthYear, LAUNCH);
  const nextGrade = schoolGrade(birthYear, '1991-09-15');
  const [ly, lm] = parts(LAST_GAME);
  const close = `You were ${Math.max(0, ageAt(birthYear, LAST_GAME))} when the last US SNES game shipped in ${MONTHS[lm - 1]} ${ly}.`;
  if (a < 0) return { lead: `You weren't born yet when the SNES launched in August 1991; you arrived in ${birthYear}, in the middle of the 16-bit years.`, wes: null, close };
  const school = nextGrade >= 1 && nextGrade <= 12 ? `, about to start ${ordinal(nextGrade)} grade` : '';
  return { lead: `You were ${a} when the Super Nintendo launched on August 23, 1991${school}.`, wes: birthYear === WES_BIRTH_YEAR ? WES_LINE : null, close };
}
```

- [ ] **Step 4: Run and confirm they pass**

Run: `npx jest __tests__/snes-money.test.ts __tests__/snes-years.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/snes/money.ts lib/snes/years.ts __tests__/snes-money.test.ts __tests__/snes-years.test.ts
git commit -m "feat(snes): CPI conversion and Your SNES years narration

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Fetch, artwork and build scripts, plus the committed data

**Files:**
- Create: `scripts/snes/fetch-pop.mjs`, `scripts/snes/fetch-pop-art.mjs`, `scripts/snes/build-weeks.mjs`, `data/snes/pop-overrides.json` (`{ "weeks": {}, "art": {} }`)
- Generated and committed: `data/snes/weeks.json`, `public/snes/pop/*.webp`, `public/snes/pop/SOURCES.md`
- Modify: `package.json` (scripts), `scripts/snes/lib.mjs` (add a `POP_CACHE` path and `wikiPageImages`), `CLAUDE.md` (a "/snes time machine" section)
- Test: `__tests__/snes-weeks-data.test.ts`

**Interfaces:**
- Consumes: `parseChart` and `parseNews` (Task 1); `weekStarts`, `assembleWeeks` and `artId` (Task 2).
- Produces:
  - `data/snes/weeks.json` (`Week[]`)
  - `public/snes/pop/<artId>.webp`
  - `lib/snes/data.ts` gains `getWeeks = () => weeks as Week[]`

- [ ] **Step 1: Write the data test.** It fails until the data exists.

```ts
// __tests__/snes-weeks-data.test.ts
import fs from 'fs';
import path from 'path';
import weeks from '@/data/snes/weeks.json';
import overrides from '@/data/snes/pop-overrides.json';
import games from '@/data/snes/games.json';
import type { Week } from '@/lib/snes/types';

const W = weeks as Week[];
const DAY = 86400000;

it('covers every Friday from launch to the last game', () => {
  expect(W[0].start).toBe('1991-08-23');
  for (let i = 1; i < W.length; i++) expect(Date.parse(W[i].start) - Date.parse(W[i - 1].start)).toBe(7 * DAY);
  const last = [...(games as { releasedUS: string }[])].map((g) => g.releasedUS).sort().pop()!;
  expect(W[W.length - 1].start <= last.padEnd(10, '-31').slice(0, 10)).toBe(true);
  expect(W.length).toBeGreaterThanOrEqual(370);
});
it('has a song, album and film every week, and every art file exists', () => {
  for (const w of W) {
    for (const item of [w.song, w.album, w.film]) {
      expect(item.title).toBeTruthy();
      if (item.art) expect(fs.existsSync(path.join(process.cwd(), 'public', item.art))).toBe(true);
    }
    expect(w.news.length).toBeLessThanOrEqual(4);
  }
});
it("launch week matches the history", () => {
  expect(W[0].song).toMatchObject({ title: '(Everything I Do) I Do It for You', by: 'Bryan Adams' });
  expect(W[0].album.title).toBe('Unforgettable... with Love');
  expect(W[0].film.title).toBe('Hot Shots!');
  expect(W[0].news.map((n) => n.text)).toContain('The Super Nintendo Entertainment System is first released in the United States.');
});
it('overrides name real weeks', () => {
  const starts = new Set(W.map((w) => w.start));
  for (const k of Object.keys((overrides as { weeks: Record<string, unknown> }).weeks)) expect(starts.has(k)).toBe(true);
});
```

- [ ] **Step 2: Add helpers to `scripts/snes/lib.mjs`**

```js
export const POP_DIR = path.join(repoRoot, 'public/snes/pop');
export const popCachePath = (name) => { fs.mkdirSync(path.join(CACHE_DIR, 'pop'), { recursive: true }); return path.join(CACHE_DIR, 'pop', name); };

/** Wikipedia page images (any licence) for up to 40 titles: { title → thumbnail URL | null }, following redirects. */
export async function wikiPageImages(titles, width = 240) {
  const url = 'https://en.wikipedia.org/w/api.php?' + new URLSearchParams({
    action: 'query', titles: titles.join('|'), prop: 'pageimages', piprop: 'thumbnail', pithumbsize: String(width),
    pilicense: 'any', redirects: '1', format: 'json', formatversion: '2',
  });
  const body = await (await fetchWithRetry(url, {}, 6)).json();
  const rename = new Map();
  for (const n of [...(body.query.normalized ?? []), ...(body.query.redirects ?? [])]) rename.set(n.from, n.to);
  const resolve = (t) => { let x = t; for (let i = 0; i < 3 && rename.has(x); i++) x = rename.get(x); return x; };
  const pages = new Map(body.query.pages.map((p) => [p.title, p]));
  return Object.fromEntries(titles.map((t) => [t, pages.get(resolve(t))?.thumbnail?.source ?? null]));
}
```

Change the backoff in `fetchWithRetry`: when the status is 429, wait `15000 * attempt` ms instead of `1000 * 2 ** (attempt - 1)`. Keep the existing behaviour for 5xx and network errors.

- [ ] **Step 3: Write `scripts/snes/fetch-pop.mjs`**

```js
#!/usr/bin/env node
/**
 * Saves the raw wikitext behind the Time Machine to .snes-cache/pop/: Billboard Hot 100 and Billboard 200 number
 * ones, weekend box office number ones, and "YEAR in the United States", for 1991–1998. One request at a time,
 * 2.5 s apart; anything already cached is skipped unless --refresh.
 *
 *   npm run snes:pop:fetch [-- --refresh]
 */
import fs from 'fs';
import { popCachePath, refresh, sleep, wikiParse } from './lib.mjs';

const PAGES = (y) => ({
  [`hot-${y}`]: `List of Billboard Hot 100 number ones of ${y}`,
  [`album-${y}`]: `List of Billboard 200 number-one albums of ${y}`,
  [`box-${y}`]: `List of ${y} box office number-one films in the United States`,
  [`news-${y}`]: `${y} in the United States`,
});

for (let y = 1991; y <= 1998; y++) {
  for (const [key, title] of Object.entries(PAGES(y))) {
    const file = popCachePath(`${key}.wiki`);
    if (fs.existsSync(file) && !refresh) continue;
    try {
      fs.writeFileSync(file, await wikiParse(title));
      console.log(`  ✓ ${title}`);
    } catch (err) {
      console.error(`  ✗ ${title}: ${err.message}`);
      process.exit(1);
    }
    await sleep(2500);
  }
}
console.log('Pop pages cached in .snes-cache/pop/');
```

- [ ] **Step 4: Write `scripts/snes/build-weeks.mjs`.** It reads the cache, assembles the weeks, writes `weeks.json` and prints the coverage report. `--json` prints the report as JSON. It exits 1 and writes nothing on errors.

```js
#!/usr/bin/env node
/**
 * Builds data/snes/weeks.json from .snes-cache/pop/ (offline) and data/snes/pop-overrides.json, then prints the
 * coverage report. Exits 1, writing nothing, when a week lacks a chart entry or an override is orphaned.
 *
 *   npm run snes:pop:build [-- --json]
 */
import fs from 'fs';
import path from 'path';
import { DATA_DIR, POP_DIR, loadTs, popCachePath, readJson, writeJson } from './lib.mjs';

const { parseChart, parseNews } = loadTs('lib/snes/pop.ts');
const { weekStarts, assembleWeeks, artId } = loadTs('lib/snes/weeks.ts');

const rows = { hot: [], album: [], box: [], news: [] };
for (let y = 1991; y <= 1998; y++) {
  for (const kind of ['hot', 'album', 'box', 'news']) {
    const file = popCachePath(`${kind}-${y}.wiki`);
    if (!fs.existsSync(file)) { console.error(`Missing ${file} — run npm run snes:pop:fetch first.`); process.exit(1); }
    const text = fs.readFileSync(file, 'utf8');
    try { rows[kind].push(...(kind === 'news' ? parseNews(text, y) : parseChart(text, y))); }
    catch (err) { console.error(`${kind} ${y}: ${err.message}`); process.exit(1); }
  }
}
const games = readJson(path.join(DATA_DIR, 'games.json'), []);
const overrides = readJson(path.join(DATA_DIR, 'pop-overrides.json'), { weeks: {}, art: {} });
const lastGame = games.map((g) => g.releasedUS).sort().pop();
const missingArt = new Set();
const art = (article) => {
  if (!article) return null;
  const id = artId(article);
  if (id in (overrides.art ?? {})) return overrides.art[id];
  if (fs.existsSync(path.join(POP_DIR, `${id}.webp`))) return `/snes/pop/${id}.webp`;
  missingArt.add(article);
  return null;
};
const { weeks, errors } = assembleWeeks({ starts: weekStarts(lastGame), ...rows, art, overrides });
for (const id of Object.keys(overrides.art ?? {})) if (!fs.existsSync(path.join(POP_DIR, `${id}.webp`)) && overrides.art[id] === undefined) errors.push(`art override names unknown id ${id}`);
if (errors.length) { console.error(`Build refused — nothing written:\n${errors.map((e) => `  ✗ ${e}`).join('\n')}`); process.exit(1); }
writeJson(path.join(DATA_DIR, 'weeks.json'), weeks);

const report = {
  weeks: weeks.length, first: weeks[0].start, last: weeks[weeks.length - 1].start,
  newsInWeek: weeks.filter((w) => w.news.length).length, newsNear: weeks.filter((w) => !w.news.length && w.near).length,
  newsNone: weeks.filter((w) => !w.news.length && !w.near).length, missingArt: [...missingArt].sort(),
};
if (process.argv.includes('--json')) console.log(JSON.stringify(report, null, 2));
else console.log(`SNES weeks — ${report.weeks} weeks (${report.first} → ${report.last})
  news in-week ${report.newsInWeek}   near-week ${report.newsNear}   none ${report.newsNone}
  artwork missing ${report.missingArt.length}${report.missingArt.length ? ` (${report.missingArt.slice(0, 8).join('; ')}${report.missingArt.length > 8 ? '; …' : ''})` : ''}`);
```

- [ ] **Step 5: Write `scripts/snes/fetch-pop-art.mjs`.** It collects every article from the parsed rows, from the 1991-08-10 cutoff onward. It asks Wikipedia for page images in batches of 40, 2.5 s apart. Each image is downloaded once to `.snes-cache/pop/art/<id>.<ext>` and converted to `public/snes/pop/<id>.webp` with `python3 scripts/snes/webp.py <src> <out> 75 w 240`. `SOURCES.md` gets one line per file: `- <id>.webp — [Article](https://en.wikipedia.org/wiki/Article) (Wikipedia page image)`.

```js
#!/usr/bin/env node
/**
 * Downloads album covers, single covers and film posters for every Time Machine article (Wikipedia page images,
 * any licence — non-free covers are used small, with credit, as on the box art) and writes WebP ≤240 px to
 * public/snes/pop/, plus SOURCES.md. Skips files that already exist unless --refresh.
 *
 *   npm run snes:pop:art [-- --refresh]
 */
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { POP_DIR, fetchWithRetry, loadTs, popCachePath, refresh, repoRoot, sleep, wikiPageImages } from './lib.mjs';

const { parseChart } = loadTs('lib/snes/pop.ts');
const { artId } = loadTs('lib/snes/weeks.ts');
const articles = new Set();
for (let y = 1991; y <= 1998; y++) for (const kind of ['hot', 'album', 'box']) {
  for (const r of parseChart(fs.readFileSync(popCachePath(`${kind}-${y}.wiki`), 'utf8'), y)) if (r.date >= '1991-08-10' && r.article) articles.add(r.article);
}
fs.mkdirSync(POP_DIR, { recursive: true });
const want = [...articles].sort().filter((a) => refresh || !fs.existsSync(path.join(POP_DIR, `${artId(a)}.webp`)));
console.log(`${articles.size} articles, ${want.length} to fetch`);
const urls = {};
for (let i = 0; i < want.length; i += 40) {
  Object.assign(urls, await wikiPageImages(want.slice(i, i + 40)));
  await sleep(2500);
}
for (const [article, url] of Object.entries(urls)) {
  if (!url) { console.warn(`  – no image: ${article}`); continue; }
  const id = artId(article);
  const ext = url.split('?')[0].split('.').pop().toLowerCase();
  const raw = popCachePath(`art-${id}.${ext}`);
  if (!fs.existsSync(raw)) {
    fs.writeFileSync(raw, Buffer.from(await (await fetchWithRetry(url, {}, 6)).arrayBuffer()));
    await sleep(600);
  }
  execFileSync('python3', [path.join(repoRoot, 'scripts/snes/webp.py'), raw, path.join(POP_DIR, `${id}.webp`), '75', 'w', '240']);
}
const lines = [...articles].sort().filter((a) => fs.existsSync(path.join(POP_DIR, `${artId(a)}.webp`)))
  .map((a) => `- ${artId(a)}.webp — [${a}](https://en.wikipedia.org/wiki/${encodeURIComponent(a.replace(/ /g, '_'))}) (Wikipedia page image)`);
fs.writeFileSync(path.join(POP_DIR, 'SOURCES.md'), `# Time Machine artwork\n\nAlbum covers, single covers and film posters, shown small (≤240 px) for commentary in a non-commercial history. Each comes from its Wikipedia article's page image.\n\n${lines.join('\n')}\n`);
console.log(`Wrote ${lines.length} images`);
```

`webp.py` opens JPEGs too, because it converts to RGBA. If `python3` lacks Pillow, run `python3 -m pip install --user Pillow`, which is what `snes:media` already needs.

- [ ] **Step 6: Add the npm scripts**

```json
"snes:pop:fetch": "node scripts/snes/fetch-pop.mjs",
"snes:pop:art": "node scripts/snes/fetch-pop-art.mjs",
"snes:pop:build": "node scripts/snes/build-weeks.mjs",
"snes:pop": "npm run snes:pop:fetch && npm run snes:pop:art && npm run snes:pop:build"
```

Add `data/snes/pop-overrides.json` containing `{ "weeks": {}, "art": {} }`. Add `getWeeks` to `lib/snes/data.ts`:

```ts
import type { Company, Game, Week } from './types.ts';
import weeks from '../../data/snes/weeks.json';
export const getWeeks = () => weeks as Week[];
```

- [ ] **Step 7: Run the pipeline for real**

Run: `npm run snes:pop`
Expected:
- 32 pages cached
- about 437 articles, about 435 images written
- a report of about 373 weeks, with "none" news at about 2

Re-running is fast, because everything is cached.

- [ ] **Step 8: Run the data test and the full jest suite**

Run: `npx jest __tests__/snes-weeks-data.test.ts && npx jest`
Expected: PASS.

- [ ] **Step 9: Document and commit.** Add a "/snes time machine" section to CLAUDE.md covering:
- the four npm scripts
- that `.snes-cache/pop/` is the cache
- `pop-overrides.json` and its shape
- the 2.5 s politeness rule
- that `NOW_CPI` is updated each January

```bash
git add scripts/snes package.json data/snes/weeks.json data/snes/pop-overrides.json public/snes/pop lib/snes/data.ts __tests__/snes-weeks-data.test.ts CLAUDE.md
git commit -m "feat(snes): Time Machine data — 373 weeks of charts, box office, news and artwork

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Price research (`data/snes/prices.json`)

**Files:**
- Create: `data/snes/prices.json`, `lib/snes/prices.ts`
- Test: `__tests__/snes-prices.test.ts`

**Interfaces:**
- Produces:
  - `Price = { usd: number; date: string; note?: string; source: string }`
  - `prices.json` = `{ hardware: (Price & { item: string })[]; games: Record<string, Price> }`
  - `lib/snes/prices.ts` with `consolePrice(): Price & { item: string }` (the launch entry) and `gamePrice(slug): Price | null`
  - `getPrices()` added to `data.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// __tests__/snes-prices.test.ts
import prices from '@/data/snes/prices.json';
import games from '@/data/snes/games.json';
import { CPI } from '@/lib/snes/money';

const slugs = new Set((games as { slug: string }[]).map((g) => g.slug));
type P = { usd: number; date: string; source: string };

it('starts with the $199.99 launch console', () => {
  expect(prices.hardware[0]).toMatchObject({ item: 'Super NES Control Set', usd: 199.99, date: '1991-08' });
});
it('every price is sourced, dated inside the CPI table and names a real game', () => {
  const all: P[] = [...prices.hardware, ...Object.values(prices.games as Record<string, P>)];
  for (const p of all) {
    expect(p.source.length).toBeGreaterThan(8);
    expect(CPI[Number(p.date.slice(0, 4))]).toBeDefined();
    expect(p.usd).toBeGreaterThan(5);
    expect(p.usd).toBeLessThan(200);
  }
  for (const slug of Object.keys(prices.games)) expect(slugs.has(slug)).toBe(true);
  expect(Object.keys(prices.games).length).toBeGreaterThanOrEqual(30);
});
```

The `usd < 200` bound covers games and add-ons, and the launch console is exactly 199.99.

- [ ] **Step 2: Research.** Use web search plus the Internet Archive (scanned catalogs, Sears/JCPenney Christmas catalogs, newspaper ads, magazine price lists, Wikipedia article citations).
  - **Hardware:**
    - Super NES Control Set, $199.99, Aug 1991
    - the Super NES without a pack-in (1992 or later, if sourced)
    - Super Scope
    - SNES-101 (1997)
  - **Carts:** 30–50 well-known titles with a documented US launch or catalog price, each with the year or month it applies to.
  - **Sources:** each entry gets a URL or a precise citation (publication, date, page).
  - **Unsourced:** skip any price you can't source rather than guessing.

- [ ] **Step 3: Write `data/snes/prices.json` and `lib/snes/prices.ts`**

```ts
// lib/snes/prices.ts
/* Researched period prices (each with a source). Only games Wes's research found carry a price. */
import type { Price } from './types.ts';
export type HardwarePrice = Price & { item: string };
export function consolePrice(p: { hardware: HardwarePrice[] }): HardwarePrice { return p.hardware[0]; }
export function gamePrice(p: { games: Record<string, Price> }, slug: string): Price | null { return p.games[slug] ?? null; }
```

Add `export type Price = { usd: number; date: string; note?: string; source: string };` to `types.ts`, and `getPrices` to `data.ts`.

- [ ] **Step 4: Run and confirm they pass**

Run: `npx jest __tests__/snes-prices.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add data/snes/prices.json lib/snes/prices.ts lib/snes/types.ts lib/snes/data.ts __tests__/snes-prices.test.ts
git commit -m "feat(snes): researched console and cart prices with sources

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Tokens, fonts and the shared newspaper clipping

**Files:**
- Modify: `app/design-system.css` (tokens plus dark twins in both dark blocks), `app/design/tokens.ts` (SNES group), `app/snes/snes.css`
- Create: `app/snes/fonts.ts`, `app/snes/components/Paper.tsx`
- Test: `__tests__/snes-paper.test.tsx`. Extend `__tests__/snes-css.test.ts` only if it enumerates tokens.

**Interfaces:**
- Produces:
  - Tokens `--tm-led`, `--tm-paper`, `--tm-paper-2`, `--tm-paper-ink`, `--tm-kicker`, `--tm-cass`, `--tm-ticket`, `--tm-ticket-ink`. The newspaper and screen tokens keep the same values in dark mode, but still have twins as the existing tests require.
  - `vt323` and `fraktur` from `app/snes/fonts.ts`, each exposing `.variable` (`--font-vt323`, `--font-fraktur`).
  - `<Paper week={Week} weekNumber={number} compact?: boolean />`, a server-safe component (no hooks) used by both surfaces.

- [ ] **Step 1: Write the failing test**

```tsx
// __tests__/snes-paper.test.tsx
import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import Paper from '@/app/snes/components/Paper';
import type { Week } from '@/lib/snes/types';

const base: Week = {
  start: '1991-08-23',
  song: { title: 'S', by: 'A', article: null, art: null }, album: { title: 'Al', by: 'B', article: null, art: null },
  film: { title: 'F', by: null, article: null, art: null, gross: null },
  news: [{ date: '1991-08-23', text: 'The Super Nintendo Entertainment System is first released in the United States.' }, { date: '1991-08-26', text: 'SummerSlam at Madison Square Garden.' }],
  near: null,
};

it('prints the masthead, edition line, lead story and side column', () => {
  render(<Paper week={base} weekNumber={1} />);
  expect(screen.getByText('The Omaha World-Pixel')).toBeInTheDocument();
  expect(screen.getByText(/Vol\. 1 · No\. 1/)).toBeInTheDocument();
  expect(screen.getByText(/Omaha, Nebraska · Late edition/)).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: /first released in the United States/ })).toBeInTheDocument();
  expect(screen.getByText(/SummerSlam/)).toBeInTheDocument();
  expect(screen.queryByText(/World-Herald/)).toBeNull();
});
it('falls back to the near story, then to a quiet week', () => {
  const { rerender } = render(<Paper week={{ ...base, news: [], near: { date: '1991-08-20', text: 'Earlier story.' } }} weekNumber={2} />);
  expect(screen.getByRole('heading', { name: 'Earlier story.' })).toBeInTheDocument();
  rerender(<Paper week={{ ...base, news: [], near: null }} weekNumber={2} />);
  expect(screen.getByRole('heading', { name: 'A quiet week in the news' })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run and confirm it fails**

Run: `npx jest __tests__/snes-paper.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement the fonts, tokens, `Paper` and CSS**

```ts
// app/snes/fonts.ts
/* Display faces for the Time Machine only: VT323 for LED dates and tape labels, UnifrakturMaguntia for the masthead. */
import { UnifrakturMaguntia, VT323 } from 'next/font/google';
export const vt323 = VT323({ weight: '400', subsets: ['latin'], display: 'swap', preload: false, variable: '--font-vt323', fallback: ['ui-monospace', 'Menlo', 'monospace'] });
export const fraktur = UnifrakturMaguntia({ weight: '400', subsets: ['latin'], display: 'swap', preload: false, variable: '--font-fraktur', fallback: ['Georgia', 'serif'] });
```

```tsx
// app/snes/components/Paper.tsx
import type { Week } from '@/lib/snes/types';
import { MONTHS, SHORT_MONTHS } from '@/lib/snes/display';

// The week's news as a clipping from "The Omaha World-Pixel" (a riff on the paper Wes read in Omaha): lead story as
// the headline, the rest in a side column. Falls back to the latest story before the week, then to a quiet week.
const day = (iso: string) => { const [, m, d] = iso.split('-').map(Number); return `${SHORT_MONTHS[m - 1]}. ${d}`; };
const long = (iso: string) => { const [y, m, d] = iso.split('-').map(Number); return `${MONTHS[m - 1]} ${d}, ${y}`; };

export default function Paper({ week, weekNumber, compact = false }: { week: Week; weekNumber: number; compact?: boolean }) {
  const items = week.news.length ? week.news : week.near ? [week.near] : [{ date: week.start, text: 'A quiet week in the news' }];
  const [lead, ...rest] = items;
  const vol = Number(week.start.slice(0, 4)) - 1990;
  return (
    <article className={`s-tm-paper${compact ? ' is-compact' : ''}`} aria-label={`News, week of ${long(week.start)}`}>
      <div className="s-tm-ptop"><span>Vol. {vol} · No. {weekNumber}</span><span>Omaha, Nebraska · Late edition</span><span>25¢</span></div>
      <div className="s-tm-pmast">The Omaha World-Pixel</div>
      <div className="s-tm-pdate">Week of {long(week.start)}</div>
      <div className={`s-tm-pbody${rest.length && !compact ? '' : ' is-solo'}`}>
        <div>
          <div className="s-tm-pkick">{day(lead.date)}</div>
          <h3>{lead.text}</h3>
        </div>
        {rest.length && !compact ? <div className="s-tm-pmore">{rest.map((r) => <p key={r.date + r.text}><b>{day(r.date)}</b> {r.text}</p>)}</div> : null}
      </div>
    </article>
  );
}
```

Port the prototype's `.paper`, `.fold`, `.ptop`, `.pmast`, `.pdate`, `.pbody`, `.pkick`, `.plead h3` and `.pmore` rules to `app/snes/snes.css` under the `.wb .s-tm-*` names:
- Colours come from the new tokens.
- Use `font-family: var(--font-fraktur), Georgia, serif` for the masthead and the site serif for the body.
- Use `transform: rotate(-1.2deg)` inside `@media (prefers-reduced-motion: no-preference)` only.
- The coffee ring is a radial gradient in `::before`.
- Below 620px the side column stacks under the lead.
- In the `.is-compact` variant (used on game pages) the masthead is smaller and there is no side column.

- [ ] **Step 4: Run and confirm they pass**

Run: `npx jest __tests__/snes-paper.test.tsx __tests__/snes-css.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/design-system.css app/design/tokens.ts app/snes/snes.css app/snes/fonts.ts app/snes/components/Paper.tsx __tests__/snes-paper.test.tsx
git commit -m "feat(snes): Omaha World-Pixel clipping, Time Machine tokens and fonts

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: "Be Kind, Rewind" on game pages

**Files:**
- Create: `app/snes/components/BeKindRewind.tsx`
- Modify: `app/snes/components/GameView.tsx` (new optional prop `rewind`), `app/videogames/snes-history/[slug]/page.tsx` (compute the rewind data and apply the font variables), `lib/snes/routes.ts` (`TIME_MACHINE`, `timeMachinePath`), `app/snes/snes.css` (`.s-bkr-*`)
- Test: `__tests__/snes-bkr.test.tsx`, and add a routes case to `__tests__/snes-routes.test.ts`

**Interfaces:**
- Consumes: `Week`, `panelWeekFor` (Task 2), `toToday` (Task 3), `consolePrice`/`gamePrice` (Task 5), `Paper` (Task 6).
- Produces:
  - `timeMachinePath(start: string) => \`${TIME_MACHINE}?w=${start}\``
  - `<BeKindRewind week={Week} weekNumber={number} label="week" | "month" monthName={string} price={{ usd: number; year: number; what: 'game' | 'console' }} />`
  - `GameView` accepts `rewind?: React.ComponentProps<typeof BeKindRewind>` and renders it after the `.s-game` block, before the "If you like…" strip.

- [ ] **Step 1: Write the failing tests**

```tsx
// __tests__/snes-bkr.test.tsx
import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import BeKindRewind from '@/app/snes/components/BeKindRewind';
import type { Week } from '@/lib/snes/types';

const week: Week = {
  start: '1991-08-23',
  song: { title: '(Everything I Do) I Do It for You', by: 'Bryan Adams', article: '(Everything I Do) I Do It for You', art: '/snes/pop/everything-i-do-i-do-it-for-you.webp' },
  album: { title: 'Unforgettable... with Love', by: 'Natalie Cole', article: 'Unforgettable... with Love', art: null },
  film: { title: 'Hot Shots!', by: null, article: 'Hot Shots!', art: '/snes/pop/hot-shots.webp', gross: '$4,676,467' },
  news: [{ date: '1991-08-23', text: 'The Super Nintendo Entertainment System is first released in the United States.' }], near: null,
};

it('shows the tape, the four coffee-table objects and links to Wikipedia', () => {
  render(<BeKindRewind week={week} weekNumber={1} label="week" monthName="August 1991" price={{ usd: 199.99, year: 1991, what: 'console' }} />);
  expect(screen.getByText('BE KIND, REWIND')).toBeInTheDocument();
  expect(screen.getByText('The week it came out')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Bryan Adams/ })).toHaveAttribute('href', 'https://en.wikipedia.org/wiki/(Everything_I_Do)_I_Do_It_for_You');
  expect(screen.getByText('Unforgettable... with Love')).toBeInTheDocument(); // no art → text-only card
  expect(screen.getByText(/\$4,676,467/)).toBeInTheDocument();
  expect(screen.getByText('The Omaha World-Pixel')).toBeInTheDocument();
});
it('labels month-only games by month and falls back to the console price', () => {
  render(<BeKindRewind week={week} weekNumber={1} label="month" monthName="March 1995" price={{ usd: 199.99, year: 1991, what: 'console' }} />);
  expect(screen.getByText('March 1995')).toBeInTheDocument();
  expect(screen.getByText(/Super NES was \$199\.99 at launch/)).toBeInTheDocument();
});
it('prints a researched game price in today’s money and links into the Time Machine', () => {
  render(<BeKindRewind week={week} weekNumber={1} label="week" monthName="August 1991" price={{ usd: 59.99, year: 1991, what: 'game' }} />);
  expect(screen.getByText(/\$59\.99 then · about \$\d+ today/)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Open this week in the Time Machine/ })).toHaveAttribute('href', '/videogames/snes-history/time-machine?w=1991-08-23');
});
```

- [ ] **Step 2: Run and confirm it fails**

Run: `npx jest __tests__/snes-bkr.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement**

```tsx
// app/snes/components/BeKindRewind.tsx
import type { PopItem, Week } from '@/lib/snes/types';
import { toToday } from '@/lib/snes/money';
import { timeMachinePath } from '@/lib/snes/routes';
import Paper from './Paper';

// "Be Kind, Rewind": what was on the radio, in the record store, at the movies and in the paper the week a game came
// out, laid out as things on a 90s coffee table. Month-only games show their month rather than claiming a week.
const wiki = (article: string | null) => (article ? `https://en.wikipedia.org/wiki/${article.replace(/ /g, '_')}` : undefined);

function Obj({ kind, label, item, sub }: { kind: 'cass' | 'cd' | 'tix'; label: string; item: PopItem; sub: string | null }) {
  const body = (
    <>
      <span className="s-bkr-k">{label}</span>
      {item.art ? <img src={item.art} alt="" width={240} height={kind === 'tix' ? 360 : 240} loading="lazy" decoding="async" /> : null}
      <b>{item.title}</b>
      {sub ? <span>{sub}</span> : null}
    </>
  );
  const href = wiki(item.article);
  return href ? <a className={`s-bkr-obj is-${kind}`} href={href} target="_blank" rel="noopener noreferrer">{body}</a> : <div className={`s-bkr-obj is-${kind}`}>{body}</div>;
}

export default function BeKindRewind({ week, weekNumber, label, monthName, price }: {
  week: Week; weekNumber: number; label: 'week' | 'month'; monthName: string; price: { usd: number; year: number; what: 'game' | 'console' };
}) {
  const now = toToday(price.usd, price.year);
  return (
    <section className="s-bkr" aria-label="Be Kind, Rewind: what else was going on">
      <div className="s-bkr-tape">
        <span className="s-bkr-label">BE KIND, REWIND</span>
        <span className="s-bkr-sticker">{label === 'week' ? 'The week it came out' : monthName}</span>
      </div>
      <div className="s-bkr-objs">
        <Obj kind="cass" label="#1 song" item={week.song} sub={week.song.by} />
        <Obj kind="cd" label="#1 album" item={week.album} sub={week.album.by} />
        <Obj kind="tix" label="Admit one · #1 movie" item={week.film} sub={week.film.gross ? `${week.film.gross} weekend` : null} />
        <Paper week={week} weekNumber={weekNumber} compact />
      </div>
      <p className="s-bkr-price">
        💵 {price.what === 'game' ? `$${price.usd.toFixed(2)} then · about $${now} today` : `A Super NES was $${price.usd.toFixed(2)} at launch · about $${now} today`}
      </p>
      <a className="s-bkr-go" href={timeMachinePath(week.start)}>Open this week in the Time Machine →</a>
    </section>
  );
}
```

In `lib/snes/routes.ts`:

```ts
export const TIME_MACHINE = `${SNES_BASE}/time-machine`;
export const timeMachinePath = (start: string) => `${TIME_MACHINE}?w=${start}`;
```

In `[slug]/page.tsx`, compute and pass:

```tsx
const weeks = getWeeks();
const { index: wi, label } = panelWeekFor(weeks, game);
const prices = getPrices();
const gp = gamePrice(prices, game.slug);
const cp = consolePrice(prices);
const rewind = {
  week: weeks[wi], weekNumber: wi + 1, label,
  monthName: formatRelease(game.releasedUS, 'month'),
  price: gp ? { usd: gp.usd, year: Number(gp.date.slice(0, 4)), what: 'game' as const } : { usd: cp.usd, year: Number(cp.date.slice(0, 4)), what: 'console' as const },
};
```

Wrap `<main>` with `className={\`wb wb-page ${vt323.variable} ${fraktur.variable}\`}`. In `GameView`, render `{rewind ? <BeKindRewind {...rewind} /> : null}` right after the `.s-game` div. Existing GameView tests pass no `rewind` and keep working.

CSS (`.wb .s-bkr*`), ported from the prototype's `.bkr`, `.tape`, `.lbl`, `.sticker`, `.stubs` and `.stub`:
- Tape label: `var(--font-vt323)`.
- Objects: 4 columns at 760px and up, 2×2 below.
- `.is-cass` has a top stripe in `--tm-cass`. `.is-tix` uses `--tm-ticket`/`--tm-ticket-ink` with a dashed border.
- Focus-visible outline in `--snes-glow`.
- Sticker rotation only under `prefers-reduced-motion: no-preference`.
- Every text colour meets 4.5:1 on its own background. Check with the audit in Task 10.

- [ ] **Step 4: Run and confirm they pass**

Run: `npx jest __tests__/snes-bkr.test.tsx __tests__/snes-game-page.test.tsx __tests__/snes-routes.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/snes/components/BeKindRewind.tsx app/snes/components/GameView.tsx "app/videogames/snes-history/[slug]/page.tsx" lib/snes/routes.ts app/snes/snes.css __tests__/snes-bkr.test.tsx __tests__/snes-routes.test.ts
git commit -m "feat(snes): Be Kind, Rewind section on every game page

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: The Time Machine page

**Files:**
- Create: `app/videogames/snes-history/time-machine/page.tsx`, `app/snes/components/TimeMachine.tsx` (client), `app/snes/components/YearsStory.tsx` (client)
- Modify: `app/snes/snes.css` (`.s-tm-*` for the screen, cards, shelf, deck and years)
- Test: `__tests__/snes-time-machine.test.tsx`

**Interfaces:**
- Consumes:
  - `Week`, `weekIndexFor`, `gamesForWeek` (Task 2)
  - `story`, `MILESTONES`, `ageAt`, `schoolGrade`, `gradeName` (Task 3)
  - `toToday` (Task 3), `consolePrice`/`gamePrice` (Task 5)
  - `Paper` (Task 6)
  - `IndexGame` and `buildIndex` from `lib/snes/library.ts`, and `gamePath`
- Produces:
  - `<TimeMachine weeks={Week[]} games={TmGame[]} milestones={{ slug; text; date }[]} prices={{ console: { usd; year }; games: Record<slug, { usd; year }> }} />`
  - `TmGame = { slug; title; releasedUS; datePrecision; boxArt: string | null }`

The server page passes only these slim fields to stay inside the budget.

- [ ] **Step 1: Write the failing tests**

```tsx
// __tests__/snes-time-machine.test.tsx
import React from 'react';
import '@testing-library/jest-dom';
import { act, fireEvent, render, screen } from '@testing-library/react';
import TimeMachine from '@/app/snes/components/TimeMachine';
import type { Week } from '@/lib/snes/types';

const mk = (start: string, n: number): Week => ({
  start, song: { title: `Song ${n}`, by: `Artist ${n}`, article: null, art: null }, album: { title: `Album ${n}`, by: 'B', article: null, art: null },
  film: { title: `Film ${n}`, by: null, article: null, art: null, gross: '$1' }, news: n === 2 ? [] : [{ date: start, text: `Story ${n}` }], near: null,
});
const weeks = [mk('1991-08-23', 1), mk('1991-08-30', 2), mk('1991-09-06', 3)];
const games = [
  { slug: 'f-zero', title: 'F-Zero', releasedUS: '1991-08-23', datePrecision: 'day', boxArt: '/snes/box/f-zero.jpg' },
  { slug: 'sept', title: 'September Game', releasedUS: '1991-09', datePrecision: 'month', boxArt: null },
];
const props = { weeks, games, milestones: [{ slug: 'f-zero', text: 'F-Zero came out', date: '1991-08-23' }], prices: { console: { usd: 199.99, year: 1991 }, games: {} } };

beforeEach(() => { window.history.replaceState(null, '', '/videogames/snes-history/time-machine'); localStorage.clear(); });

it('opens on launch week with the LED date, cards, paper and shelf', () => {
  render(<TimeMachine {...props} />);
  expect(screen.getByText('AUG·23·1991')).toBeInTheDocument();
  expect(screen.getByText('Song 1')).toBeInTheDocument();
  expect(screen.getByText('The Omaha World-Pixel')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /F-Zero/ })).toHaveAttribute('href', '/videogames/snes-history/f-zero');
});
it('steps, scrubs (without re-mounting the slider) and keys through weeks', () => {
  render(<TimeMachine {...props} />);
  fireEvent.click(screen.getByRole('button', { name: 'Next week' }));
  expect(screen.getByText('Song 2')).toBeInTheDocument();
  expect(screen.getByText('A quiet week in the news')).toBeInTheDocument();
  const slider = screen.getByRole('slider', { name: /Scrub/ });
  fireEvent.change(slider, { target: { value: '2' } });
  expect(screen.getByText('Song 3')).toBeInTheDocument();
  expect(screen.getByRole('slider', { name: /Scrub/ })).toBe(slider);
  expect(screen.getByText(/Also out in September/)).toBeInTheDocument();
  fireEvent.keyDown(document, { key: 'ArrowLeft' });
  expect(screen.getByText('Song 2')).toBeInTheDocument();
  expect(window.location.search).toBe('?w=1991-08-30');
});
it('opens the week from ?w= and falls back on nonsense', () => {
  window.history.replaceState(null, '', '/x?w=1991-09-08');
  const { unmount } = render(<TimeMachine {...props} />);
  expect(screen.getByText('Song 3')).toBeInTheDocument();
  unmount();
  window.history.replaceState(null, '', '/x?w=banana');
  render(<TimeMachine {...props} />);
  expect(screen.getByText('Song 1')).toBeInTheDocument();
});
it('tells Your SNES years, remembers the year, and survives blocked storage', () => {
  render(<TimeMachine {...props} />);
  expect(screen.getByText(/You were 10 when the Super Nintendo launched/)).toBeInTheDocument();
  expect(screen.getByText(/ShopKo in Omaha, Nebraska/)).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText(/Born in/), { target: { value: '1985' } });
  expect(screen.getByText(/You were 6 when/)).toBeInTheDocument();
  expect(screen.queryByText(/ShopKo/)).toBeNull();
  expect(localStorage.getItem('snes-birth-year')).toBe('1985');
});
it('survives localStorage throwing', () => {
  const get = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
  const set = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
  render(<TimeMachine {...props} />);
  fireEvent.change(screen.getByLabelText(/Born in/), { target: { value: '1990' } });
  expect(screen.getByText(/You were 1 when/)).toBeInTheDocument();
  get.mockRestore(); set.mockRestore();
});
it('jumps to a milestone week', () => {
  render(<TimeMachine {...props} />);
  fireEvent.click(screen.getByRole('button', { name: 'Next week' }));
  fireEvent.click(screen.getByRole('button', { name: /F-Zero came out/ }));
  expect(screen.getByText('Song 1')).toBeInTheDocument();
});
```

- [ ] **Step 2: Run and confirm it fails**

Run: `npx jest __tests__/snes-time-machine.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement `YearsStory`**

```tsx
// app/snes/components/YearsStory.tsx
'use client';

import { useEffect, useState } from 'react';
import { ageAt, gradeName, schoolGrade, story, WES_BIRTH_YEAR } from '@/lib/snes/years';
import { SHORT_MONTHS } from '@/lib/snes/display';

// "Your SNES years": a birth year turns the era into a personal story (Wes's 1981 version by default). The year is
// remembered in this browser; if storage is blocked the story still works.
const KEY = 'snes-birth-year';

export default function YearsStory({ milestones, onJump }: { milestones: { slug: string; text: string; date: string }[]; onJump: (date: string) => void }) {
  const [year, setYear] = useState(WES_BIRTH_YEAR);
  useEffect(() => {
    try {
      const saved = Number(localStorage.getItem(KEY));
      if (saved >= 1965 && saved <= 2012) setYear(saved);
    } catch { /* storage blocked: keep 1981 */ }
  }, []);
  const change = (v: string) => {
    const n = Number(v);
    if (!Number.isInteger(n) || n < 1965 || n > 2012) return;
    setYear(n);
    try { localStorage.setItem(KEY, String(n)); } catch { /* storage blocked */ }
  };
  const s = story(year);
  return (
    <section className="s-tm-years" aria-label="Your SNES years">
      <label htmlFor="tm-born"><b>📼 Your SNES years.</b> Born in </label>
      <input id="tm-born" type="number" inputMode="numeric" min={1965} max={2012} defaultValue={year} key={year} onChange={(e) => change(e.target.value)} />
      <p>{s.lead} {s.wes ? <>{s.wes} </> : null}{s.close}</p>
      <div className="s-tm-ms">
        {milestones.map((m) => {
          const [y, mo] = m.date.split('-').map(Number);
          const age = ageAt(year, m.date);
          const who = age < 0 ? 'before you were born' : `you were ${age}, ${gradeName(schoolGrade(year, m.date))}`;
          return <button key={m.slug} type="button" onClick={() => onJump(m.date)}><b>{SHORT_MONTHS[mo - 1]} {y}</b> · {m.text}: {who}</button>;
        })}
      </div>
    </section>
  );
}
```

Milestones arrive as a prop, with their dates resolved by the server page. Note that `defaultValue` + `key={year}` re-mounts the input when the saved year loads. Use a controlled `value` with a string state instead if the test or typing feels jumpy, keeping `change` validation on blur.

- [ ] **Step 4: Implement `TimeMachine`.** It builds on the prototype's T1.
  - **State:** a single `i` (week index), read from `?w=` after mount with `weekIndexFor`. The fallback is launch week; a value that isn't a date gives 0.
  - **URL:** after a change, `history.replaceState(null, '', \`?w=${weeks[i].start}\`)`. Skip the first render so a plain URL stays plain.
  - **Screen** (`.s-tm-screen`):
    - LED date `MON·DD·YYYY` in `--font-vt323` and "Week N of total"
    - four cards (song, album, film, price check), each with art `<img width height loading="lazy">` and an `<a>` to Wikipedia when there is an article
    - the price card: "A Super NES: $199.99 · about $X in today's money", plus "‹Game›: $Y then, about $Z today" for the first game this week that has a researched price
    - `<Paper week weekNumber />`
    - the shelf: exact games ("On SNES shelves this week · n") and month games ("Also out in ‹Month› (exact day unknown) · n", first 12, then "+N more"). Each cover is a `next/link` to `gamePath(slug)` with `prefetch={false}` and the title under it.
  - **Deck:** rendered once **outside** the part that changes with `i` (siblings, not children), so the slider element is stable. It holds:
    - `<button aria-label="Previous week">◀◀</button>` and `<button aria-label="Next week">▶▶</button>`
    - `<input type="range" aria-label="Scrub through the weeks" min=0 max=len-1 value={i} onChange>`
    - `<button aria-label="Random week">⏏</button>`
    - year ticks '91–'98
    On phones it is `position: sticky; bottom: env(safe-area-inset-bottom)`.
  - **Keyboard:** a document `keydown` listener steps on ArrowLeft/ArrowRight unless the event target is an input, select, textarea or button.
  - **YearsStory** sits on top. `onJump(date)` sets `i = weekIndexFor(weeks, date)` and scrolls the screen into view (`scrollIntoView` is guarded, because jsdom lacks it).

- [ ] **Step 5: Implement the page**

```tsx
// app/videogames/snes-history/time-machine/page.tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { Nav } from '../../../components/Nav';
import Footer from '../../../components/Footer';
import { getGames, getPrices, getWeeks } from '@/lib/snes/data';
import { MILESTONES } from '@/lib/snes/years';
import { SNES_BASE } from '@/lib/snes/routes';
import TimeMachine from '../../../snes/components/TimeMachine';
import { fraktur, vt323 } from '../../../snes/fonts';
import '../../../snes/snes.css';

export const metadata: Metadata = {
  title: 'SNES Time Machine',
  description: 'Every week of the Super Nintendo era: the #1 song, album and movie, the news, and the games on the shelf.',
  robots: { index: false, follow: false },
};

export default function TimeMachinePage() {
  const games = getGames();
  const prices = getPrices();
  const slim = games.map((g) => ({ slug: g.slug, title: g.title, releasedUS: g.releasedUS, datePrecision: g.datePrecision, boxArt: g.boxArt }));
  const milestones = MILESTONES.flatMap((m) => { const g = games.find((x) => x.slug === m.slug); return g ? [{ ...m, date: g.releasedUS }] : []; });
  const year = (d: string) => Number(d.slice(0, 4));
  return (
    <>
      <Nav theme />
      <main className={`wb wb-page ${vt323.variable} ${fraktur.variable}`}>
        <div className="s-wrap">
          <header className="s-hero">
            <div className="eyebrow"><Link href={SNES_BASE}>The Super Nintendo in America</Link></div>
            <h1>SNES Time Machine</h1>
            <p>Every week from launch day, August 23, 1991, to the last cart in 1998: the #1 song, album and movie, what was in the news, and what was new on the shelf.</p>
          </header>
          <TimeMachine
            weeks={getWeeks()} games={slim} milestones={milestones}
            prices={{ console: { usd: prices.hardware[0].usd, year: year(prices.hardware[0].date) }, games: Object.fromEntries(Object.entries(prices.games).map(([s, p]) => [s, { usd: p.usd, year: year(p.date) }])) }}
          />
          <p className="s-tm-credit">Charts: Billboard Hot 100 and Billboard 200 by issue week. Movies: weekend US box office (Box Office Mojo, via Wikipedia). News: Wikipedia, “YEAR in the United States”. Covers and posters: each item’s Wikipedia article, shown small. Prices in today’s money use the US CPI-U ({'2025'} dollars).</p>
        </div>
      </main>
      <Footer />
    </>
  );
}
```

Use the `NOW_YEAR` constant from `money.ts` in the credit line instead of the literal `{'2025'}`.

- [ ] **Step 6: Run the tests, then check the build and the budget**

Run: `npx jest __tests__/snes-time-machine.test.tsx && npm test`
Expected: PASS, and the build lists `/videogames/snes-history/time-machine`.

Then measure:

```bash
gzip -c out/videogames/snes-history/time-machine.html | wc -c
gzip -c out/videogames/snes-history/time-machine.txt | wc -c
```

Expected: the sum is ≤ 153600. If it's over, drop `article` from the client props (pass prebuilt Wikipedia URLs only for the current week, computed client-side from a slim `article` string, or move titles to a lookup table) until it fits.

- [ ] **Step 7: Commit**

```bash
git add app/videogames/snes-history/time-machine app/snes/components/TimeMachine.tsx app/snes/components/YearsStory.tsx app/snes/snes.css __tests__/snes-time-machine.test.tsx
git commit -m "feat(snes): the Time Machine page — scrub every week of the SNES era

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Links in

**Files:**
- Modify: `app/snes/components/FilterBar.tsx` (or the library header in `app/videogames/snes-history/page.tsx`: put the link in the hero, under the paragraph, so the compact bar stays one row), `app/videogames/page.tsx` (second hub card)
- Test: extend `__tests__/snes-hub.test.tsx` and `__tests__/snes-library-page.test.tsx`

- [ ] **Step 1: Write the failing tests.** In the hub test:

```tsx
expect(screen.getByRole('link', { name: /SNES Time Machine/ })).toHaveAttribute('href', '/videogames/snes-history/time-machine');
```

In the library page test:

```tsx
expect(screen.getByRole('link', { name: /Time Machine/ })).toHaveAttribute('href', '/videogames/snes-history/time-machine');
```

- [ ] **Step 2: Run and confirm they fail**

Run: `npx jest __tests__/snes-hub.test.tsx __tests__/snes-library-page.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement.**
  - **Hub card:** uses `/snes/pop/<launch-week album art id>.webp`, or the F-Zero box if that art is missing. Title "SNES Time Machine"; text "Every week, 1991–1998: the #1 song, album and movie, the news, and the new games".
  - **Library hero:** add a line `<p className="s-hero-links"><Link href={TIME_MACHINE}>📼 Open the Time Machine →</Link></p>`.

- [ ] **Step 4: Run and confirm they pass**

Run: `npx jest __tests__/snes-hub.test.tsx __tests__/snes-library-page.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/videogames/page.tsx app/videogames/snes-history/page.tsx app/snes/snes.css __tests__/snes-hub.test.tsx __tests__/snes-library-page.test.tsx
git commit -m "feat(snes): link the Time Machine from the hub and the library

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9b: Link the section from the main site: header, featured homepage project, richer hub

Added 11 Oct 2026 at Wes's request: "yes add the header link homepage tile and new hub… make the snes history thing the new featured tile on the homepage". Search engines stay blocked (noindex + robots `Disallow: /videogames` unchanged).

**Files:**
- Modify: `app/components/Nav.tsx`, `lib/projects.ts`, `app/components/home/FeaturedBuild.tsx` (and `Print.tsx` if its link label assumes GitHub), `app/videogames/page.tsx`, `app/snes/snes.css`
- Create: `public/projects/snes-history.jpg` (cover collage), `app/snes/components/OnThisDay.tsx` (client), `lib/snes/onThisDay.ts` (pure)
- Test: `__tests__/projects.test.ts`, `__tests__/nav.test.tsx` (create if absent, or extend the existing header test), `__tests__/snes-hub.test.tsx`, `__tests__/snes-on-this-day.test.ts(x)`

**Interfaces:**
- Consumes: `getWeeks()`, `weekIndexFor`, `gamesForWeek` (Tasks 2 and 4), `Paper` is NOT used here, `TIME_MACHINE`/`timeMachinePath` (Task 7), `SNES_BASE`, `gamePath`.
- Produces: `onThisDay(weeks: Week[], today: string, year: number): number`, which returns the index of the week in `year` (1991–1998) that holds the same month and day as `today`, clamped to the data range. Plus `ON_THIS_DAY_YEARS`, the years that have a week for that date. For example, Jan–Aug 22 has no 1991 week, and after Oct 2 there is no 1998 week.

**1. Header.**
- `NAV_LINKS` becomes Projects · Games · Connect. "Games" links to `/videogames` with a plain `next/link` (not the home-page scroll handler).
- Mark the link `aria-current="page"` when the pathname starts with `/videogames`, and style that state with the header's existing active/accent treatment, or add a minimal one in design-system.css.
- At 375 px the header must stay usable. It may wrap like today, but no link may be clipped, and touch targets must be ≥ 44 px tall.
- Test: the three links in order, the Games href, and `aria-current` on a `/videogames/snes-history` pathname (mock `usePathname`).

**2. Featured homepage project.**
- Add a PERSONAL project to `lib/projects.ts` and set `FEATURED = 'snes'`:
  - `key: 'snes'`, `name: 'SNES History'`
  - `group: 'Everything else'` (it is excluded from its group while featured)
  - `kind: 'Next.js · TypeScript'`, `fit: 'shot'`
  - `subtitle: 'Every US Super Nintendo game, 1991–1998'`
  - `description`: two plain sentences, along the lines of "A playable history of the Super Nintendo in America: all 717 US releases on a month-by-month timeline, cover wall, shelf and score scatter, with box art, magazine scores and gameplay clips. A week-by-week time machine shows what was on the radio, at the movies and in the news when each game came out." Keep to CLAUDE.md content rules. The existing test bans digits only for WBDB, so "717" is fine.
  - `chips: ['Timeline', 'Cover wall', 'Game shelf', 'Score scatter', 'Time Machine', 'Gameplay clips']`, `chipsLabel: 'Ways in'`
  - `image: '/projects/snes-history.jpg'`, `alt: 'A collage of Super Nintendo box art'`
  - `href: '/videogames/snes-history'`
- **Badge:** the badge union gains `'Live on this site'`; this project uses it. Update the projects test rule: Private repo → no href; Open source → GitHub href; Live on this site → href starts with `/`.
- **FeaturedBuild and Print:** an internal href (starting with `/`) opens in the same tab (no `target`/`rel`). The print's label reads `Open SNES History`, and the button reads "Explore it →" instead of "View on GitHub →". GitHub projects keep today's behaviour.
- **The collage** `public/projects/snes-history.jpg` (Task 9c later replaces this with the V3 share-card render; build this placeholder so 9b stands alone): build it once with a small throwaway Python/Pillow snippet (not committed) from 12 iconic covers in `public/snes/box/`: super-mario-world, the-legend-of-zelda-a-link-to-the-past, super-metroid, f-zero, chrono-trigger, donkey-kong-country, street-fighter-ii-the-world-warrior, star-fox, super-mario-kart, final-fantasy-iii, earthbound, mega-man-x. Skip any that are missing and substitute others with box art. Lay them out as a 4×3 grid, about 1200×840, JPEG q≈82, under 250 KB. Print sizes the image itself; check how other `fit: 'shot'` images look and match their aspect.
- Neo returns to its group automatically. Update any test that pins `FEATURED === 'neo'` or the group contents.

**3. The /videogames hub.**
- **Cards:** keep the SNES History card. Add:
  - **"SNES Time Machine"**: image `/snes/pop/unforgettable-with-love.webp`, or the F-Zero box if that file is missing; text "Every week, 1991–1998: the #1 song, album and movie, the news, and the new games".
  - **"Coming soon: Wes's Analogue Pocket run"**: not a link. Dimmed (`aria-disabled` is not needed on a non-link), with the text "Played, beaten, rated — my run through the library on an Analogue Pocket." A `<div>`, not an `<a>`.
- **"On this day in SNES history" strip** (`OnThisDay`, client), placed above the cards:
  - It receives slim week data from the server page: `{ start, song: {title, by}, film: {title}, lead: string | null, games: number }[]`. `lead` is the first news text or the near text. `games` is the count of exact-date games that week plus month-only games in that week's month. The payload must stay small, so test that the serialized prop is under 60 KB raw.
  - After mount it reads today's date in the visitor's time zone, picks a random year from `ON_THIS_DAY_YEARS` for that date, and shows: "This week in ‹YEAR›" · #1 song (title — artist) · #1 movie · the lead headline · "N new SNES games" · a link "Open this week in the Time Machine →" (`timeMachinePath(start)`). ◀ ▶ buttons (aria-labels "Earlier year" / "Later year") cycle the years.
  - The server render shows a neutral placeholder card with the same height, so there is no layout shift and nothing date-dependent is baked into the static HTML.
- **Styling:** reuse the dark screen look (`--screen`, `--screen-2`) with `--tm-led` for the year, in `app/snes/snes.css`. Phone width: everything stacks, nothing overflows.
- **Tests:**
  - `onThisDay`: Aug 23 1991 → week 0; Oct 6 → 1998 week holding 1998-10-02; Jan 10 → no 1991; Dec 25 → no 1998.
  - The hub renders three cards, one of them not a link.
  - With `jest.useFakeTimers().setSystemTime(new Date('2026-03-14T12:00:00'))` and `Math.random` mocked, `OnThisDay` shows the expected year's song and a Time Machine link; ◀ ▶ change the year.

- [ ] Write the failing tests; run them and see them fail.
- [ ] Implement 1–3.
- [ ] `npx jest` passes; `npm test` builds.
- [ ] Commit `feat(snes): link Games from the header, feature SNES History on the homepage, richer /videogames hub` (with Co-Authored-By line).

---

### Task 9c: Share cards for /videogames/snes-history and /videogames, plus robots.txt

Added 11 Oct 2026 at Wes's request: "i need a cool social share card for the snes-history too and also for videogames". He picked the designs in https://claude.ai/artifact/5e3MLNeC4V1Qpg3hbTr7hj:
- **S1 "Cover wall"** for `/videogames/snes-history`
- **V3 "Wall + windows"** for `/videogames`

He also approved a robots.txt change: remove `Disallow: /videogames` and keep the `noindex` meta on every page. X and LinkedIn obey robots.txt, so the block would leave a bare link; noindex alone keeps Google out.

**Reference:** the exact HTML/CSS of both cards is in `.superpowers/sdd/2026-10-11-snes-time-machine/share-card-reference.html` (sections `.s1` and `.v3`). Its F-Zero frame is `.superpowers/sdd/2026-10-11-snes-time-machine/fz-frame.png`. Copy that into the repo as `scripts/og/assets/f-zero-frame.png`, which is the input for the card script.

**Files:**
- Modify: `scripts/og/build-og.py` (two new cards in `CARDS`), `public/robots.txt`, `app/videogames/snes-history/page.tsx` (metadata), `app/videogames/page.tsx` (metadata), `app/videogames/snes-history/time-machine/page.tsx` (metadata: reuse the SNES card), `CLAUDE.md` (the rebuild command)
- Create (generated, committed): `public/og-snes.png`, `public/og-videogames.png` (both 1200×630), `scripts/og/assets/f-zero-frame.png`
- Modify (from Task 9b): `public/projects/snes-history.jpg`, which becomes a JPEG of the V3 card render instead of the plain 12-cover grid
- Test: `__tests__/snes-og.test.ts`

**1. `build-og.py`.**
- Add `'snes': ('og-snes.png', snes_card)` and `'videogames': ('og-videogames.png', videogames_card)`. Follow the existing pattern: HTML laid out at 1200×630, rendered by headless Chrome at 2x, then downsampled, with fonts inlined from `scripts/og/*.woff2`.
- **Fonts:** the site's Source Serif 4 and IBM Plex. VT323 and UnifrakturMaguntia aren't in `scripts/og/` yet; add their woff2 files from Google Fonts (OFL-licensed) the same way the others were added.
- **Covers:** read them from `public/snes/box/<slug>.jpg`, choosing the 48 highest EGM-average games with box art from `data/snes/games.json`. This makes the cards rebuildable and deterministic (sort by score desc, then slug).
- **Scatter windows:** use the real EGM points (the same x mapping as `xForDate`, y range 3.5–10).
- **Copy:**
  - S1: eyebrow "The Super Nintendo in America", title "Every US SNES game, 1991–1998" with the years kept together, the line "717 games · timeline, cover wall, game shelf, score scatter and a week-by-week time machine", and the LED date "AUG·23·1991" plus "wesleybard.com". The game count comes from games.json.
  - V3: eyebrow "Wesley Bard", title "Video games", the line "Every US Super Nintendo game, gameplay clips, and a week-by-week time machine." The windows are the gameplay clip (F-Zero frame), The Omaha World-Pixel (launch-week headline plus "#1: BRYAN ADAMS", read from `data/snes/weeks.json` week 0), the score scatter with its Hall of Fame band, and the shelf (12 cover spines). Footer "wesleybard.com/videogames".
- **Featured homepage image:** after rendering V3, also save `public/projects/snes-history.jpg` (JPEG q≈85) from the same render, cropped or resized to the aspect the featured Print uses. Check `app/components/home/Print.tsx` and the existing `fit: 'shot'` images. Keep it under 300 KB.

**2. Metadata.**
- `/videogames/snes-history`, its Time Machine page and `/videogames` each set `openGraph` (title, description, url, `images: [{ url, width: 1200, height: 630, alt }]`) and `twitter: { card: 'summary_large_image', ... }`. The library and the Time Machine use `/og-snes.png`; the hub uses `/og-videogames.png`. Relative URLs resolve against `metadataBase` in `app/layout.tsx`.
- `robots: { index: false, follow: false }` stays on all three. Game pages and company pages keep their current metadata and can inherit the site card; per-game cards are not in scope.

**3. robots.txt.** Remove only the `Disallow: /videogames` line and adjust the comment. `/health` stays disallowed.

**4. Tests (`__tests__/snes-og.test.ts`).**
- Both PNGs exist and are exactly 1200×630 (read the IHDR bytes; no new dependencies).
- `public/robots.txt` no longer disallows `/videogames` but still disallows `/health`.
- The three pages' exported `metadata` contain the right `openGraph.images[0].url`, `twitter.card === 'summary_large_image'`, and `robots.index === false`.

- [ ] Write the failing tests; run them and see them fail.
- [ ] Implement, then run `python3 scripts/og/build-og.py snes videogames`. Look at both PNGs, and report their sizes and that they match the reference.
- [ ] `npx jest` passes; `npm test` builds.
- [ ] Commit `feat(snes): share cards for the SNES history and the video games hub` (with the Co-Authored-By line).

---

### Task 10: End-to-end usability and readability audit (every SNES screen)

Wes asked for a thorough audit of every screen. The controller runs this in a real browser after `npm test` builds `out/`. Use the static preview (`.claude/launch.json` → `snes-static`, or the `snes-history-static` entry on port 4321) and the Playwright tools.

**Screens:**
1. `/videogames`
2. `/videogames/snes-history` in each of the five views (Timeline, Heatmap, Wall, Shelf, Scatter) and with the Filters panel open
3. A day-precision game page (`/f-zero`), a month-precision one, one with no art and no clip, and one with a researched price
4. A company page
5. `/videogames/snes-history/time-machine` at launch week, at a week with no in-week news, and at the last week

**Each screen is checked at:**
- 375×812 (touch emulation), 768×1024 and 1280×800
- light and dark mode
- keyboard only (Tab order, visible focus, Enter/Space work, ← → on the Time Machine)
- 200% browser zoom at 1280

**Checklist:**
- **Text contrast:** compute it with `getComputedStyle` in a script over every text node's colour against its effective background. It must be ≥ 4.5:1 for body text and ≥ 3:1 for large text (24px+, or 18.66px bold). This includes the paper, the tape label, the ticket, LED text, chips and dot labels.
- **Sizes:** no text under 12px except tick labels (≥ 11px), and touch targets at least 44×44 px on phones (deck buttons, view tabs, key buttons, milestones, tiles).
- **Overflow:** no horizontal page scroll at any width. Long titles wrap or truncate with an ellipsis, never clip mid-glyph. Try "Teenage Mutant Ninja Turtles IV: Turtles in Time" and "Super Mario RPG: Legend of the Seven Stars".
- **Images:** every image has a width and height (no layout shift). Decorative images have `alt=""`. Every link and button has an accessible name.
- **Phones:** tap-to-preview works (first tap plays with sound, second opens). The Time Machine slider drags smoothly, and the sticky deck never covers content you can't scroll past.
- **Reduced motion:** with reduced motion emulated, there are no tilts, no autoplay and no smooth scrolling.
- **Reading:** headings are in order (h1 → h2 → h3), copy is plain, no "undefined"/"null"/"NaN" appears anywhere, and empty states read sensibly.
- **Console:** no console errors or 404s in the network log.

**Output:**
- Write `docs/superpowers/audits/2026-10-11-snes-audit.md`: a table of screen × viewport × theme with pass/fail per check, plus a findings list ranked by severity (blocker / should fix / nice to have), with a screenshot path for each.
- Fix every blocker and should-fix in this task, one commit per area, each with a regression test where a test can pin it (e.g. a contrast check on token pairs in `__tests__/snes-css.test.ts`).
- Re-run the failing checks, and record before/after in the audit doc.
- Commit with: `git commit -m "fix(snes): audit fixes — <area>"` (plus the Co-Authored-By line).

---

## Execution notes for the controller

- Tasks 1→2→3 are pure and sequential.
- Task 4 needs 1 and 2. Task 5 is independent research: run it in parallel with Tasks 1–4 in its own worktree, then cherry-pick.
- Task 6 needs only `Week` (from Task 2). Tasks 7 and 8 need 3–6. Task 9 needs 8.
- Task 10 runs last, after the scatter work (a separate commit series by another agent) has landed, so the audit covers it too.
