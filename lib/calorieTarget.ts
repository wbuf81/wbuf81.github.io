import type { HealthCalorieTarget } from '@/types/health';

/**
 * The daily calorie target in effect on a date, or null before the first one.
 *
 * Targets are dated rather than attached to a phase because the number changes
 * inside a block as well as between them — the Aug 2026 cut moved from 2,350 to
 * 2,450 without the cut ending. Each entry runs until the next one starts.
 *
 * Lives in its own module for the same reason as `dayLabel`: the calories chart
 * is a client component, and `lib/health.ts` touches `fs` at module scope.
 */
export function calorieTargetFor(
  date: string,
  targets?: HealthCalorieTarget[]
): number | null {
  if (!targets || targets.length === 0) return null;

  // ISO dates compare correctly as strings, so the latest one that has already
  // started is the one in force.
  const applicable = targets
    .filter((target) => target.from <= date)
    .sort((a, b) => a.from.localeCompare(b.from));

  return applicable.length ? applicable[applicable.length - 1].cals : null;
}
