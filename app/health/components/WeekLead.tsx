import { PhaseSummary, WeeklyTrendRow } from '@/types/health';
import { downIsGood, formatDelta, formatNumber } from './format';

interface Props {
  rows: WeeklyTrendRow[];
  phase: PhaseSummary | null;
  weightUnit: string;
}

/**
 * The one card a visitor needs: the newest week's averages, then the block they add up to, drawn as a
 * track from the start weight to the goal with a notch for each week's average.
 *
 * The headline is the week's average weight against the week before, never a single weigh-in: the week of
 * Aug 17 ended on 204.6 after starting on 203.0, which read as a gain even though the week's average fell.
 * The page is updated weekly, so the week is the honest unit of progress.
 */
export default function WeekLead({ rows, phase, weightUnit }: Props) {
  if (rows.length === 0) return null;

  const week = rows[rows.length - 1];
  const lb = (v: number | null) => (v === null ? '—' : `${formatNumber(v, 1)} ${weightUnit}`);
  const signedLb = (v: number | null) => (v === null ? '—' : `${formatDelta(v)} ${weightUnit}`);

  // A cut wants the number down, a bulk wants it up; the block's own arithmetic is signed that way.
  const blockTone = (v: number | null) => (v === null || !phase ? '' : downIsGood(phase.type === 'bulk' ? -v : v));

  const supporting = [
    {
      label: 'Avg calories',
      value: week.avgCals !== null ? formatNumber(week.avgCals) : '—',
      detail: week.calsVsGoal !== null ? `${formatDelta(week.calsVsGoal, 0)} vs target` : 'per day',
      tone: downIsGood(week.calsVsGoal, 0),
    },
    { label: 'Avg protein', value: week.avgProtein !== null ? `${formatNumber(week.avgProtein)} g` : '—', detail: 'per day', tone: '' },
    { label: 'Avg steps', value: week.avgSteps !== null ? formatNumber(week.avgSteps) : '—', detail: 'per day', tone: '' },
    {
      label: 'Training',
      value: `${week.workouts} · ${week.cardioSessions}`,
      detail: `lifts · cardio, ${formatNumber(week.cardioMinutes)} cardio min`,
      tone: '',
    },
  ];

  return (
    <section className="h-card is-lead" aria-label={`Averages for the week ending ${week.label}`}>
      <div className="h-lead-head">
        {phase && <span className="tag acc">{phase.label}</span>}
        <span className="eyebrow is-strong">{week.isPartial ? 'This week so far' : 'Last full week'}</span>
        <span className="eyebrow">
          Week ending {week.label} · {week.dayCount === 1 ? '1 day' : `${week.dayCount} days`} recorded
        </span>
      </div>

      <div className="h-lead-figs">
        <div>
          <div className="h-k">Avg weight this week</div>
          <div className="h-big">{lb(week.avgWeight)}</div>
          <div className={`h-l ${downIsGood(week.weightChange)}`}>
            {week.weightChange !== null
              ? `${formatDelta(week.weightChange)} ${weightUnit} vs the week before`
              : rows.length === 1
                ? 'no earlier week to compare'
                : 'no weigh-ins to compare'}
          </div>
        </div>
        <div className="stats h-lead-stats">
          {supporting.map((s) => (
            <div key={s.label}>
              <div className="k">{s.label}</div>
              <div className="n">{s.value}</div>
              <div className={`l ${s.tone}`}>{s.detail}</div>
            </div>
          ))}
        </div>
      </div>

      {phase ? (
        <div className="h-block">
          <div className="h-block-head">
            <div className="eyebrow">
              The {phase.label.toLowerCase()} so far · since {phase.startLabel} · week {phase.weekCount} ·{' '}
              {phase.dayCount} days tracked
            </div>
            {phase.goalWeight !== null && phase.goalRemaining !== null && (
              <div>
                <span className="h-n">
                  {formatNumber(phase.goalRemaining, 1)} {weightUnit} to go
                </span>{' '}
                <span className="h-aside">
                  to the {formatNumber(phase.goalWeight, 1)} {weightUnit} goal
                  {phase.goalPercent !== null && ` · ${Math.round(phase.goalPercent)}%`}
                </span>
              </div>
            )}
          </div>

          <Track rows={rows} phase={phase} weightUnit={weightUnit} />

          <div className="h-facts">
            <div>
              <div className="h-k">Started at</div>
              <div className="h-n">{lb(phase.startWeight)}</div>
              <div className="h-l">first reading</div>
            </div>
            <div>
              <div className="h-k">Now</div>
              <div className="h-n">{lb(phase.currentWeight)}</div>
              <div className="h-l">week avg</div>
            </div>
            <div>
              <div className="h-k">Change</div>
              <div className={`h-n ${blockTone(phase.weightChange)}`}>{signedLb(phase.weightChange)}</div>
              <div className="h-l">since the start</div>
            </div>
            <div>
              <div className="h-k">Per week</div>
              <div className={`h-n ${blockTone(phase.weightChangePerWeek)}`}>{signedLb(phase.weightChangePerWeek)}</div>
              <div className="h-l">whole block</div>
            </div>
            {/*
              The whole-block rate is front-loaded by the first fortnight's water, so once a distinct recent
              rate exists it is shown beside it, and the projection extrapolates this one.
            */}
            {phase.recentChangePerWeek !== null && (
              <div>
                <div className="h-k">Recent pace</div>
                <div className={`h-n ${blockTone(phase.recentChangePerWeek)}`}>{signedLb(phase.recentChangePerWeek)}</div>
                <div className="h-l">last 3 weeks</div>
              </div>
            )}
            {phase.projectedGoalLabel !== null && (
              <div>
                <div className="h-k">On pace for</div>
                <div className="h-n">{phase.projectedGoalLabel}</div>
                <div className="h-l">{phase.recentChangePerWeek !== null ? 'at the recent pace' : 'at this rate'}</div>
              </div>
            )}
          </div>

          <p className="h-l h-lead-note">
            {phase.note && `${phase.note.replace(/\.?$/, '.')} `}
            {phase.goalPercent !== null && 'Each notch is a week’s average: '}
            {phase.goalPercent !== null ? 'a' : 'A'} single day moves a pound or two on water alone, so the week is the
            unit that shows real progress.
          </p>
        </div>
      ) : (
        <p className="h-l h-lead-note">
          Weekly averages, not the last reading on the scale: a single day moves a pound or two on water alone, so the
          week is the unit that shows real progress.
        </p>
      )}
    </section>
  );
}

/** Start weight to goal, filled to the newest week's average, with a notch at each week's average. */
function Track({ rows, phase, weightUnit }: { rows: WeeklyTrendRow[]; phase: PhaseSummary; weightUnit: string }) {
  const { startWeight: start, goalWeight: goal, goalPercent: percent, currentWeight: now } = phase;
  if (start === null || goal === null || percent === null || start === goal) return null;

  const at = (w: number) => Math.min(100, Math.max(0, ((start - w) / (start - goal)) * 100));
  const notches = rows.filter(
    (r) => r.avgWeight !== null && r.weekEnd >= phase.start && (phase.end === null || r.weekStart <= phase.end),
  );
  // Keep the "now" pin's label inside the track at either end.
  const pin = percent < 10 ? 'translateX(0)' : percent > 90 ? 'translateX(-100%)' : 'translateX(-50%)';

  return (
    <div
      className="h-track"
      role="img"
      aria-label={`From ${formatNumber(start, 1)} ${weightUnit} at the start to the ${formatNumber(goal, 1)} ${weightUnit} goal: ${
        now !== null ? `${formatNumber(now, 1)} ${weightUnit} now, ` : ''
      }${Math.round(percent)} percent of the way, with a notch for each week's average`}
    >
      <i className="h-fill" style={{ width: `${Math.round(percent * 10) / 10}%` }} />
      {notches.map((r) => (
        <span
          key={r.weekStart}
          className="h-notch"
          style={{ left: `${at(r.avgWeight as number).toFixed(2)}%` }}
          title={`Week ending ${r.label}: ${formatNumber(r.avgWeight as number, 1)} ${weightUnit}`}
        />
      ))}
      {now !== null && (
        <span className="h-pin" style={{ left: `${percent}%`, transform: pin }}>
          {formatNumber(now, 1)} · week avg
        </span>
      )}
      <span className="h-end">
        {formatNumber(start, 1)} · {phase.startLabel}
      </span>
      <span className="h-end is-goal">{formatNumber(goal, 1)} · goal</span>
    </div>
  );
}
