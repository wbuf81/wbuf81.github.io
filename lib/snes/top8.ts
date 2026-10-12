/* Pure logic for the Top 8 maker: slim game index, recommendations, link state and name cleaning. */
import type { Game } from './types.ts';

export type Top8Game = {
  slug: string;
  title: string;
  year: string;
  genres: string[];
  series: string | null;
  similar: string[];
  score: number | null;
};

export const THEME_IDS = ['myspace', 'glitter', 'console', 'grandprix', 'crystal', 'polygon'] as const;
export type ThemeId = (typeof THEME_IDS)[number];

export type Top8State = { slots: (string | null)[]; theme: ThemeId; name: string; denied: string[] };

export const EMPTY_STATE: Top8State = { slots: Array(8).fill(null), theme: 'myspace', name: '', denied: [] };

export const STARTERS: string[] = [
  'super-mario-world',
  'the-legend-of-zelda-a-link-to-the-past',
  'super-metroid',
  'chrono-trigger',
  'donkey-kong-country',
  'super-mario-kart',
  'final-fantasy-iii',
  'street-fighter-ii-the-world-warrior',
];

/** EGM average to 1 decimal, else aggregate/10, else users/10, else null. */
function scoreOf(g: Game): number | null {
  const { egm, aggregate, users } = g.scores;
  if (egm && egm.length) return Math.round((egm.reduce((a, b) => a + b, 0) / egm.length) * 10) / 10;
  if (aggregate != null) return aggregate / 10;
  if (users != null) return users / 10;
  return null;
}

export function slimIndex(games: Game[]): Top8Game[] {
  return games.map((g) => ({
    slug: g.slug,
    title: g.title,
    year: g.releasedUS.slice(0, 4),
    genres: g.genres,
    series: g.series,
    similar: g.similar,
    score: scoreOf(g),
  }));
}

const NAME_MAX = 24;

export function cleanName(raw: string): string {
  const cleaned = raw
    .normalize('NFC')
    .replace(/[^\p{L}\p{N} '.\-_&!]/gu, '')
    .replace(/ +/g, ' ')
    .trim();
  return Array.from(cleaned).slice(0, NAME_MAX).join('').trim();
}

export function parseQuery(search: string, known: Set<string>): Partial<Top8State> | null {
  const p = new URLSearchParams(search);
  const g = p.get('g');
  const skin = p.get('skin');
  const n = p.get('n');
  if (g === null && skin === null && n === null) return null;
  const out: Partial<Top8State> = {};
  if (g !== null) {
    const seen = new Set<string>();
    const slots: (string | null)[] = [];
    for (const s of g.split(',').slice(0, 8)) {
      if (s === '_') slots.push(null);
      else if (known.has(s) && !seen.has(s)) {
        seen.add(s);
        slots.push(s);
      }
    }
    while (slots.length < 8) slots.push(null);
    out.slots = slots;
  }
  if (skin !== null && (THEME_IDS as readonly string[]).includes(skin)) out.theme = skin as ThemeId;
  if (n !== null) out.name = cleanName(n);
  return out;
}

export function toQuery(state: Top8State): string {
  const g = state.slots.map((s) => s ?? '_').join(',');
  let q = `?g=${g}&skin=${state.theme}`;
  if (state.name) q += `&n=${encodeURIComponent(state.name)}`;
  return q;
}

const cmpTitle = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

export function recommend(state: Top8State, games: Top8Game[], n = 5): { slug: string; reason: string }[] {
  const bySlug = new Map(games.map((g) => [g.slug, g]));
  const picks = state.slots.filter((s): s is string => !!s).map((s) => bySlug.get(s)).filter((g): g is Top8Game => !!g);
  const excluded = new Set([...state.denied, ...state.slots.filter((s): s is string => !!s)]);

  if (!picks.length) {
    return STARTERS.filter((s) => bySlug.has(s) && !excluded.has(s))
      .slice(0, n)
      .map((slug) => ({ slug, reason: 'a classic to start with' }));
  }

  const rank = (g: Top8Game) => (g.score ?? 6) / 10;
  const cand = new Map<string, { weight: number; strength: number; reason: string }>();
  const add = (slug: string, weight: number, strength: number, reason: string) => {
    if (excluded.has(slug) || !bySlug.has(slug)) return;
    const c = cand.get(slug);
    if (!c) cand.set(slug, { weight, strength, reason });
    else {
      c.weight += weight;
      if (strength > c.strength) {
        c.strength = strength;
        c.reason = reason;
      }
    }
  };

  for (const pick of picks) for (const s of pick.similar) add(s, 3, 3, `because you picked ${pick.title}`);
  for (const pick of picks) {
    if (!pick.series) continue;
    for (const g of games) if (g.series === pick.series) add(g.slug, 2, 2, `more ${pick.series}`);
  }
  const genreHit = (g: Top8Game) => picks.flatMap((p) => p.genres).filter((x, i, a) => a.indexOf(x) === i).filter((x) => g.genres.includes(x));
  const underfilled = cand.size < n;
  for (const g of games) {
    if (excluded.has(g.slug)) continue;
    const hits = genreHit(g);
    if (!hits.length) continue;
    if (!cand.has(g.slug) && !(underfilled && (g.score ?? 0) >= 8)) continue;
    add(g.slug, hits.length, 1, `you like ${hits[0].toLowerCase()} games`);
  }

  return [...cand.entries()]
    .map(([slug, c]) => ({ slug, total: c.weight + rank(bySlug.get(slug)!), title: bySlug.get(slug)!.title, reason: c.reason }))
    .sort((a, b) => b.total - a.total || cmpTitle(a.title, b.title))
    .slice(0, n)
    .map(({ slug, reason }) => ({ slug, reason }));
}

export const isPicked = (state: Top8State, slug: string): boolean => state.slots.includes(slug);

/** Fills the first empty slot. Already picked: same state, full false. No empty slot: same state, full true. */
export function addPick(state: Top8State, slug: string): { state: Top8State; full: boolean } {
  if (isPicked(state, slug)) return { state, full: false };
  const i = state.slots.indexOf(null);
  if (i < 0) return { state, full: true };
  const slots = state.slots.slice();
  slots[i] = slug;
  return { state: { ...state, slots }, full: false };
}

/** Empties the slot holding slug; the others stay where they are. */
export function removePick(state: Top8State, slug: string): Top8State {
  if (!isPicked(state, slug)) return state;
  return { ...state, slots: state.slots.map((s) => (s === slug ? null : s)) };
}

/** Puts slug at index; if it sat in another slot, that slot becomes empty. */
export function replacePick(state: Top8State, index: number, slug: string): Top8State {
  if (!Number.isInteger(index) || index < 0 || index >= state.slots.length) return state;
  const slots = state.slots.map((s, i) => (i === index ? slug : s === slug ? null : s));
  return { ...state, slots };
}
