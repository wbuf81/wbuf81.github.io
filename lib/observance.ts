import type { HealthObservance } from '@/types/health';

/**
 * A standing weekly observance for a date, or null when none applies.
 *
 * Unlike a marker, which is one dated event, an observance repeats every week —
 * so it is configured once by weekday rather than added to the data every time
 * it comes round.
 *
 * Lives in its own module for the same reason as `dayLabel`: the consistency
 * grid is a client component, and `lib/health.ts` touches `fs` at module scope.
 */
export function observanceFor(
  date: string,
  observances?: HealthObservance[]
): HealthObservance | null {
  if (!observances || observances.length === 0) return null;

  // Parsed as UTC from the date string, so the viewer's timezone can never
  // shift which weekday a date falls on.
  const [y, m, d] = date.split('-').map(Number);
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay();

  return observances.find((o) => o.weekday === weekday && o.icon.trim() !== '') ?? null;
}
