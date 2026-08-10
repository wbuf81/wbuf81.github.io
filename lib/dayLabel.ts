import type { HealthDay } from '@/types/health';

/**
 * The x-axis label every daily chart uses: "Mon 20", "Sun 02".
 *
 * This lives in its own module rather than in `lib/health.ts` because the chart
 * components are client components, and `lib/health.ts` touches `fs` at module
 * scope to read the data file. Importing that into the browser bundle would
 * break the build.
 *
 * It is shared rather than inlined per chart so the four daily charts cannot
 * drift apart again — the weight chart used to label its axis by date ("Jul
 * 20") while the other three labelled by weekday.
 *
 * The day-of-month keeps its leading zero because it comes straight off the ISO
 * date, which is what makes the labels the same width and keeps the columns
 * even.
 */
export function dayTickLabel(day: Pick<HealthDay, 'day' | 'date'>): string {
  return `${day.day} ${day.date.slice(8)}`;
}
