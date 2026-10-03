/*
 * The GitHub map's data: one level (0–4) per day for the last year, exactly as GitHub's public profile shows it
 * (private contributions appear there as levels too, because the profile shares them). Refreshed at deploy time
 * by scripts/github-contributions.mjs from https://github.com/users/wbuf81/contributions; a committed copy in
 * data/github-contributions.json keeps local builds and a failed fetch from ever drawing a blank map.
 */

export interface Contributions {
  user: string;
  from: string;
  to: string;
  /** One digit per day from `from` to `to`, 0 (none) to 4 (most). */
  levels: string;
}

export interface MapCell {
  date: string;
  /** -1 for padding before the first day, so the first column still starts on a Sunday. */
  level: number;
}

export interface MonthLabel {
  col: number;
  label: string;
}

const DAY = 86400000;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const toTime = (iso: string) => Date.parse(`${iso}T00:00:00Z`);
const toIso = (t: number) => new Date(t).toISOString().slice(0, 10);

/** Reads GitHub's contributions calendar HTML into the stored shape. Throws on anything it can't trust. */
export function parseContributionsHtml(html: string): Omit<Contributions, 'user'> {
  const days = Array.from(html.matchAll(/data-date="(\d{4}-\d{2}-\d{2})"[^>]*?data-level="([0-4])"/g), (m) => ({
    date: m[1],
    level: m[2],
  })).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  if (days.length === 0) throw new Error('no days in the page');
  for (let i = 1; i < days.length; i++) {
    if (toTime(days[i].date) - toTime(days[i - 1].date) !== DAY) throw new Error(`gap at ${days[i].date}`);
  }
  return { from: days[0].date, to: days[days.length - 1].date, levels: days.map((d) => d.level).join('') };
}

/** Lays the days into Sunday-first weeks (columns) and labels the first column of each month. */
export function buildMap(c: Contributions): { cells: MapCell[]; months: MonthLabel[]; weeks: number } {
  const start = toTime(c.from);
  const lead = new Date(start).getUTCDay(); // 0 = Sunday
  const cells: MapCell[] = Array.from({ length: lead }, () => ({ date: '', level: -1 }));
  for (let i = 0; i < c.levels.length; i++) cells.push({ date: toIso(start + i * DAY), level: Number(c.levels[i]) });
  const weeks = Math.ceil(cells.length / 7);

  const months: MonthLabel[] = [];
  let prev = -1;
  for (let w = 0; w < weeks; w++) {
    const first = cells.slice(w * 7, w * 7 + 7).find((x) => x.level >= 0);
    if (!first) continue;
    const month = new Date(toTime(first.date)).getUTCMonth();
    if (month !== prev) months.push({ col: w + 1, label: MONTHS[month] });
    prev = month;
  }
  // A partial first month squeezed against the next label would overlap it.
  if (months.length > 1 && months[1].col - months[0].col < 3) months.shift();
  return { cells, months, weeks };
}

/** "3 Oct 2026", for a cell's title. */
export function dayLabel(iso: string): string {
  const d = new Date(toTime(iso));
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}
