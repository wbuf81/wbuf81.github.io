/*
 * Picks US box art from libretro-thumbnails' No-Intro-named files ("7th Saga, The (USA).png"). libretro
 * swaps characters filenames can't hold for "_", so "Tetris _ Dr. Mario" is "Tetris & Dr. Mario".
 * Reissues (Virtual Console, Classic Mini), arcade-cabinet (Nintendo Super System) art, betas, prototypes,
 * hacks and libretro's "SymbolicLink" duplicates never qualify; a promo printing only when nothing else exists; a plain "(USA)"
 * beats a shared region, and an original printing beats a revision.
 */
import { normalizeTitle } from './titles.ts';

export const LIBRETRO_RAW =
  'https://raw.githubusercontent.com/libretro-thumbnails/Nintendo_-_Super_Nintendo_Entertainment_System/master/Named_Boxarts/';

const EXCLUDE = /virtual console|classic mini|switch online|beta|proto|sample|demo|pirate|unl|hack|aftermarket|competition|arcade/i;

export function parseLibretroName(file: string): { file: string; key: string; rank: number } | null {
  const base = file.replace(/^.*\//, '').replace(/\.png$/i, '');
  if (/symboliclink/i.test(base)) return null;
  const at = base.indexOf(' (');
  if (at < 0) return null;
  const tags = (base.slice(at).match(/\(([^)]*)\)/g) ?? []).map((t) => t.slice(1, -1));
  const region = tags[0] ?? '';
  if (!/\bUSA\b/.test(region) || tags.some((t) => EXCLUDE.test(t))) return null;
  const rank =
    (region === 'USA' ? 2 : 1) + (tags.some((t) => /^Rev\b/.test(t)) ? 0 : 0.5) - (tags.some((t) => /promo/i.test(t)) ? 2 : 0);
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
