/*
 * Compact client props for the Time Machine. The page ships all 372 weeks and every game to the browser, twice (HTML
 * and the RSC .txt), so derivable fields are dropped: an article equal to its title, art paths that follow
 * /snes/pop/<artId(article)>.webp, box art at /snes/box/<slug>.jpg, and precision (read from the date's length); each
 * pop item is stored once and referenced by index, and news dates become day offsets.
 * Anything that breaks a rule is kept as written, so packing is always lossless.
 */
import type { Week } from './types.ts';
import { artId } from './weeks.ts';

type Item = Week['song'];
/** [title, by, article (1 = same as title), art (1 = derived from article, 0 = none)] */
type PItem = [string, string | null, string | 1 | null, string | 1 | 0];
/** News dates are stored as day offsets from the week's start (negative for the "near" story before the week). */
export type PackedWeeks = { items: PItem[]; weeks: [string, number, number, number, string | null, [number, string][], [number, string] | null][] };

const DAY = 86400000;
const ms = (iso: string) => Date.parse(`${iso}T00:00:00Z`);
const offset = (start: string, iso: string) => Math.round((ms(iso) - ms(start)) / DAY);
const dateAt = (start: string, n: number) => new Date(ms(start) + n * DAY).toISOString().slice(0, 10);
const popArt = (article: string) => `/snes/pop/${artId(article)}.webp`;

export function packWeeks(weeks: Week[]): PackedWeeks {
  const items: PItem[] = [];
  const seen = new Map<string, number>();
  const ref = (p: Item) => {
    const t: PItem = [p.title, p.by, p.article !== null && p.article === p.title ? 1 : p.article, !p.art ? 0 : p.article && p.art === popArt(p.article) ? 1 : p.art];
    const k = JSON.stringify(t);
    if (!seen.has(k)) { seen.set(k, items.length); items.push(t); }
    return seen.get(k)!;
  };
  return {
    items,
    weeks: weeks.map((w) => [w.start, ref(w.song), ref(w.album), ref(w.film), w.film.gross, w.news.map((n) => [offset(w.start, n.date), n.text]), w.near && [offset(w.start, w.near.date), w.near.text]]),
  };
}

export function unpackWeeks(p: PackedWeeks): Week[] {
  const items = p.items.map(([title, by, a, art]): Item => {
    const article = a === 1 ? title : a;
    return { title, by, article, art: art === 0 ? null : art === 1 ? popArt(article!) : art };
  });
  return p.weeks.map(([start, s, a, f, gross, news, near]) => ({
    start, song: items[s], album: items[a], film: { ...items[f], gross },
    news: news.map(([n, text]) => ({ date: dateAt(start, n), text })), near: near && { date: dateAt(start, near[0]), text: near[1] },
  }));
}

export type SlimGame = { slug: string; title: string; releasedUS: string; datePrecision: string; boxArt: string | null };
/** [slug, title, releasedUS, boxArt (1 = /snes/box/<slug>.jpg, 0 = none)], plus precision only when the date's length doesn't say it. */
export type PackedGame = [string, string, string, string | 1 | 0] | [string, string, string, string | 1 | 0, string];

const precisionOf = (d: string) => (d.length === 10 ? 'day' : d.length === 7 ? 'month' : 'year');
const boxPath = (slug: string) => `/snes/box/${slug}.jpg`;

export function packGames(games: SlimGame[]): PackedGame[] {
  return games.map((g) => {
    const box = !g.boxArt ? 0 : g.boxArt === boxPath(g.slug) ? 1 : g.boxArt;
    return g.datePrecision === precisionOf(g.releasedUS) ? [g.slug, g.title, g.releasedUS, box] : [g.slug, g.title, g.releasedUS, box, g.datePrecision];
  });
}

export function unpackGames(games: PackedGame[]): SlimGame[] {
  return games.map(([slug, title, releasedUS, box, precision]) => ({
    slug, title, releasedUS, datePrecision: precision ?? precisionOf(releasedUS), boxArt: box === 0 ? null : box === 1 ? boxPath(slug) : box,
  }));
}
