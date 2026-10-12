/*
 * Parsers for the pop-culture pages behind the Time Machine: Billboard Hot 100 and Billboard 200 number ones,
 * the weekend box office number ones, and the Events section of "YEAR in the United States".
 */
import { linkText, stripNoise, tableGrid, unwrapTemplates } from './wikitext.ts';

export type ChartRow = { date: string; title: string; by: string | null; article: string | null; gross?: string | null };
export type NewsItem = { date: string; text: string };

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTH_RE = MONTHS.join('|');
const iso = (y: number, m: number, d: number) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

export function popText(cell: string): string {
  const s = unwrapTemplates(
    stripNoise(cell)
      .replace(/\{\{\s*(?:dagger|double-dagger|†)\s*(?:\|[^}]*)?\}\}/gi, '')
      .replace(/\{\{\s*sortname\s*\|([^|}]*)\|([^|}]*)(?:\|[^}]*)?\}\}/gi, '$1 $2')
      .replace(/\{\{\s*(?:sort|hs)\s*\|[^|}]*\|([^}]*)\}\}/gi, '$1'),
  )
    .replace(/<br\s*\/?>/gi, ' / ')
    .replace(/\{\{[^{}]*\}\}/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&ndash;/g, '–')
    .replace(/&amp;/g, '&');
  return linkText(s)
    .replace(/[†‡*]/g, '')
    .replace(/["“”]\s*(?:\/\s*)+["“”]/g, ' / ')
    .replace(/\s+/g, ' ')
    .replace(/^["“”\s]+|["“”\s]+$/g, '');
}

export function firstArticle(cell: string): string | null {
  return stripNoise(cell).match(/\[\[([^\]|#]+)/)?.[1].trim() ?? null;
}

/** "{{dts|August 24}}", "{{dts|1991|August|25}}" or plain "August 24[, 1991]" → ISO date. */
function cellDate(cell: string, year: number): string | null {
  const dts = cell.match(/\{\{\s*dts\s*\|([^}]*)\}\}/i);
  const text = dts ? dts[1].split('|').filter((p) => !p.includes('=')).join(' ') : popText(cell);
  const m = text.match(new RegExp(`(${MONTH_RE})\\s+(\\d{1,2})`)) ?? text.match(new RegExp(`(\\d{4})\\s+(${MONTH_RE})\\s+(\\d{1,2})`));
  if (!m) return null;
  if (/^\d{4}$/.test(m[1])) return iso(Number(m[1]), MONTHS.indexOf(m[2]) + 1, Number(m[3]));
  const y = Number(text.match(/\b(19\d\d|20\d\d)\b/)?.[1] ?? year);
  return iso(y, MONTHS.indexOf(m[1]) + 1, Number(m[2]));
}

const col = (header: string[], ...keys: string[]) => header.findIndex((h) => keys.some((k) => h.toLowerCase().includes(k)));

export function parseChart(wikitext: string, year: number): ChartRow[] {
  const out: ChartRow[] = [];
  let found = false;
  for (const m of wikitext.matchAll(/\{\|[\s\S]*?\n\|\}/g)) {
    const { header, rows } = tableGrid(m[0]);
    const di = col(header, 'issue date', 'weekend end', 'date');
    const ti = col(header, 'song', 'album', 'film', 'title');
    if (di < 0 || ti < 0) continue;
    found = true;
    const ai = col(header, 'artist');
    const gi = col(header, 'box office', 'gross');
    for (const r of rows) {
      const date = r[di] !== undefined ? cellDate(r[di], year) : null;
      if (!date || r[ti] === undefined) continue;
      const row: ChartRow = { date, title: popText(r[ti]), by: ai >= 0 && r[ai] !== undefined ? popText(r[ai]) || null : null, article: firstArticle(r[ti]) };
      if (gi >= 0) row.gross = r[gi] !== undefined ? popText(r[gi]) || null : null;
      out.push(row);
    }
  }
  if (!found) throw new Error('parseChart: no chart table with a date and title column');
  return out;
}

export function parseNews(wikitext: string, year: number): NewsItem[] {
  const events = wikitext.match(/==\s*Events\s*==([\s\S]*?)(?:\n==[^=]|$)/)?.[1] ?? '';
  const out: NewsItem[] = [];
  let month = 0;
  let current: string | null = null;
  for (const line of events.split('\n')) {
    const head = line.match(/^===\s*([A-Za-z]+)\s*===/);
    if (head) {
      month = MONTHS.indexOf(head[1]) + 1;
      current = null;
      continue;
    }
    if (!month || !line.startsWith('*')) continue;
    const depth = line.match(/^\*+/)![0].length;
    const body = line.slice(depth).trim();
    const dated = body.match(new RegExp(`^\\[?\\[?(${MONTH_RE})\\s+(\\d{1,2})\\]?\\]?\\s*(?:[–-]\\s*\\d{1,2}\\s*)?(?:&ndash;|–|-|:)?\\s*([\\s\\S]*)$`));
    if (depth === 1 && dated) {
      current = iso(year, MONTHS.indexOf(dated[1]) + 1, Number(dated[2]));
      const text = popText(dated[3]);
      if (text) out.push({ date: current, text });
    } else if (depth >= 2 && current) {
      const text = popText(body);
      if (text) out.push({ date: current, text });
    }
  }
  return out;
}
