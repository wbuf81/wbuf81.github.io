/*
 * Parses Wikipedia's "List of Super Nintendo Entertainment System games" (the id="softwarelist" table:
 * title, developers, publishers, JP / NA / PAL dates) and the games table of "List of Super NES enhancement
 * chips". A row counts as a US release when its North America cell holds a {{dts}} date.
 */
import type { Chip, ChipRow, DatePrecision, WikiListRow } from './types.ts';
import { linkText, splitTopLevel, stripCellAttrs, stripNoise, tableRows } from './wikitext.ts';

export function parseDts(cell: string): { date: string; precision: DatePrecision } | null {
  const m = cell.match(/\{\{dts\|(\d{4})(?:\|(\d{1,2})?)?(?:\|(\d{1,2})?)?\s*\}\}/i);
  if (!m) return null;
  const [, y, mo, d] = m;
  const pad = (n: string) => n.padStart(2, '0');
  if (mo && d) return { date: `${y}-${pad(mo)}-${pad(d)}`, precision: 'day' };
  if (mo) return { date: `${y}-${pad(mo)}`, precision: 'month' };
  return { date: y, precision: 'year' };
}

export function parseTitleCell(cell: string): { title: string; article: string | null } {
  const first = stripCellAttrs(cell).split(/<br\s*\/?>/i)[0];
  const link = first.match(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/);
  const title = linkText(first).replace(/^•/, '').trim();
  const article = link && !link[1].includes('#') ? link[1].trim() : null;
  return { title, article };
}

const firstOfHlist = (s: string) => {
  const h = s.match(/\{\{hlist\|([\s\S]*)\}\}/i);
  return h ? splitTopLevel(h[1])[0] : s;
};

function parseDevelopers(cell: string): string[] {
  const c = stripCellAttrs(cell);
  const h = c.match(/\{\{hlist\|([\s\S]*)\}\}/i);
  const parts = h ? splitTopLevel(h[1]) : c.split(/<br\s*\/?>/i);
  return parts.map(linkText).filter(Boolean);
}

function naPublisher(cell: string): string | null {
  const c = stripCellAttrs(cell);
  const v = c.match(/\{\{vgrtbl\|([\s\S]*)\}\}/i);
  if (!v) return linkText(firstOfHlist(c)) || null;
  const parts = splitTopLevel(v[1]);
  for (let i = 0; i + 1 < parts.length; i += 2) {
    const regions = parts[i].split('/').map((r) => r.trim().toUpperCase());
    if (regions.includes('NA')) return linkText(firstOfHlist(parts[i + 1])) || null;
  }
  return null;
}

export function parseSoftwareList(wikitext: string): { rows: WikiListRow[]; skipped: number } {
  const start = wikitext.indexOf('id="softwarelist"');
  if (start < 0) throw new Error('softwarelist table not found — has the Wikipedia page changed shape?');
  const end = wikitext.indexOf('\n|}', start);
  const table = stripNoise(wikitext.slice(start, end < 0 ? undefined : end));
  const rows: WikiListRow[] = [];
  let skipped = 0;
  for (const cells of tableRows(table)) {
    if (cells.length < 6) {
      skipped++;
      continue;
    }
    const na = parseDts(cells[4]);
    if (!na) continue;
    const { title, article } = parseTitleCell(cells[0]);
    rows.push({
      title,
      article,
      developers: parseDevelopers(cells[1]),
      publisher: naPublisher(cells[2]) ?? '',
      releasedUS: na.date,
      datePrecision: na.precision,
    });
  }
  return { rows, skipped };
}

const CHIPS: [RegExp, Chip][] = [
  [/GSU-2/i, 'Super FX 2'],
  [/GSU-1|^Super FX/i, 'Super FX'],
  [/^SA-?1/i, 'SA-1'],
  [/^DSP-1/i, 'DSP-1'],
  [/^DSP-2/i, 'DSP-2'],
  [/^DSP-3/i, 'DSP-3'],
  [/^DSP-4/i, 'DSP-4'],
  [/^CX4/i, 'Cx4'],
  [/^S-DD1/i, 'S-DD1'],
  [/^SPC7110/i, 'SPC7110'],
  [/^ST010/i, 'ST010'],
  [/^ST011/i, 'ST011'],
  [/^ST018/i, 'ST018'],
  [/^OBC-?1/i, 'OBC1'],
  [/^S-RTC/i, 'S-RTC'],
];

export function normalizeChip(raw: string): Chip | null {
  const s = raw.trim();
  for (const [re, chip] of CHIPS) if (re.test(s)) return chip;
  return null;
}

export function parseChipList(wikitext: string): ChipRow[] {
  const head = wikitext.indexOf('==List of Super NES games with enhancement chips==');
  if (head < 0) throw new Error('enhancement chip games table not found — has the Wikipedia page changed shape?');
  const start = wikitext.indexOf('{|', head);
  const end = wikitext.indexOf('\n|}', start);
  const table = stripNoise(wikitext.slice(start, end < 0 ? undefined : end));
  const out: ChipRow[] = [];
  for (const cells of tableRows(table)) {
    if (cells.length < 2) continue;
    const chip = normalizeChip(linkText(cells[1]));
    if (!chip) continue;
    out.push({ ...parseTitleCell(cells[0]), chip });
  }
  return out;
}
