/*
 * Reads the {{Video game reviews}} box on a game's Wikipedia article down to the SNES version's scores.
 * Boxes come in two dialects: per-platform keys (EGM_SNES, GR_GBA), or plain keys whose values carry a
 * platform tag ("SNES: 9/10", "8/10 (Wii)"). Anything tagged for another platform is dropped, so a port's
 * score never shows up on the SNES game. Nintendo Power has no standard field; it appears as a named
 * reviewer (rev1 = Nintendo Power, rev1Score = 4.5/5).
 */
import type { NintendoPowerScore, Scores } from './types.ts';
import { linkText, splitTopLevel, stripNoise, unwrapTemplates } from './wikitext.ts';

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

const SNES_NAMES = ['snes', 'super nes', 'super nintendo', 'sfc', 'super famicom'];
const OTHER_NAMES = [
  'genesis', 'sega genesis', 'mega drive', 'sega mega drive', 'md', 'smd', 'gen', 'sega cd', 'mega-cd', 'mega cd',
  'mcd', 'scd', 'segacd', 'game boy', 'gb', 'gbc', 'game boy color', 'game boy advance', 'gba', 'game gear', 'gg',
  'master system', 'sms', 'nes', 'famicom', 'fc', 'wii', 'wii u', 'wiiu', 'vc', 'virtual console', 'ds', 'nds',
  '3ds', 'switch', 'ns', 'n64', 'gamecube', 'gc', 'ngc', 'ps', 'ps1', 'psx', 'playstation', 'ps2', 'ps3', 'ps4',
  'psp', 'psn', 'xbox', 'x360', 'xbla', 'pc', 'win', 'windows', 'windows 95', 'dos', 'ms-dos', 'mac', 'amiga',
  'cd32', 'cdi', 'cd-i', 'lynx', 'jaguar', 'jag', '3do', 'neo geo', 'neo-geo', 'ng', 'ngcd', 'neo geo cd', 'arc',
  'arcade', 'sat', 'ssat', 'saturn', '32x', 'tg16', 'tg-16', 'turbografx-16', 'pce', 'pc engine', 'ios', 'android',
  'mobile', 'atari st', 'c64', 'zx spectrum', 'msx', 'x68000', 'fm towns',
];
const ALL_NAMES = new Set([...SNES_NAMES, ...OTHER_NAMES]);
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\-]/g, '\\$&');
const PREFIX = new RegExp(
  `(?:^|[\\s,;])(${[...ALL_NAMES].sort((a, b) => b.length - a.length).map(escape).join('|')})\\s*:`,
  'gi',
);

/** The platforms a tag names ("SNES & Wii" → both), or null if it isn't purely a platform tag ("UK"). */
function platformsIn(tag: string): string[] | null {
  const parts = tag.trim().toLowerCase().split(/\s*(?:,|&|\/|\band\b)\s*/).filter(Boolean);
  return parts.length && parts.every((p) => ALL_NAMES.has(p)) ? parts : null;
}

interface Segment {
  platforms: string[] | null;
  text: string;
}

/** Splits one line of a review value at its platform tags: "NES: 9/20 SNES: 14/20", "8/10 (GEN) 9/10 (SNES)". */
function segmentsOf(line: string): Segment[] {
  const front = line.match(/^\s*\(([^)]*)\)\s*(.*)$/);
  if (front && platformsIn(front[1])) return [{ platforms: platformsIn(front[1]), text: front[2] }];
  const prefixes = Array.from(line.matchAll(PREFIX));
  if (prefixes.length) {
    const out: Segment[] = [];
    const lead = line.slice(0, prefixes[0].index);
    if (lead.trim()) out.push({ platforms: null, text: lead });
    prefixes.forEach((m, i) => {
      const from = m.index! + m[0].length;
      out.push({ platforms: [m[1].toLowerCase()], text: line.slice(from, prefixes[i + 1]?.index ?? line.length) });
    });
    return out;
  }
  const out: Segment[] = [];
  let cut = 0;
  for (const m of line.matchAll(/\(([^)]*)\)/g)) {
    const platforms = platformsIn(m[1]);
    if (!platforms) continue;
    out.push({ platforms, text: line.slice(cut, m.index) });
    cut = m.index! + m[0].length;
  }
  if (line.slice(cut).trim()) out.push({ platforms: null, text: line.slice(cut) });
  return out;
}

/**
 * The SNES part of a review value (lines separated by "\n"), or null. A segment tagged SNES wins; a value
 * with no tags at all is taken as the SNES score; anything tagged only for other platforms, or untagged
 * text beside another platform's score, is dropped — a lost score beats a port's score shown as SNES.
 */
export function snesValue(value: string): string | null {
  const segments = value
    .split('\n')
    .flatMap(segmentsOf)
    .map((s) => ({ ...s, text: s.text.replace(/^[\s,;]+|[\s,;]+$/g, '') }))
    .filter((s) => s.text);
  const tidy = (list: Segment[]) => list.map((s) => s.text).join(', ').replace(/\s+/g, ' ').trim() || null;
  const snes = segments.filter((s) => s.platforms?.some((p) => SNES_NAMES.includes(p)));
  if (snes.length) return tidy(snes);
  if (segments.some((s) => s.platforms)) return null;
  return tidy(segments);
}

export function reviewFields(box: string): Record<string, string> {
  const body = stripNoise(unwrapTemplates(box.replace(/<small>([\s\S]*?)<\/small>/g, ' $1 ')));
  const inner = body.replace(/^\{\{\s*video game reviews/i, '').replace(/\}\}\s*$/, '');
  const params: Record<string, string> = {};
  for (const part of splitTopLevel(inner).slice(1)) {
    const eq = part.indexOf('=');
    if (eq < 0) continue;
    const key = part.slice(0, eq).trim();
    const value = part
      .slice(eq + 1)
      .split(/<br\s*\/?>|\n/i)
      .map(linkText)
      .filter(Boolean)
      .join('\n');
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
      if (s) out[value.replace(/\n/g, ' ')] = s;
      continue;
    }
    const suffix = key.match(/^(.+)_([A-Za-z0-9]+)$/);
    let name = key;
    if (multi || (suffix && platformsIn(suffix[2]))) {
      if (!suffix || !SNES_NAMES.includes(suffix[2].toLowerCase())) continue;
      name = suffix[1];
    }
    const s = snesValue(value);
    if (s) out[name] = s;
  }
  return out;
}

export function parseEgm(value: string): number[] | null {
  const run = value.trim().match(/^\d+(?:\.\d+)?(?:\s*\/\s*\d+(?:\.\d+)?){2,}$/);
  if (run && !/\/\s*10\b/.test(value)) return value.split('/').map(Number).filter((n) => n >= 0 && n <= 10);
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
const EGM_KEY = /^(egm|electronic gaming monthly)$/i;

export function reviewScores(fields: Record<string, string>): Pick<Scores, 'egm' | 'nintendoPower' | 'other'> {
  let egm: number[] | null = null;
  let nintendoPower: NintendoPowerScore | null = null;
  const other: Record<string, string> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (EGM_KEY.test(key)) {
      egm = parseEgm(value);
      if (!egm) other.EGM = value; // a 40-point total or a letter grade: kept raw, not lost
    }
    else if (NP_KEY.test(key)) nintendoPower = parseNintendoPower(value);
    else other[key] = value;
  }
  return { egm, nintendoPower, other };
}

interface QueryResult {
  normalized?: { from: string; to: string }[];
  redirects?: { from: string; to: string; tofragment?: string }[];
  pages?: { title: string; revisions?: { slots?: { main?: { content?: string } } }[] }[];
}

/**
 * Maps a MediaWiki query response back to the article names asked for. A redirect to a section of another
 * article (tofragment) gives null: that page is about a different game, and its review box isn't this one's.
 */
export function contentForBatch(batch: string[], query: QueryResult): Record<string, string | null> {
  const content = new Map((query.pages ?? []).map((p) => [p.title, p.revisions?.[0]?.slots?.main?.content ?? null]));
  const out: Record<string, string | null> = {};
  for (const asked of batch) {
    let title: string | null = asked;
    for (const { from, to } of query.normalized ?? []) if (from === title) title = to;
    for (const r of query.redirects ?? []) if (r.from === title) title = r.tofragment ? null : r.to;
    out[asked] = title === null ? null : content.get(title) ?? null;
  }
  return out;
}
