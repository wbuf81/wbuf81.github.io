import { PhaseSummary } from '@/types/health';
import { formatDelta, formatNumber } from './chartTheme';

interface Props {
  phase: PhaseSummary;
  weightUnit: string;
}

/**
 * The headline for whatever block is currently running: where it started, where
 * things are now, and — if a goal is set — how far along it is.
 */
export default function PhaseBanner({ phase, weightUnit }: Props) {
  const { startWeight, currentWeight, weightChange, goalWeight, goalRemaining, goalPercent } = phase;

  // Down is the goal for a cut, up for a bulk; maintenance has no good direction.
  const desired = phase.type === 'cut' ? -1 : phase.type === 'bulk' ? 1 : 0;
  const moving =
    weightChange === null || weightChange === 0 || desired === 0
      ? ''
      : Math.sign(weightChange) === desired
        ? ' is-good'
        : ' is-up';

  return (
    <section className="phase-banner">
      <div className="phase-banner-head">
        <span className={`phase-chip is-${phase.type}`}>{phase.label}</span>
        <span className="phase-range">
          {phase.startLabel} – {phase.endLabel ?? 'now'} ·{' '}
          {phase.weekCount === 1 ? 'week 1' : `week ${phase.weekCount}`} · {phase.dayCount} days
          tracked
        </span>
      </div>

      <div className="phase-figures">
        <div className="phase-figure">
          <p className="stat-label">Started at</p>
          <p className="phase-value">
            {startWeight !== null ? `${formatNumber(startWeight, 1)} ${weightUnit}` : '—'}
          </p>
        </div>

        <span className="phase-arrow" aria-hidden="true">
          →
        </span>

        <div className="phase-figure">
          <p className="stat-label">Now</p>
          <p className="phase-value">
            {currentWeight !== null ? `${formatNumber(currentWeight, 1)} ${weightUnit}` : '—'}
          </p>
        </div>

        <div className="phase-figure">
          <p className="stat-label">Change</p>
          <p className={`phase-value${moving}`}>
            {weightChange !== null ? `${formatDelta(weightChange)} ${weightUnit}` : '—'}
          </p>
        </div>

        {goalWeight !== null && (
          <div className="phase-figure is-goal">
            <p className="stat-label">Goal {formatNumber(goalWeight, 1)} {weightUnit}</p>
            <p className="phase-value">
              {goalRemaining !== null ? `${formatNumber(goalRemaining, 1)} ${weightUnit} to go` : '—'}
            </p>
            {goalPercent !== null && (
              <div className="phase-progress">
                <div
                  className="phase-progress-fill"
                  style={{ width: `${goalPercent}%` }}
                  role="progressbar"
                  aria-valuenow={Math.round(goalPercent)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${phase.label} progress`}
                />
                <span className="phase-progress-text">{Math.round(goalPercent)}%</span>
              </div>
            )}
          </div>
        )}
      </div>

      {phase.note && <p className="phase-note">{phase.note}</p>}
    </section>
  );
}
