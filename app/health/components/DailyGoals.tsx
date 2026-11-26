import type { HealthDatedTargets, HealthDay, PhaseSummary, StepStreak, StepStreaks } from '@/types/health';
import { proteinGoalDays } from '@/lib/healthProgress';
import { targetsFor } from '@/lib/targets';
import { formatNumber, plural } from './format';
import { kSteps } from './StepsCard';

interface Props {
  days: HealthDay[];
  targets: HealthDatedTargets[];
  streaks: StepStreaks;
  /** The block the newest data falls in: the protein goal is counted for it and in all. */
  lead: PhaseSummary | null;
}

/**
 * How long a threshold has been held. `best` is often the current run, so saying both would print the same number
 * twice; when they match it reads as a record instead.
 */
function runWords(s: StepStreak): string {
  if (s.current === 0) return `below it on the latest day (best run ${plural(s.best, 'day')})`;
  if (s.current === s.best) return 'running, the best run yet';
  return `running (best run ${plural(s.best, 'day')})`;
}

/**
 * The daily goals, moved off Trends so each figure shows in one place: the steps floor and goal runs, and the protein
 * goal's days met, for the block the newest data falls in and in all. Every day is judged against the goal in force
 * that day, so raising one never rescores the days before it.
 */
export default function DailyGoals({ days, targets, streaks, lead }: Props) {
  const newest = days.length ? days[days.length - 1].date : null;
  const proteinGoal = newest ? (targetsFor(newest, targets)?.proteinGoal ?? null) : null;
  const all = proteinGoalDays(days, targets);
  const block = lead ? proteinGoalDays(days.filter((d) => d.date >= lead.start && (lead.end === null || d.date <= lead.end)), targets) : null;
  const word = lead ? (lead.type === 'maintain' ? 'block' : lead.type) : null;

  const cells: { k: string; n: string; l: string }[] = [];
  if (streaks.minimum !== null) cells.push({ k: `Above the ${kSteps(streaks.minimum)} steps floor`, n: plural(streaks.aboveMinimum.current, 'day'), l: runWords(streaks.aboveMinimum) });
  if (streaks.goal !== null) cells.push({ k: `Above the ${kSteps(streaks.goal)} steps goal`, n: plural(streaks.aboveGoal.current, 'day'), l: runWords(streaks.aboveGoal) });
  if (proteinGoal !== null && block && block.scored > 0 && lead) {
    cells.push({
      k: `Protein goal, this ${word}`,
      n: `${formatNumber(block.met)} of ${plural(block.scored, 'day')}`,
      l: `at or over the ${formatNumber(proteinGoal)} g goal since ${lead.startLabel}`,
    });
  }
  if (proteinGoal !== null && all.scored > 0) {
    cells.push({ k: 'Protein goal, in all', n: `${formatNumber(all.met)} of ${plural(all.scored, 'day')}`, l: 'every day recorded' });
  }
  if (!cells.length) return null;

  return (
    <section className="h-card">
      <div className="h-card-h">
        <h2>Daily goals</h2>
      </div>
      <p className="h-note">A run is days in a row up to the latest reading. Each day is judged against the goal in force that day.</p>
      <div className="h-facts">
        {cells.map((c) => (
          <div key={c.k}>
            <div className="h-k">{c.k}</div>
            <div className="h-n">{c.n}</div>
            <div className="h-l">{c.l}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
