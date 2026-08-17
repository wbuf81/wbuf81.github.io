import type { HealthDatedTargets } from '@/types/health';

/**
 * The standing goals in effect on a date, or null before the first revision.
 *
 * Revisions are cumulative patches in date order: an entry that only names
 * `liftsPerWeek` leaves the step and weigh-in goals as they were, so a change
 * is written once rather than restating every number. `note` is the only field
 * that does not carry forward — it explains its own revision, not later ones.
 *
 * Dated because `buildWeeklyGoals` scores every week: with a single undated
 * object, raising a goal silently re-scored past weeks against a rule that was
 * not in force then, which could wipe out a streak that had really been earned.
 *
 * Lives in its own module for the same reason as `dayLabel`: the steps chart is
 * a client component, and `lib/health.ts` touches `fs` at module scope.
 */
export function targetsFor(
  date: string,
  revisions?: HealthDatedTargets[]
): HealthDatedTargets | null {
  if (!revisions || revisions.length === 0) return null;

  const applicable = revisions
    .filter((revision) => revision.from <= date)
    .sort((a, b) => a.from.localeCompare(b.from));

  if (applicable.length === 0) return null;

  return applicable.reduce((resolved, revision) => {
    const patch: HealthDatedTargets = { ...resolved, ...revision };

    // Only carry a field forward when the newer revision stays silent about it;
    // an explicit null means "unset this goal", which must not be overwritten.
    for (const key of Object.keys(resolved) as (keyof HealthDatedTargets)[]) {
      if (!(key in revision)) {
        (patch[key] as HealthDatedTargets[typeof key]) = resolved[key];
      }
    }

    patch.from = revision.from;
    patch.note = revision.note;

    return patch;
  });
}
