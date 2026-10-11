/*
 * Matches Wes's scraped media set (snes-media/images and /videos: "<No-Intro name>-<kind>.<ext>") to games,
 * with the same title matching and region rules as the box art: US files only, never prototypes or betas.
 * "(Japan, USA)" files are US releases but carry Japanese box art, so callers skip their 3D box.
 */
import { parseLibretroName } from './boxart.ts';
import { normalizeTitle } from './titles.ts';

export type MediaKind = 'image' | 'marquee' | 'thumb' | 'video';
const KINDS: MediaKind[] = ['image', 'marquee', 'thumb', 'video'];

export interface MediaEntry {
  base: string;
  kinds: MediaKind[];
  japan: boolean;
}

export function splitMediaName(file: string): { base: string; kind: MediaKind } | null {
  const m = file.match(/^(.*)-(image|marquee|thumb|video)\.(png|mp4)$/);
  return m ? { base: m[1], kind: m[2] as MediaKind } : null;
}

export function indexMedia(files: string[]): Map<string, MediaEntry> {
  const byBase = new Map<string, Set<MediaKind>>();
  for (const f of files) {
    const s = splitMediaName(f);
    if (!s) continue;
    if (!byBase.has(s.base)) byBase.set(s.base, new Set());
    byBase.get(s.base)!.add(s.kind);
  }
  const best = new Map<string, MediaEntry & { rank: number }>();
  for (const [base, kinds] of byBase) {
    const parsed = parseLibretroName(`${base}.png`);
    if (!parsed) continue;
    const cur = best.get(parsed.key);
    if (cur && cur.rank >= parsed.rank) continue;
    best.set(parsed.key, { base, kinds: KINDS.filter((k) => kinds.has(k)), japan: /\(Japan/.test(base), rank: parsed.rank });
  }
  return new Map(Array.from(best, ([key, { rank: _rank, ...entry }]) => [key, entry]));
}

export function mediaFor(index: Map<string, MediaEntry>, title: string, alias?: string): MediaEntry | null {
  if (alias) {
    for (const entry of index.values()) if (entry.base === alias) return entry;
    return null;
  }
  return index.get(normalizeTitle(title)) ?? null;
}
