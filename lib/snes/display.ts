/* Labels for /snes pages: dates at their real precision, magazine names, scores, players, ratings. */
import type { DatePrecision, Esrb, NintendoPowerScore } from './types.ts';

export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const SHORT_MONTHS = MONTHS.map((m) => m.slice(0, 3));

export function formatRelease(releasedUS: string, precision: DatePrecision): string {
  const [y, m, d] = releasedUS.split('-').map(Number);
  if (precision === 'year' || !m) return String(y);
  if (precision === 'month' || !d) return `${MONTHS[m - 1]} ${y}`;
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}

/** Review-box abbreviations whose meaning is certain; anything else is shown as written. */
export const MAGAZINES: Record<string, string> = {
  GR: 'GameRankings', MC: 'Metacritic', GI: 'Game Informer', Fam: 'Famitsu', CVG: 'Computer and Video Games',
  EGM: 'Electronic Gaming Monthly', NP: 'Nintendo Power', TOT: 'Total!', SP: 'Super Play', Allgame: 'AllGame',
  ONM: 'Official Nintendo Magazine', NGen: 'Next Generation', VGCE: 'VideoGames & Computer Entertainment',
  GMaster: 'GamesMaster', MF: 'Mega Fun', NLife: 'Nintendo Life', PO: 'Player One', CP: 'Consoles +',
  MM: 'Mean Machines', ASM: 'Aktueller Software Markt', HC: 'Hobby Consolas', SJ: 'Super Juegos',
  IGN: 'IGN', GSpot: 'GameSpot', EuroG: 'Eurogamer', '1UP': '1UP.com',
};

export const magazineName = (key: string) => MAGAZINES[key] ?? key;

const HIDDEN = /^(award\d+(pub)?|rev\d+(score)?)$/i;

export function displayedMagazines(other: Record<string, string>, skip: string[] = []): { name: string; score: string }[] {
  return Object.entries(other)
    .filter(([k]) => !HIDDEN.test(k) && !skip.includes(k))
    .map(([k, score]) => ({ name: magazineName(k), score }));
}

export function reviewerScores(value: string | undefined): number[] | null {
  if (!value) return null;
  const scores = Array.from(value.matchAll(/(\d+(?:\.\d+)?)\s*\/\s*10\b/g), (m) => Number(m[1]));
  return scores.length >= 2 ? scores : null;
}

export const npLabel = (np: NintendoPowerScore) => `${np.score}/${np.scale}`;
export const playersLabel = (n: number) => (n === 1 ? '1 player' : `1–${n} players`);
export const ratingLabel = (esrb: Esrb | null, releasedUS: string) => (esrb ? `ESRB ${esrb}` : releasedUS < '1994-09' ? 'Pre-ESRB' : 'Not rated');
export const gameCount = (n: number) => `${n} ${n === 1 ? 'game' : 'games'}`;
