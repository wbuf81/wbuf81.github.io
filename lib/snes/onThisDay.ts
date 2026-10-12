/*
 * "On this day in SNES history": which Time Machine week, in a given year, holds today's month and day.
 * Pure; the strip (app/snes/components/OnThisDay.tsx) supplies today's date after mount.
 */
import { gamesForWeek, weekIndexFor } from './weeks.ts';
import type { Week } from './types.ts';

/** Every year the section covers; `onThisDayYears` narrows it to the years that have a week for a date. */
export const ON_THIS_DAY_YEARS = [1991, 1992, 1993, 1994, 1995, 1996, 1997, 1998];

const DAY = 86400000;
const addDays = (iso: string, n: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * DAY).toISOString().slice(0, 10);

/** `today`'s month and day in `year`; Feb 29 falls back to Feb 28 in a common year. */
function inYear(today: string, year: number): string {
  const md = today.slice(5, 10);
  if (md === '02-29' && !(year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0))) return `${year}-02-28`;
  return `${year}-${md}`;
}

/** Index of the week in `year` that holds `today`'s month and day, clamped to the data range. */
export function onThisDay(weeks: { start: string }[], today: string, year: number): number {
  return weekIndexFor(weeks as Week[], inYear(today, year));
}

/** The years that have a week holding `today`'s month and day. */
export function onThisDayYears(weeks: { start: string }[], today: string): number[] {
  const first = weeks[0].start, end = addDays(weeks[weeks.length - 1].start, 6);
  return ON_THIS_DAY_YEARS.filter((y) => {
    const d = inYear(today, y);
    return d >= first && d <= end;
  });
}

/*
 * The strip's week data, as tuples: [start, song title, song artist, film title, lead headline, new games].
 * Same fields as {start, song:{title,by}, film:{title}, lead, games}, but the object keys alone cost ~35 KB over
 * 372 weeks, which blew the 60 KB prop budget.
 */
export type SlimWeek = [start: string, song: string, by: string | null, film: string, lead: string | null, games: number];

const LEAD_MAX = 80;
const clip = (s: string) => (s.length <= LEAD_MAX ? s : `${s.slice(0, LEAD_MAX - 1).replace(/\s+\S*$/, '')}…`);

type Dated = { slug: string; releasedUS: string; datePrecision: string };

/** The week data the strip needs, and nothing else: it goes to the browser as a prop. */
export function slimWeeks(weeks: Week[], games: Dated[]): SlimWeek[] {
  return weeks.map((w, i) => {
    const g = gamesForWeek(games, weeks, i);
    const lead = w.news[0]?.text ?? w.near?.text ?? null;
    return [w.start, w.song.title, w.song.by, w.film.title, lead ? clip(lead) : null, g.exact.length + g.month.length];
  });
}
