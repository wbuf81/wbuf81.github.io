import { HealthDatedTargets, HealthDay, StepStreak, StepStreaks } from '@/types/health';
import { targetsFor } from '@/lib/targets';
import { formatNumber, plural, shortDate } from './format';
import { Frame, VARIANTS, Variant, bands, barPath, cleanTop, hline, labelStride, pct, stepPath, sundayLabels, ticks, yScale } from './svg';

interface Props {
  days: HealthDay[];
  targets: HealthDatedTargets[];
  streaks: StepStreaks;
}

/** Half-width charts: no right gutter, every other Sunday labelled. Compact: taller, wider label margins. */
export const HALF: Record<Variant, Frame> = {
  wide: { w: 1000, h: 360, l: 56, r: 28, t: 10, b: 32 },
  compact: { w: 1000, h: 760, l: 120, r: 24, t: 24, b: 80 },
};
/** The narrowest each half-width frame is drawn at (two-up on a 981px desktop; a 360px phone). */
export const HALF_RENDER_PX: Record<Variant, number> = { wide: 403, compact: 300 };

const k = (v: number) => (v === 0 ? '0' : `${formatNumber(v / 1000, v % 1000 === 0 ? 0 : 1)}k`);

/**
 * How long a threshold has been held. `best` is often the current run, so saying both would print the
 * same number twice; when they match it reads as a record instead.
 */
function streakLine(label: string, s: StepStreak) {
  if (s.current === 0) return <>Below the {label} on the latest day (best run {plural(s.best, 'day')}).</>;
  if (s.current === s.best)
    return (
      <>
        Above the {label} <b>{plural(s.current, 'day')}</b> running, the best run yet.
      </>
    );
  return (
    <>
      Above the {label} <b>{plural(s.current, 'day')}</b> running (best run {plural(s.best, 'day')}).
    </>
  );
}

/**
 * Daily steps. The floor and the goal are stepped lines, drawn per day from the revision in force, so a
 * goal raised later is never drawn across the weeks before it. Neutral inks, because the bars are already
 * the accent: the floor lighter, since clearing it is the baseline rather than the win.
 */
export default function StepsCard({ days, targets, streaks }: Props) {
  const inForce = days.map((d) => targetsFor(d.date, targets));
  const floors = inForce.map((t) => t?.stepsMinimum ?? null);
  const goals = inForce.map((t) => t?.stepsGoal ?? null);
  const top = cleanTop(Math.max(...days.map((d) => d.steps ?? 0), ...floors.map((v) => v ?? 0), ...goals.map((v) => v ?? 0)), 5000);

  const plot = (v: Variant) => {
    const f = HALF[v];
    const { band, x } = bands(f, days.length);
    const y = yScale(f, 0, top);
    const bw = Math.max(2, band * 0.62);
    return (
      <div className={`h-panel h-v is-${v}`} key={v}>
        <svg viewBox={`0 0 ${f.w} ${f.h}`} role="img" aria-label="Daily steps, with the floor and the goal">
          <path className="g-grid" d={ticks(0, top, 5000).map((t) => hline(f, y(t))).join('')} />
          <path className="g-bars" d={days.map((d, i) => (d.steps === null ? '' : barPath(x(i), bw, y(0), y(d.steps)))).join('')} />
          <path className="g-floor" d={stepPath(f, floors, y)} />
          <path className="g-line" d={stepPath(f, goals, y)} />
        </svg>
        {ticks(0, top, 5000).map((t) => (
          <span key={t} className="h-ax is-left" style={{ top: pct(y(t), f.h), width: pct(f.l, f.w) }}>
            {k(t)}
          </span>
        ))}
        {sundayLabels(days, labelStride(band, f.w, HALF_RENDER_PX[v])).map(({ day, i }) => (
          <span key={day.date} className="h-ax is-x" style={{ left: pct(x(i), f.w) }}>
            {shortDate(day.date)}
          </span>
        ))}
      </div>
    );
  };

  return (
    <section className="h-card">
      <div className="h-card-h">
        <h2>Steps</h2>
        <div className="h-legend">
          {streaks.minimum !== null && (
            <span className="is-quiet">
              <i className="h-sw is-dashed" />
              {k(streaks.minimum)} floor
            </span>
          )}
          {streaks.goal !== null && (
            <span>
              <i className="h-sw is-dashed" />
              {k(streaks.goal)} goal
            </span>
          )}
        </div>
      </div>
      {VARIANTS.map(plot)}
      <p className="h-note is-after">
        {streaks.minimum !== null && streakLine('floor', streaks.aboveMinimum)}
        {streaks.minimum !== null && streaks.goal !== null && ' '}
        {streaks.goal !== null && streakLine('goal', streaks.aboveGoal)}
      </p>
    </section>
  );
}
