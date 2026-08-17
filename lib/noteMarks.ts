import type { HealthNoteMark } from '@/types/health';

/**
 * The configured marks whose phrase appears in a day's notes.
 *
 * Driven by the note text rather than by weekday, because the sheet's Notes
 * column is the actual record of what happened: a cross should mean "went to
 * church that day", not "it was a Sunday". A week with nothing written gets no
 * mark, which is the honest reading.
 *
 * Lives in its own module for the same reason as `dayLabel`: the consistency
 * grid is a client component, and `lib/health.ts` touches `fs` at module scope.
 */
export function noteMarksFor(notes: string, marks?: HealthNoteMark[]): HealthNoteMark[] {
  if (!marks || marks.length === 0) return [];

  const haystack = notes.trim().toLowerCase();
  if (haystack === '') return [];

  return marks.filter((mark) => {
    const needle = mark.match.trim().toLowerCase();
    return needle !== '' && mark.icon.trim() !== '' && haystack.includes(needle);
  });
}
