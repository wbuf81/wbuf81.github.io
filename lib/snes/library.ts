/*
 * Everything /snes computes from the dataset, pure and tested: the slim index the browser gets, filters,
 * sorting, URL state, month groups, heatmap counts, scatter points and timeline neighbours.
 */
import type { DatePrecision, Game } from './types.ts';
import { normalizeTitle, slugify } from './titles.ts';

export type ScoreFlag = 'egm' | 'np' | 'egm8';
export type SortKey = 'date' | 'title' | 'egm' | 'np' | 'aggregate';
export type ViewKey = 'timeline' | 'heatmap' | 'wall' | 'shelf' | 'scatter';
export type ScoreAxis = 'egm' | 'np' | 'aggregate';
export const VIEWS: ViewKey[] = ['timeline', 'heatmap', 'wall', 'shelf', 'scatter'];
export const SORTS: SortKey[] = ['date', 'title', 'egm', 'np', 'aggregate'];
export const AXES: ScoreAxis[] = ['egm', 'np', 'aggregate'];
export const SCORE_FLAGS: ScoreFlag[] = ['egm', 'np', 'egm8'];
export const FIRST_YEAR = 1991;
export const LAST_YEAR = 1998;

export interface IndexGame {
  slug: string;
  title: string;
  /** normalizeTitle(title), for search. */
  search: string;
  releasedUS: string;
  datePrecision: DatePrecision;
  publisher: string;
  developers: string[];
  genres: string[];
  players: number | null;
  chip: string | null;
  chipSlug: string | null;
  launchTitle: boolean;
  egmAvg: number | null;
  /** Nintendo Power on a 0–10 scale. */
  np10: number | null;
  aggregate: number | null;
  boxArt: string | null;
  thumb: string | null;
  video: string | null;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

type Dated = { releasedUS: string; datePrecision: DatePrecision; title: string };
const dateParts = (d: string) => {
  const [y, m, day] = d.split('-').map(Number);
  return { y, m: m || 13, day: day || 0 }; // a year-only date sorts after December
};

export function compareRelease(a: Dated, b: Dated): number {
  const pa = dateParts(a.releasedUS);
  const pb = dateParts(b.releasedUS);
  if (pa.y !== pb.y) return pa.y - pb.y;
  if (pa.m !== pb.m) return pa.m - pb.m;
  const ra = a.datePrecision === 'day' ? 0 : 1;
  const rb = b.datePrecision === 'day' ? 0 : 1;
  if (ra !== rb) return ra - rb;
  if (pa.day !== pb.day) return pa.day - pb.day;
  return a.title.localeCompare(b.title);
}

export function buildIndex(games: Game[]): IndexGame[] {
  return games
    .map((g) => {
      const egm = g.scores.egm;
      const np = g.scores.nintendoPower;
      return {
        slug: g.slug,
        title: g.title,
        search: normalizeTitle(g.title),
        releasedUS: g.releasedUS,
        datePrecision: g.datePrecision,
        publisher: g.publisher,
        developers: g.developers,
        genres: g.genres,
        players: g.players,
        chip: g.chip,
        chipSlug: g.chip ? slugify(g.chip) : null,
        launchTitle: g.launchTitle,
        egmAvg: egm && egm.length ? round1(egm.reduce((s, n) => s + n, 0) / egm.length) : null,
        np10: np ? round1((np.score / np.scale) * 10) : null,
        aggregate: g.scores.aggregate,
        boxArt: g.boxArt,
        thumb: g.boxArt ? `/snes/thumb/${g.slug}.jpg` : null,
        video: g.media?.video ? `/snes/video/${g.slug}.mp4` : null,
      };
    })
    .sort(compareRelease);
}

export interface Filters {
  q: string;
  years: number[];
  publisher: string | null;
  developer: string | null;
  chip: string | null;
  scores: ScoreFlag[];
  launch: boolean;
  genre: string | null;
  players: number | null;
  sort: SortKey;
  view: ViewKey;
  y: ScoreAxis;
}

export const DEFAULT_FILTERS: Filters = {
  q: '', years: [], publisher: null, developer: null, chip: null, scores: [], launch: false,
  genre: null, players: null, sort: 'date', view: 'timeline', y: 'egm',
};

export function matches(g: IndexGame, f: Filters): boolean {
  if (f.q) {
    const q = normalizeTitle(f.q);
    if (q && !g.search.includes(q)) return false;
  }
  if (f.years.length && !f.years.includes(Number(g.releasedUS.slice(0, 4)))) return false;
  if (f.publisher && g.publisher !== f.publisher) return false;
  if (f.developer && !g.developers.includes(f.developer)) return false;
  if (f.chip && g.chipSlug !== f.chip) return false;
  if (f.scores.includes('egm') && g.egmAvg === null) return false;
  if (f.scores.includes('np') && g.np10 === null) return false;
  if (f.scores.includes('egm8') && (g.egmAvg ?? 0) < 8) return false;
  if (f.launch && !g.launchTitle) return false;
  if (f.genre && !g.genres.includes(f.genre)) return false;
  if (f.players && (g.players ?? 0) < f.players) return false;
  return true;
}

export const filterGames = (games: IndexGame[], f: Filters) => games.filter((g) => matches(g, f));

export function isFiltered(f: Filters): boolean {
  return Boolean(f.q || f.years.length || f.publisher || f.developer || f.chip || f.scores.length || f.launch || f.genre || f.players);
}

const scoreOf = (g: IndexGame, key: 'egm' | 'np' | 'aggregate') => (key === 'egm' ? g.egmAvg : key === 'np' ? g.np10 : g.aggregate);

export function sortGames(games: IndexGame[], key: SortKey): IndexGame[] {
  const out = [...games];
  if (key === 'date') return out.sort(compareRelease);
  if (key === 'title') return out.sort((a, b) => a.search.localeCompare(b.search) || compareRelease(a, b));
  return out.sort((a, b) => {
    const sa = scoreOf(a, key);
    const sb = scoreOf(b, key);
    if (sa === null && sb === null) return compareRelease(a, b);
    if (sa === null) return 1;
    if (sb === null) return -1;
    return sb - sa || compareRelease(a, b);
  });
}

export interface Facet {
  slug: string;
  name: string;
  count: number;
}
export interface Facets {
  publishers: Facet[];
  developers: Facet[];
  chips: Facet[];
  genres: string[];
  players: number[];
}

const tally = (entries: [string, string][]): Facet[] => {
  const map = new Map<string, Facet>();
  for (const [slug, name] of entries) {
    const cur = map.get(slug) ?? { slug, name, count: 0 };
    cur.count++;
    map.set(slug, cur);
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
};

export function facets(games: IndexGame[], names: Record<string, string>): Facets {
  return {
    publishers: tally(games.map((g) => [g.publisher, names[g.publisher] ?? g.publisher])),
    developers: tally(games.flatMap((g) => g.developers.map((d): [string, string] => [d, names[d] ?? d]))),
    chips: tally(games.filter((g) => g.chip).map((g) => [g.chipSlug!, g.chip!])),
    genres: [...new Set(games.flatMap((g) => g.genres))].sort(),
    players: [...new Set(games.map((g) => g.players ?? 0).filter((n) => n >= 2))].sort((a, b) => a - b),
  };
}

export interface QueryContext {
  publishers: Set<string>;
  developers: Set<string>;
  chips: Set<string>;
  genres: Set<string>;
}

export function queryContext(f: Facets): QueryContext {
  return {
    publishers: new Set(f.publishers.map((p) => p.slug)),
    developers: new Set(f.developers.map((d) => d.slug)),
    chips: new Set(f.chips.map((c) => c.slug)),
    genres: new Set(f.genres),
  };
}

export function parseQuery(search: string, ctx: QueryContext): Filters {
  const p = new URLSearchParams(search);
  const list = (k: string) => (p.get(k) ?? '').split(',').filter(Boolean);
  const pick = <T extends string>(k: string, allowed: readonly T[], fallback: T) => {
    const v = p.get(k) as T | null;
    return v && allowed.includes(v) ? v : fallback;
  };
  const inSet = (k: string, set: Set<string>) => {
    const v = p.get(k);
    return v && set.has(v) ? v : null;
  };
  const players = Number(p.get('players'));
  return {
    q: (p.get('q') ?? '').slice(0, 80),
    years: [...new Set(list('year').map(Number).filter((y) => Number.isInteger(y) && y >= FIRST_YEAR && y <= LAST_YEAR))].sort(),
    publisher: inSet('publisher', ctx.publishers),
    developer: inSet('developer', ctx.developers),
    chip: inSet('chip', ctx.chips),
    scores: SCORE_FLAGS.filter((s) => list('scores').includes(s)),
    launch: p.get('launch') === '1',
    genre: inSet('genre', ctx.genres),
    players: Number.isInteger(players) && players >= 2 && players <= 8 ? players : null,
    sort: pick('sort', SORTS, 'date'),
    view: pick('view', VIEWS, 'timeline'),
    y: pick('y', AXES, 'egm'),
  };
}

export function toQuery(f: Filters): string {
  const p = new URLSearchParams();
  if (f.q) p.set('q', f.q);
  if (f.years.length) p.set('year', f.years.join(','));
  if (f.publisher) p.set('publisher', f.publisher);
  if (f.developer) p.set('developer', f.developer);
  if (f.chip) p.set('chip', f.chip);
  if (f.scores.length) p.set('scores', f.scores.join(','));
  if (f.launch) p.set('launch', '1');
  if (f.genre) p.set('genre', f.genre);
  if (f.players) p.set('players', String(f.players));
  if (f.sort !== 'date') p.set('sort', f.sort);
  if (f.view !== 'timeline') p.set('view', f.view);
  if (f.y !== 'egm') p.set('y', f.y);
  const s = p.toString();
  return s ? `?${s}` : '';
}

export interface MonthGroup {
  key: string;
  year: number;
  month: number | null;
  games: IndexGame[];
}

export function groupByMonth(games: IndexGame[]): MonthGroup[] {
  const out: MonthGroup[] = [];
  for (const g of games) {
    const key = g.datePrecision === 'year' ? g.releasedUS.slice(0, 4) : g.releasedUS.slice(0, 7);
    const last = out[out.length - 1];
    if (last && last.key === key) last.games.push(g);
    else out.push({ key, year: Number(key.slice(0, 4)), month: key.length === 7 ? Number(key.slice(5, 7)) : null, games: [g] });
  }
  return out;
}

export interface HeatCell {
  key: string;
  year: number;
  month: number;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
  pre: boolean;
}

export function heatmapCounts(games: IndexGame[]): HeatCell[] {
  const counts = new Map<string, number>();
  for (const g of games) if (g.releasedUS.length >= 7) counts.set(g.releasedUS.slice(0, 7), (counts.get(g.releasedUS.slice(0, 7)) ?? 0) + 1);
  const max = Math.max(1, ...counts.values());
  const cells: HeatCell[] = [];
  for (let year = FIRST_YEAR; year <= LAST_YEAR; year++) {
    for (let month = 1; month <= 12; month++) {
      const key = `${year}-${String(month).padStart(2, '0')}`;
      const count = counts.get(key) ?? 0;
      const level = (count === 0 ? 0 : Math.min(4, 1 + Math.floor((count / max) * 3.999))) as HeatCell['level'];
      cells.push({ key, year, month, count, level, pre: year === FIRST_YEAR && month < 8 });
    }
  }
  return cells;
}

export interface ScatterPoint {
  slug: string;
  title: string;
  x: number;
  y: number;
}

const START = FIRST_YEAR * 12 + 7; // August 1991, months counted from year 0
const END = LAST_YEAR * 12 + 12; // the end of December 1998

export function xForDate(releasedUS: string): number {
  const [y, m, d] = releasedUS.split('-').map(Number);
  const month = m ? m - 1 : 6;
  const within = d ? (d - 1) / 31 : m ? 0.5 : 0;
  return Math.min(100, Math.max(0, ((y * 12 + month + within - START) / (END - START)) * 100));
}

export function scatterPoints(games: IndexGame[], axis: ScoreAxis): ScatterPoint[] {
  return games
    .map((g) => {
      const v = scoreOf(g, axis);
      return v === null ? null : { slug: g.slug, title: g.title, x: xForDate(g.releasedUS), y: axis === 'aggregate' ? round1(v / 10) : v };
    })
    .filter((p): p is ScatterPoint => p !== null);
}

/** The best-scoring points that can carry a label without two labels touching. */
export function labelPoints(points: ScatterPoint[], max = 8): string[] {
  const chosen: ScatterPoint[] = [];
  for (const p of [...points].sort((a, b) => b.y - a.y || a.x - b.x)) {
    if (chosen.length >= max) break;
    if (chosen.every((c) => Math.abs(c.x - p.x) >= 9 || Math.abs(c.y - p.y) >= 0.9)) chosen.push(p);
  }
  return chosen.map((p) => p.slug);
}

export function neighbours(sorted: IndexGame[], slug: string): { prev: IndexGame | null; next: IndexGame | null } {
  const i = sorted.findIndex((g) => g.slug === slug);
  return { prev: i > 0 ? sorted[i - 1] : null, next: i >= 0 && i < sorted.length - 1 ? sorted[i + 1] : null };
}
