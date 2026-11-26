import { HealthDatedTargets, PhaseSummary, WeeklyTrendRow } from '@/types/health';
import { targetsFor } from '@/lib/targets';
import { formatNumber } from './format';
import type { TrendRange } from './trendRange';
import WeeklySeries from './WeeklySeries';

interface Props {
  /** The days the Trends range covers. */
  range: TrendRange;
  weeklyTrend: WeeklyTrendRow[];
  phases: PhaseSummary[];
  targets: HealthDatedTargets[];
}

/** "13.5k", "10k". */
export const kSteps = (v: number) => (v === 0 ? '0' : `${formatNumber(v / 1000, v % 1000 === 0 ? 0 : 1)}k`);

/**
 * Steps over the Trends range: the weekly averages as a line with points over each day's reading as a faint dot. The
 * floor and the goal are stepped lines drawn from the revision in force each day, so a goal raised later is never drawn
 * across the weeks before it, and each is named at its right end. Neutral inks: the floor lighter, since clearing it
 * is the baseline rather than the win. How long each has been held is on Habits › Daily goals.
 */
export default function StepsCard({ range, weeklyTrend, phases, targets }: Props) {
  const inForce = range.days.map((d) => targetsFor(d.date, targets));
  const floors = inForce.map((t) => t?.stepsMinimum ?? null);
  const goals = inForce.map((t) => t?.stepsGoal ?? null);

  return (
    <section className="h-card">
      <div className="h-card-h">
        <h2>Steps</h2>
        <div className="h-legend">
          <span>
            <i className="h-sw is-line is-accent" />
            Weekly average
          </span>
          <span>
            <i className="h-sw is-dot is-mark" />A day
          </span>
        </div>
      </div>
      <WeeklySeries
        range={range}
        weeklyTrend={weeklyTrend}
        phases={phases}
        daily={(d) => d.steps}
        lines={[{ key: 'steps', cls: 'g-avg', pts: 'g-pts', value: (w) => w.avgSteps, end: kSteps }]}
        refs={[
          { key: 'goal', cls: 'g-line', values: goals, end: (v) => `goal ${kSteps(v)}` },
          { key: 'floor', cls: 'g-floor', values: floors, end: (v) => `floor ${kSteps(v)}` },
        ]}
        step={5000}
        tick={kSteps}
        label="Steps: weekly averages over each day’s reading, against the floor and the goal in force each day"
        endPx={72}
      />
    </section>
  );
}
