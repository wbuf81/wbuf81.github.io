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

/** Art-override ids that match no article in the charts (typos or stale ids), as build errors. */
export function unknownArtOverrides(articles: string[], art: Record<string, unknown>): string[] {
  const known = new Set(articles.map(artId));
  return Object.keys(art).filter((id) => !known.has(id)).map((id) => `art override names unknown id ${id}`);
}
