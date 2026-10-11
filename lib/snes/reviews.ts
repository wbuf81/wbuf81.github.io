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
