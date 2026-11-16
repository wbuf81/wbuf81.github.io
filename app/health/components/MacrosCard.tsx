import { HealthDatedTargets, PhaseSummary, WeeklyTrendRow } from '@/types/health';
import { targetsFor } from '@/lib/targets';
import { formatNumber } from './format';
import type { TrendRange } from './trendRange';
import WeeklySeries from './WeeklySeries';

interface Props {
  range: TrendRange;
  weeklyTrend: WeeklyTrendRow[];
  phases: PhaseSummary[];
  /** Dated standing goals; the protein goal in force each day is drawn as a stepped dashed line. */
  targets: HealthDatedTargets[];
}

/**
 * Protein, carbs and fat over the Trends range: weekly averages in grams on one scale, protein the heavy line with
 * points (it is the one with a goal), carbs and fat thin, each day's protein a faint dot, and the protein goal in force
 * each day a stepped dashed line. Every line is named at its right end. The fat colour is under 3:1 against the card,
 * so it is named in words and the Every-day table has the grams.
 */
export default function MacrosCard({ range, weeklyTrend, phases, targets }: Props) {
  const goals = range.days.map((d) => targetsFor(d.date, targets)?.proteinGoal ?? null);
  const latestGoal = [...goals].reverse().find((g) => g !== null) ?? null;

  // Each day against the goal in force that day, so raising the goal never rescores the days before it.
  const scored = range.days
    .map((d, i) => ({ protein: d.protein, goal: goals[i] }))
    .filter((s): s is { protein: number; goal: number } => s.protein !== null && s.goal !== null);
  const met = scored.filter((s) => s.protein >= s.goal).length;

  return (
    <section className="h-card">
      <div className="h-card-h">
        <h2>Protein, carbs and fat</h2>
        <div className="h-legend">
          <span>
            <i className="h-sw is-dot is-mark" />A day&rsquo;s protein
          </span>
        </div>
      </div>
      <WeeklySeries
        range={range}
        weeklyTrend={weeklyTrend}
        phases={phases}
        daily={(d) => d.protein}
        lines={[
          { key: 'carbs', cls: 'g-p2', value: (w) => w.avgCarbs, end: (v) => `Carbs ${formatNumber(v)}` },
          { key: 'fat', cls: 'g-p3', value: (w) => w.avgFat, end: (v) => `Fat ${formatNumber(v)}` },
          { key: 'protein', cls: 'g-p1', pts: 'g-p1pts', value: (w) => w.avgProtein, end: (v) => `Protein ${formatNumber(v)}` },
        ]}
        refs={[{ key: 'goal', cls: 'g-line', values: goals, end: (v) => `goal ${formatNumber(v)}` }]}
        step={100}
        zero
        tick={(v) => (v === 0 ? '0 g' : formatNumber(v))}
        label="Protein, carbs and fat: weekly averages in grams, with each day’s protein and the protein goal"
        endPx={80}
      />
      <p className="h-note is-after">
        Grams a day, weekly averages. The dots are each day&rsquo;s protein
        {latestGoal !== null && scored.length > 0 ? (
          <>
            ; it met the {formatNumber(latestGoal)} g goal on{' '}
            <b>
              {met} of {scored.length} days
            </b>{' '}
            shown.
          </>
        ) : (
          '.'
        )}
      </p>
    </section>
  );
}
