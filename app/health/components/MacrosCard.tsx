import { HealthDatedTargets, HealthDay } from '@/types/health';
import { targetsFor } from '@/lib/targets';
import { formatNumber, shortDate } from './format';
import { HALF } from './StepsCard';
import { VARIANTS, Variant, bands, barPath, cleanTop, hline, pct, stepPath, ticks, yScale } from './svg';

interface Props {
  days: HealthDay[];
  /** Dated standing goals; the protein goal in force each day is drawn as a stepped dashed line. */
  targets: HealthDatedTargets[];
}

/**
 * Grams per day, stacked protein / carbs / fat — one scale. Protein sits at the bottom, so a day whose
 * protein segment reaches the dashed line met the goal. The fat colour is under 3:1 against the card, so
 * the legend names every segment and the Every-day table has the grams.
 */
export default function MacrosCard({ days, targets }: Props) {
  const goals = days.map((d) => targetsFor(d.date, targets)?.proteinGoal ?? null);
  const proteinGoal = goals[goals.length - 1] ?? null;
  const totals = days.map((d) => (d.protein ?? 0) + (d.carbs ?? 0) + (d.fat ?? 0));
  const top = cleanTop(Math.max(...totals, ...goals.map((g) => g ?? 0)), 200);
  const sundays = days.map((d, i) => ({ d, i })).filter(({ d }) => d.day === 'Sun');

  // Each day against the goal in force that day, so raising the goal never rescores the days before it.
  const scored = days
    .map((d, i) => ({ protein: d.protein, goal: goals[i] }))
    .filter((s): s is { protein: number; goal: number } => s.protein !== null && s.goal !== null);
  const met = scored.filter((s) => s.protein >= s.goal).length;

  const plot = (v: Variant) => {
    const f = HALF[v];
    const { band, x } = bands(f, days.length);
    const y = yScale(f, 0, top);
    const bw = Math.max(2, band * 0.62);
    // The page showing between stacked segments: about 2px at either frame's scale. Spacing, not a border.
    const gap = v === 'wide' ? 2 : 5;
    let p = '';
    let c = '';
    let fat = '';
    days.forEach((d, i) => {
      const pr = d.protein ?? 0;
      const cb = d.carbs ?? 0;
      const ft = d.fat ?? 0;
      p += barPath(x(i), bw, y(0), y(pr));
      c += barPath(x(i), bw, y(pr) - gap, y(pr + cb));
      fat += barPath(x(i), bw, y(pr + cb) - gap, y(pr + cb + ft));
    });
    return (
      <div className={`h-panel h-v is-${v}`} key={v}>
        <svg viewBox={`0 0 ${f.w} ${f.h}`} role="img" aria-label="Macros in grams per day, stacked">
          <path className="g-grid" d={ticks(0, top, 200).map((t) => hline(f, y(t))).join('')} />
          <path className="g-p" d={p} />
          <path className="g-c" d={c} />
          <path className="g-f" d={fat} />
          <path className="g-line" d={stepPath(f, goals, y)} />
        </svg>
        {ticks(0, top, 200).map((t) => (
          <span key={t} className="h-ax is-left" style={{ top: pct(y(t), f.h), width: pct(f.l, f.w) }}>
            {formatNumber(t)}
          </span>
        ))}
        {sundays
          .filter((_, n) => n % 2 === 1)
          .map(({ d, i }) => (
            <span key={d.date} className="h-ax is-x" style={{ left: pct(x(i), f.w) }}>
              {shortDate(d.date)}
            </span>
          ))}
      </div>
    );
  };

  return (
    <section className="h-card">
      <div className="h-card-h">
        <h2>Macros</h2>
        <div className="h-legend">
          <span>
            <i className="h-sw is-s1" />
            Protein
          </span>
          <span>
            <i className="h-sw is-s2" />
            Carbs
          </span>
          <span>
            <i className="h-sw is-s3" />
            Fat
          </span>
          {proteinGoal !== null && (
            <span>
              <i className="h-sw is-dashed" />
              {formatNumber(proteinGoal)} g protein
            </span>
          )}
        </div>
      </div>
      {VARIANTS.map(plot)}
      <p className="h-note is-after">
        Grams per day, stacked, protein at the bottom
        {proteinGoal !== null && scored.length > 0 ? (
          <>
            : a protein segment reaching the dashed line met the goal, on{' '}
            <b>
              {met} of {scored.length} days
            </b>
            .
          </>
        ) : (
          '.'
        )}
      </p>
    </section>
  );
}
