import { WeeklyTrendRow } from '@/types/health';
import { formatDelta, formatNumber } from './chartTheme';

interface Props {
  rows: WeeklyTrendRow[];
  weightUnit: string;
}

/**
 * The newest week's averages, read first on the page.
 *
 * A single weigh-in swings a pound or two on water and salt, so the latest
 * reading is a bad headline: the week of Aug 17 ended on 204.6 after starting
 * on 203.0, which reads as a gain even though the week's average fell. The
 * average against the week before is the honest summary, so it leads and the
 * last reading is demoted to a tile below.
 */
export default function WeekLead({ rows, weightUnit }: Props) {
  if (rows.length === 0) return null;

  const week = rows[rows.length - 1];

  // Losing weight is the goal, so a fall is the good direction — the same rule
  // the weekly table and the stat tiles use.
  const tone = (change: number | null): string =>
    change === null || change === 0 ? '' : change < 0 ? ' is-good' : ' is-up';

  const supporting = [
    {
      label: 'Avg calories',
      value: week.avgCals !== null ? formatNumber(week.avgCals) : '—',
      detail:
        week.calsVsGoal !== null ? `${formatDelta(week.calsVsGoal, 0)} vs target` : 'per day',
      tone: tone(week.calsVsGoal),
    },
    {
      label: 'Avg protein',
      value: week.avgProtein !== null ? `${formatNumber(week.avgProtein)} g` : '—',
      detail: 'per day',
      tone: '',
    },
    {
      label: 'Avg steps',
      value: week.avgSteps !== null ? formatNumber(week.avgSteps) : '—',
      detail: 'per day',
      tone: '',
    },
  ];

  return (
    <section className="week-lead" aria-label={`Averages for the week of ${week.label}`}>
      <div className="week-lead-head">
        <span className="week-lead-chip">
          {week.isPartial ? 'This week so far' : 'Last full week'}
        </span>
        <span className="week-lead-range">
          Week of {week.label} · {week.dayCount === 1 ? '1 day' : `${week.dayCount} days`} recorded
        </span>
      </div>

      <div className="week-lead-figures">
        <div className="week-lead-figure is-lead">
          <p className="stat-label">Avg weight</p>
          <p className={`week-lead-value${tone(week.weightChange)}`}>
            {week.avgWeight !== null ? `${formatNumber(week.avgWeight, 1)} ${weightUnit}` : '—'}
          </p>
          <p className={`stat-detail${tone(week.weightChange)}`}>
            {week.weightChange !== null
              ? `${formatDelta(week.weightChange)} ${weightUnit} vs the week before`
              : 'no earlier week to compare'}
          </p>
        </div>

        {/* Intake and activity support the headline rather than competing with it. */}
        <div className="week-lead-rest">
          {supporting.map((figure) => (
            <div className="week-lead-figure" key={figure.label}>
              <p className="stat-label">{figure.label}</p>
              <p className={`week-lead-value${figure.tone}`}>{figure.value}</p>
              <p className={`stat-detail${figure.tone}`}>{figure.detail}</p>
            </div>
          ))}
        </div>
      </div>

      <p className="week-lead-note">
        Averages across the week, not the last reading on the scale — a single day moves a pound
        or two on water alone.
      </p>
    </section>
  );
}
