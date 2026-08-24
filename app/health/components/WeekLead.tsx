import { PhaseSummary, WeeklyTrendRow } from '@/types/health';
import { formatDelta, formatNumber } from './chartTheme';

interface Props {
  rows: WeeklyTrendRow[];
  phase: PhaseSummary | null;
  weightUnit: string;
}

/**
 * The one card a visitor needs: the newest week's averages, then the block
 * they add up to. It used to be two cards — weekly averages above a phase
 * banner — but they were retelling the same story, and a coach skimming the
 * page had to stitch them together.
 *
 * The headline is the week's average weight against the week before, never a
 * single weigh-in: the week of Aug 17 ended on 204.6 after starting on 203.0,
 * which read as a gain even though the week's average fell. The page is
 * updated weekly, so the week is the honest unit of progress.
 */
export default function WeekLead({ rows, phase, weightUnit }: Props) {
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
    {
      label: 'Training',
      value: `${week.workouts} lifts · ${week.cardioSessions} cardio`,
      detail: `${formatNumber(week.cardioMinutes)} cardio minutes`,
      tone: '',
    },
  ];

  // The block's own arithmetic is desirability-signed the same way.
  const phaseTone = phase ? tone(phase.type === 'bulk' ? -(phase.weightChange ?? 0) : phase.weightChange) : '';

  return (
    <section className="week-lead" aria-label={`Averages for the week of ${week.label}`}>
      <div className="week-lead-head">
        {phase && <span className={`phase-chip is-${phase.type}`}>{phase.label}</span>}
        <span className="week-lead-chip">
          {week.isPartial ? 'This week so far' : 'Last full week'}
        </span>
        <span className="week-lead-range">
          Week of {week.label} · {week.dayCount === 1 ? '1 day' : `${week.dayCount} days`} recorded
        </span>
      </div>

      <div className="week-lead-figures">
        <div className="week-lead-figure is-lead">
          <p className="stat-label">Avg weight this week</p>
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

      {phase && (
        <div className="week-lead-phase">
          <p className="week-lead-phase-head">
            The {phase.label.toLowerCase()} so far · since {phase.startLabel} ·{' '}
            {phase.weekCount === 1 ? 'week 1' : `week ${phase.weekCount}`} · {phase.dayCount} days
            tracked
          </p>

          <div className="phase-figures">
            <div className="phase-figure">
              <p className="stat-label">Started at</p>
              <p className="phase-value">
                {phase.startWeight !== null
                  ? `${formatNumber(phase.startWeight, 1)} ${weightUnit}`
                  : '—'}
              </p>
            </div>

            <span className="phase-arrow" aria-hidden="true">
              →
            </span>

            <div className="phase-figure">
              <p className="stat-label">Now</p>
              <p className="phase-value">
                {phase.currentWeight !== null
                  ? `${formatNumber(phase.currentWeight, 1)} ${weightUnit}`
                  : '—'}
              </p>
            </div>

            <div className="phase-figure">
              <p className="stat-label">Change</p>
              <p className={`phase-value${phaseTone}`}>
                {phase.weightChange !== null
                  ? `${formatDelta(phase.weightChange)} ${weightUnit}`
                  : '—'}
              </p>
            </div>

            <div className="phase-figure">
              <p className="stat-label">Per week</p>
              <p className={`phase-value${phaseTone}`}>
                {phase.weightChangePerWeek !== null
                  ? `${formatDelta(phase.weightChangePerWeek)} ${weightUnit}`
                  : '—'}
              </p>
              {phase.recentChangePerWeek !== null && <p className="stat-detail">whole block</p>}
            </div>

            {/*
              The whole-block rate is front-loaded by the first fortnight's
              water, so once a distinct recent rate exists it is shown beside
              it — and the projection under the goal extrapolates this one.
            */}
            {phase.recentChangePerWeek !== null && (
              <div className="phase-figure">
                <p className="stat-label">Recent pace</p>
                <p className={`phase-value${tone(phase.type === 'bulk' ? -phase.recentChangePerWeek : phase.recentChangePerWeek)}`}>
                  {`${formatDelta(phase.recentChangePerWeek)} ${weightUnit}`}
                </p>
                <p className="stat-detail">last 3 weeks</p>
              </div>
            )}

            {phase.goalWeight !== null && (
              <div className="phase-figure is-goal">
                <p className="stat-label">
                  Goal {formatNumber(phase.goalWeight, 1)} {weightUnit}
                </p>
                <p className="phase-value">
                  {phase.goalRemaining !== null
                    ? `${formatNumber(phase.goalRemaining, 1)} ${weightUnit} to go`
                    : '—'}
                </p>
                {phase.goalPercent !== null && (
                  <div className="phase-progress">
                    <div
                      className="phase-progress-fill"
                      style={{ width: `${phase.goalPercent}%` }}
                      role="progressbar"
                      aria-valuenow={Math.round(phase.goalPercent)}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${phase.label} progress`}
                    />
                    <span className="phase-progress-text">{Math.round(phase.goalPercent)}%</span>
                  </div>
                )}
                {phase.projectedGoalLabel !== null && (
                  <p className="stat-detail">
                    on pace for {phase.projectedGoalLabel}
                    {phase.recentChangePerWeek !== null ? ' at the recent pace' : ''}
                  </p>
                )}
              </div>
            )}
          </div>

          {phase.note && <p className="phase-note">{phase.note}</p>}
        </div>
      )}

      <p className="week-lead-note">
        Weekly averages, not the last reading on the scale — a single day moves a pound or two on
        water alone, so the week is the unit that shows real progress.
      </p>
    </section>
  );
}
