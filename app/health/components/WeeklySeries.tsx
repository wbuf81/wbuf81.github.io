import type { HealthDay, PhaseSummary, WeeklyTrendRow } from '@/types/health';
import { shortDate } from './format';
import { type Frame, VARIANTS, type Variant, dotPath, labelStride, linePath, pct, rectPath, stepPath, sundayLabels } from './svg';
import { type TrendRange, blockSpans, weekPoints } from './trendRange';

/** A line through the weekly averages, named at its right end. */
export interface SeriesLine {
  key: string;
  /** The line's mark class, and its points' when it has them (the heavy line). */
  cls: string;
  pts?: string;
  value: (row: WeeklyTrendRow) => number | null;
  end: (v: number) => string;
}

/** A stepped reference line: one value a day in range (the goal in force that day), named at its right end. */
export interface SeriesRef {
  key: string;
  cls: string;
  values: (number | null)[];
  end: (v: number) => string;
}

interface Props {
  range: TrendRange;
  weeklyTrend: WeeklyTrendRow[];
  phases: PhaseSummary[];
  /** Each day's reading, drawn as a faint dot. */
  daily: (d: HealthDay) => number | null;
  lines: SeriesLine[];
  refs: SeriesRef[];
  step: number;
  /** Start the scale at zero (grams) rather than at the readings. */
  zero?: boolean;
  tick: (v: number) => string;
  label: string;
  /** Room on the right for the longest end label, in CSS pixels. */
  endPx: number;
}

/**
 * The half-width frames, in viewBox units. `px` is roughly how many units make a CSS pixel where the frame is drawn:
 * wide, a card 400 to 520px across beside its pair (up to 870px stacked); compact, 300 to 340px. The right gutter
 * holds the lines' names, `endPx` wide at the narrowest each frame is drawn.
 */
interface SFrame {
  w: number;
  l: number;
  t: number;
  plot: number;
  b: number;
  px: number;
}
const FRAMES: Record<Variant, SFrame> = {
  wide: { w: 1000, l: 70, t: 30, plot: 420, b: 50, px: 2.2 },
  compact: { w: 1000, l: 90, t: 50, plot: 640, b: 90, px: 3.2 },
};
/** The narrowest each frame is drawn at, which sets the right gutter and how far apart the date labels go. */
export const SERIES_RENDER_PX: Record<Variant, number> = { wide: 403, compact: 300 };
/** End labels closer than this, in CSS pixels, are pushed apart. */
const LABEL_GAP = 14;
const f1 = (n: number) => n.toFixed(1);

/**
 * Weekly averages over the daily readings, on the weight chart's day-based x scale and block bands: the daily values as
 * faint dots, each weekly series a line (the heavy one with points), and the reference lines stepped per the goal in
 * force each day. Every line is named at its right end, so no legend is needed for them. Ported from the mockup's
 * drawSeries; used by the Steps and the Protein, carbs and fat cards.
 */
export default function WeeklySeries({ range, weeklyTrend, phases, daily, lines, refs, step, zero = false, tick, label, endPx }: Props) {
  const ds = range.days;
  const n = ds.length;
  const spans = blockSpans(ds, phases);
  const weeks = weekPoints(ds, weeklyTrend);
  const dv = ds.map(daily);
  const all = [
    ...dv.filter((v): v is number => v !== null),
    ...lines.flatMap((ln) => weeks.map((p) => ln.value(p.row)).filter((v): v is number => v !== null)),
    ...refs.flatMap((r) => r.values.filter((v): v is number => v !== null)),
  ];
  if (!all.length) return <p className="h-note">No readings in this range.</p>;
  const lo = zero ? 0 : Math.floor(Math.min(...all) / step) * step;
  const hi = Math.max(Math.ceil(Math.max(...all) / step) * step, lo + step);

  return (
    <>
      {VARIANTS.map((v) => {
        const F = FRAMES[v];
        const r = Math.round(endPx * (F.w / SERIES_RENDER_PX[v]));
        const H = F.t + F.plot + F.b;
        const frame: Frame = { w: F.w, h: H, l: F.l, r, t: F.t, b: F.b };
        const band = (F.w - F.l - r) / Math.max(1, n);
        const x = (i: number) => F.l + band * (i + 0.5);
        const y = (u: number) => F.t + F.plot - ((u - lo) / (hi - lo)) * F.plot;
        const xs = (sp: { a: number; z: number }) => ({ x0: F.l + band * sp.a, x1: F.l + band * (sp.z + 1) });

        const tint = spans.length > 1 ? spans.filter((sp) => sp.index % 2 === 1).map((sp) => rectPath(xs(sp).x0, 4, xs(sp).x1, F.t + F.plot)).join('') : '';
        const edges = spans.filter((sp) => sp.a > 0).map((sp) => `M${f1(xs(sp).x0)} 4V${f1(F.t + F.plot)}`).join('');
        const ticks: number[] = [];
        for (let t = lo; t <= hi + 1e-9; t += step) ticks.push(t);

        // The names at the right: each reference line at its last value in range, each weekly line at its last point.
        const ends: { key: string; y: number; text: string; cls: string }[] = [];
        refs.forEach((ref) => {
          const last = [...ref.values].reverse().find((u) => u !== null);
          if (last !== undefined && last !== null) ends.push({ key: ref.key, y: y(last), text: ref.end(last), cls: 'is-note' });
        });
        const paths = lines.map((ln) => {
          const pts = weeks.filter((p) => ln.value(p.row) !== null).map((p) => ({ x: x(p.mid), y: y(ln.value(p.row) as number) }));
          const lastWeek = [...weeks].reverse().find((p) => ln.value(p.row) !== null);
          if (lastWeek) ends.push({ key: ln.key, y: y(ln.value(lastWeek.row) as number), text: ln.end(ln.value(lastWeek.row) as number), cls: 'is-sm' });
          return { ln, d: linePath(pts), dots: ln.pts ? pts.map((p) => dotPath(p.x, p.y, 3.4 * F.px)).join('') : '' };
        });
        // Top to bottom, at least LABEL_GAP apart, kept inside the frame.
        const gap = LABEL_GAP * F.px;
        ends.sort((a, b) => a.y - b.y);
        for (let k = 1; k < ends.length; k++) ends[k].y = Math.max(ends[k].y, ends[k - 1].y + gap);
        const over = ends.length ? ends[ends.length - 1].y - (F.t + F.plot + gap / 2) : 0;
        if (over > 0) ends.forEach((e) => (e.y -= over));

        const dotR = (n > 70 ? 1.6 : 2.1) * F.px;
        return (
          <div key={v} className={`h-panel h-v is-${v} h-series`}>
            <svg viewBox={`0 0 ${F.w} ${H}`} role="img" aria-label={label}>
              <path className="g-band" d={tint} />
              <path className="g-block" d={edges} />
              <path className="g-grid" d={ticks.map((t) => `M${F.l} ${f1(y(t))}H${F.w - r}`).join('')} />
              {refs.map((ref) => (
                <path key={ref.key} className={ref.cls} d={stepPath(frame, ref.values, y)} />
              ))}
              <path className="g-day" d={dv.map((u, i) => (u === null ? '' : dotPath(x(i), y(u), dotR))).join('')} />
              {paths.map(({ ln, d, dots }) => (
                <g key={ln.key}>
                  <path className={ln.cls} d={d} />
                  {ln.pts && <path className={ln.pts} d={dots} />}
                </g>
              ))}
            </svg>
            {ticks.map((t) => (
              <span key={t} className="h-ax is-left" style={{ top: pct(y(t), H), width: pct(F.l, F.w) }}>
                {tick(t)}
              </span>
            ))}
            {ends.map((e) => (
              <span key={e.key} className={`h-ax ${e.cls}`} style={{ left: `calc(${pct(F.w - r, F.w)} + 6px)`, top: pct(e.y, H), transform: 'translateY(-50%)' }}>
                {e.text}
              </span>
            ))}
            {sundayLabels(ds, labelStride(band, F.w, SERIES_RENDER_PX[v], 50)).map(({ day, i }) => (
              <span key={day.date} className="h-ax is-x" style={{ left: pct(x(i), F.w) }}>
                {shortDate(day.date)}
              </span>
            ))}
          </div>
        );
      })}
    </>
  );
}
