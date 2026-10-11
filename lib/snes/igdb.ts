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
