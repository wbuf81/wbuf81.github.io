'use client';

import { useMemo, useState } from 'react';
import type { PointerEvent } from 'react';
import type { HealthCalorieTarget, PhaseSummary, WeeklyTrendRow } from '@/types/health';
import { calorieTargetFor } from '@/lib/calorieTarget';
import { calorieLight, type Light } from '@/lib/healthCalendar';
import { calsTone, dayDate, formatDelta, formatNumber, shortDate } from './format';
import FitRow, { type FitCell } from './FitRow';
import { VARIANTS, type Variant, dotPath, labelStride, linePath, pct, rectPath, sundayLabels } from './svg';
import { type TrendRange, blockDates, blockDirection, blockOn, blockSpans, planAt, stepFor, weekPoints } from './trendRange';

interface Props {
  range: TrendRange;
  weeklyTrend: WeeklyTrendRow[];
  /** Every block: each is a band with its name, dates and net change, and its goal and plan if it has them. */
  phases: PhaseSummary[];
  calorieTargets: HealthCalorieTarget[];
  /** The block the newest data falls in (lib/health › leadPhase): the goal the facts measure to. */
  lead: PhaseSummary | null;
  weightUnit: string;
}

/**
 * The frames, in viewBox units. Weight on top, the calorie strip under it on the same dates. `px` is roughly how many
 * units make a CSS pixel where the frame is drawn (wide: a card 873 to 1,160px across; compact: 300 to 340px), so
 * marks and offsets read the same size in both.
 */
interface WFrame {
  w: number;
  l: number;
  r: number;
  /** Room above the plot for two label rows. */
  t: number;
  plot: number;
  /** Between the weight plot and the calorie strip: the strip's caption and the target ruler. */
  gap: number;
  cal: number;
  b: number;
  /** The middles of the two label rows. */
  rows: [number, number];
  px: number;
  dot: number;
  wk: number;
}
const FRAMES: Record<Variant, WFrame> = {
  wide: { w: 1000, l: 50, r: 50, t: 56, plot: 280, gap: 58, cal: 110, b: 30, rows: [13, 32], px: 1, dot: 2.3, wk: 4.6 },
  compact: { w: 1000, l: 125, r: 115, t: 175, plot: 700, gap: 180, cal: 300, b: 95, rows: [42, 102], px: 3.1, dot: 5.5, wk: 11 },
};
const height = (F: WFrame) => F.t + F.plot + F.gap + F.cal + F.b;
/** The narrowest each frame is drawn at, which sets how far apart the date labels go. */
const RENDER_PX: Record<Variant, number> = { wide: 873, compact: 300 };
/** A bar per day up to this many days in range; a bar per week beyond it. */
export const DAILY_BARS_MAX = 70;
const TIP_WIDTH = 230;
/** A block narrower than this share of the plot names its in-scale goal from its right-hand end. */
const NARROW = 0.22;
const f1 = (n: number) => n.toFixed(1);
const LIGHTS: Light[] = ['hit', 'close', 'miss'];

/**
 * Weight on its own scale, zoomed to the readings in range: daily weigh-ins as faint dots, the line through the weekly
 * averages, each block a labelled band with its goal (a line when it falls on the scale, a label with an arrow when it
 * does not) and its planned pace. Calories sit underneath on the same dates, as bars above and below each day's
 * target, coloured on the calendar's rule. Ported from the mockup's drawWeight.
 */
export default function WeightTrend({ range, weeklyTrend, phases, calorieTargets, lead, weightUnit }: Props) {
  const [hover, setHover] = useState<{ i: number; x: number; left: number } | null>(null);
  const ds = range.days;
  const n = ds.length;

  const model = useMemo(() => {
    const spans = blockSpans(ds, phases);
    const blocks = ds.map((d) => blockOn(phases, d.date));
    const targets = ds.map((d) => calorieTargetFor(d.date, calorieTargets));
    const wpts = weekPoints(ds, weeklyTrend).filter((p) => p.row.avgWeight !== null);
    const plans = spans
      .map((sp) => {
        const y0 = planAt(sp.phase, ds[sp.a].date);
        const y1 = planAt(sp.phase, ds[sp.z].date);
        return y0 === null || y1 === null ? null : { sp, y0, y1 };
      })
      .filter((p): p is NonNullable<typeof p> => p !== null);

    const vals = [
      ...ds.map((d) => d.weight).filter((v): v is number => v !== null),
      ...wpts.map((p) => p.row.avgWeight as number),
      ...plans.flatMap((p) => [p.y0, p.y1]),
    ];
    if (!vals.length) return null;
    let lo = Math.min(...vals);
    let hi = Math.max(...vals);
    const step = stepFor(hi - lo + 1, 8);
    lo = Math.floor((lo - 0.3) / step) * step;
    hi = Math.ceil((hi + 0.3) / step) * step;

    // Calories against target: a bar per day, or per week once the range is long.
    const weekly = n > DAILY_BARS_MAX;
    const bars: { v: number; mid: number; width: number; light: Light }[] = [];
    if (!weekly) {
      ds.forEach((d, i) => {
        const t = targets[i];
        if (d.cals === null || t === null) return;
        bars.push({ v: d.cals - t, mid: i, width: 0.66, light: calorieLight(d.cals, t, blocks[i]?.type ?? null) });
      });
    } else {
      weekPoints(ds, weeklyTrend).forEach((p) => {
        const { avgCals, calsVsGoal } = p.row;
        if (avgCals === null || calsVsGoal === null) return;
        bars.push({ v: calsVsGoal, mid: p.mid, width: p.count * 0.7, light: calorieLight(avgCals, avgCals - calsVsGoal, p.row.phase?.type ?? null) });
      });
    }
    const cmin = Math.min(0, ...bars.map((b) => b.v));
    const cmax = Math.max(0, ...bars.map((b) => b.v));
    const cstep = cmax - cmin > 900 ? 500 : cmax - cmin > 400 ? 250 : 100;
    const clo = Math.floor(cmin / cstep) * cstep;
    const chi = Math.max(Math.ceil(cmax / cstep) * cstep, clo + cstep);

    // Where the target changes: a tick, and the new number when there is room before the next change.
    const steps: { i: number; cals: number }[] = [];
    targets.forEach((t, i) => {
      if (t !== null && (i === 0 || t !== targets[i - 1])) steps.push({ i, cals: t });
    });

    return { spans, blocks, targets, wpts, plans, lo, hi, step, weekly, bars, clo, chi, cstep, steps };
  }, [ds, n, phases, calorieTargets, weeklyTrend]);

  const charts = useMemo(() => {
    if (!model) return [];
    const { spans, wpts, plans, lo, hi, step, bars, clo, chi, cstep, steps } = model;
    return VARIANTS.map((v) => {
      const F = FRAMES[v];
      const H = height(F);
      const plotW = F.w - F.l - F.r;
      const band = plotW / Math.max(1, n);
      const x = (i: number) => F.l + band * (i + 0.5);
      const y = (w: number) => F.t + F.plot - ((w - lo) / (hi - lo)) * F.plot;
      const y2 = F.t + F.plot + F.gap;
      const yc = (c: number) => y2 + F.cal - ((c - clo) / (chi - clo)) * F.cal;
      const xs = (sp: { a: number; z: number }) => ({ x0: F.l + band * sp.a, x1: F.l + band * (sp.z + 1) });

      // Bands: alternate blocks tinted when there is more than one, and a rule where each begins.
      const tint = spans.length > 1 ? spans.filter((sp) => sp.index % 2 === 1).map((sp) => rectPath(xs(sp).x0, 4, xs(sp).x1, H - F.b)).join('') : '';
      const edges = spans.filter((sp) => sp.a > 0).map((sp) => `M${f1(xs(sp).x0)} 4V${f1(H - F.b)}`).join('');

      const wTicks: number[] = [];
      for (let t = lo; t <= hi + 1e-9; t += step) wTicks.push(Math.round(t * 100) / 100);
      const cTicks: number[] = [];
      for (let t = clo; t <= chi + 1e-9; t += cstep) cTicks.push(t);
      const grid =
        wTicks.map((t) => `M${F.l} ${f1(y(t))}H${F.w - F.r}`).join('') +
        cTicks.filter((t) => t !== 0).map((t) => `M${F.l} ${f1(yc(t))}H${F.w - F.r}`).join('');

      const goalIn = (g: number | null): g is number => g !== null && g >= lo && g <= hi;
      const goals = spans.filter((sp) => goalIn(sp.phase.goalWeight));

      // Label rows: the block's name, dates and net change; then its goal, when the goal is off the scale.
      const nameRow: FitCell[] = spans.map((sp) => {
        const p = sp.phase;
        const nm = p.label.toUpperCase();
        const net = p.weightChange !== null ? `${formatDelta(p.weightChange)} ${weightUnit}` : '';
        return {
          key: `${p.start}`,
          ...xs(sp),
          words: net ? [`${nm} · ${blockDates(p)} · ${net}`, `${nm} · ${net}`, nm] : [`${nm} · ${blockDates(p)}`, nm],
        };
      });
      const goalRow: FitCell[] = spans.map((sp) => {
        const p = sp.phase;
        if (p.goalWeight === null || goalIn(p.goalWeight) || p.currentWeight === null) return { key: p.start, ...xs(sp), words: [] };
        const arrow = p.goalWeight > hi ? '↑' : '↓';
        const gap = formatNumber(Math.abs(p.goalWeight - p.currentWeight), 1);
        const reached = blockDirection(p.type) * (p.currentWeight - p.goalWeight) >= 0;
        const tail = reached ? 'reached' : p.isOngoing ? `${gap} ${weightUnit} to go` : `ended ${gap} ${weightUnit} short`;
        return { key: p.start, ...xs(sp), words: [`goal ${formatNumber(p.goalWeight)} ${arrow} ${tail}`, `goal ${formatNumber(p.goalWeight)} ${arrow}`] };
      });

      const goalMarks = goals.map((sp) => {
        const { x0, x1 } = xs(sp);
        const g = sp.phase.goalWeight as number;
        const anchor = (x1 - x0) / plotW < NARROW ? { right: `calc(${pct(F.w - x1, F.w)} + 6px)` } : { left: `calc(${pct(x0, F.w)} + 6px)` };
        return { key: sp.phase.start, anchor, top: pct(y(g), H), text: `${sp.phase.label} goal ${formatNumber(g, 1)}`, d: `M${f1(x0)} ${f1(y(g))}H${f1(x1)}` };
      });
      const planMarks = plans.map((p) => ({
        key: p.sp.phase.start,
        d: `M${f1(x(p.sp.a))} ${f1(y(p.y0))}L${f1(x(p.sp.z))} ${f1(y(p.y1))}`,
        left: `calc(${pct(x(p.sp.z) + band / 2, F.w)} + 5px)`,
        top: pct(y(p.y1), H),
      }));

      // Value labels: the newest weekly average, the first in range, and the lowest.
      const values: { key: string; left: string; top: string; transform: string; text: string }[] = [];
      if (wpts.length) {
        const at = (k: number) => ({ px: x(wpts[k].mid), w: wpts[k].row.avgWeight as number });
        const lastK = wpts.length - 1;
        const last = at(lastK);
        const rising = lastK === 0 || last.w >= at(lastK - 1).w;
        values.push({ key: 'last', left: pct(last.px, F.w), top: pct(y(last.w), H), transform: `translate(calc(-100% + 4px), ${rising ? 'calc(-100% - 6px)' : '6px'})`, text: formatNumber(last.w, 1) });
        if (lastK > 0) {
          const first = at(0);
          const falling = at(1).w < first.w;
          values.push({ key: 'first', left: pct(first.px, F.w), top: pct(y(first.w), H), transform: `translate(-2px, ${falling ? 'calc(-100% - 6px)' : '6px'})`, text: formatNumber(first.w, 1) });
        }
        let lowK = 0;
        wpts.forEach((p, k) => {
          if ((p.row.avgWeight as number) < (wpts[lowK].row.avgWeight as number)) lowK = k;
        });
        if (lowK !== 0 && lowK !== lastK) {
          const low = at(lowK);
          values.push({ key: 'low', left: pct(low.px, F.w), top: pct(y(low.w), H), transform: 'translate(-50%, 6px)', text: formatNumber(low.w, 1) });
        }
      }

      const barPaths: Record<Light, string> = { hit: '', close: '', miss: '', none: '' };
      bars.forEach((b) => {
        const cx = F.l + band * (b.mid + 0.5);
        const bw = Math.max(1.5 * F.px, band * b.width);
        barPaths[b.light] += rectPath(cx - bw / 2, yc(0), cx + bw / 2, yc(b.v), F.px);
      });

      // The target ruler: a tick at each change, its number when there is room before the next one.
      const rulerY = y2 - 17 * F.px;
      const ruler = steps.map((s, k) => {
        const x0 = F.l + band * s.i;
        const x1 = k + 1 < steps.length ? F.l + band * steps[k + 1].i : F.w - F.r;
        const num = formatNumber(s.cals);
        return { key: `${s.i}`, x0, x1, words: k === 0 ? [`target ${num}`, num] : [num] };
      });
      const rulerTicks = steps.map((s) => `M${f1(F.l + band * s.i)} ${f1(y2 - 24 * F.px)}V${f1(y2 - 10 * F.px)}`).join('');

      const stride = labelStride(band, F.w, RENDER_PX[v], 50);
      return {
        v,
        F,
        H,
        band,
        x,
        tint,
        edges,
        grid,
        zero: `M${F.l} ${f1(yc(0))}H${F.w - F.r}`,
        goalMarks,
        planMarks,
        dots: ds.map((d, i) => (d.weight === null ? '' : dotPath(x(i), y(d.weight), F.dot))).join(''),
        avg: linePath(wpts.map((p) => ({ x: x(p.mid), y: y(p.row.avgWeight as number) }))),
        wk: wpts.map((p) => dotPath(x(p.mid), y(p.row.avgWeight as number), F.wk)).join(''),
        values,
        barPaths,
        nameRow,
        goalRow,
        ruler,
        rulerY,
        rulerTicks,
        captionTop: pct(y2 - 36 * F.px, H),
        wTicks: wTicks.map((t) => ({ t, top: pct(y(t), H) })),
        cTicks: cTicks.map((t) => ({ t, top: pct(yc(t), H) })),
        sundays: sundayLabels(ds, stride).map(({ day, i, thin }) => ({ key: day.date, left: pct(x(i), F.w), label: shortDate(day.date), thin: v === 'wide' && thin })),
        crossTop: pct(F.t, H),
        crossBottom: pct(F.b, H),
      };
    });
  }, [model, ds, n, weightUnit]);

  if (!model) {
    return (
      <section className="h-card is-lead">
        <div className="h-card-h">
          <h2>Weight</h2>
        </div>
        <p className="h-note">No weigh-ins in this range.</p>
      </section>
    );
  }

  const move = (e: PointerEvent<HTMLDivElement>, c: (typeof charts)[number]) => {
    const r = e.currentTarget.getBoundingClientRect();
    if (r.width === 0) return;
    const i = Math.floor((((e.clientX - r.left) / r.width) * c.F.w - c.F.l) / c.band);
    if (!Number.isFinite(i)) return;
    if (i < 0 || i >= n) return setHover(null);
    const x = (c.x(i) / c.F.w) * r.width;
    // The tip sits to the right of the line, or to its left near the right edge; never past either edge.
    const left = x + 12 + TIP_WIDTH > r.width ? Math.max(0, x - 12 - TIP_WIDTH) : x + 12;
    setHover({ i, x, left });
  };
  const leave = (e: PointerEvent<HTMLDivElement>) => {
    // A tap on a phone ends with pointerleave; keep its tip up until the next tap.
    if (e.pointerType !== 'touch') setHover(null);
  };

  const h = hover ? ds[hover.i] : null;
  const hBlock = hover ? model.blocks[hover.i] : null;
  const hTarget = hover ? model.targets[hover.i] : null;
  const hWeek = h ? weeklyTrend.find((w) => h.date >= w.weekStart && h.date <= w.weekEnd) : undefined;
  const vs = h && h.cals !== null && hTarget !== null ? h.cals - hTarget : null;

  // The facts follow the range: the newest week, the change over the weeks shown, the distance to the goal.
  const lastWeek = [...weeklyTrend].reverse().find((w) => w.avgWeight !== null);
  const { wpts } = model;
  const firstPt = wpts[0];
  const lastPt = wpts[wpts.length - 1];
  const facts: { k: string; n: string; l: string }[] = [];
  if (lastWeek) {
    facts.push({
      k: `Week ending ${shortDate(lastWeek.weekEnd)}`,
      n: `${formatNumber(lastWeek.avgWeight as number, 1)} ${weightUnit}`,
      l: lastWeek.weightChange !== null ? `${formatDelta(lastWeek.weightChange)} ${weightUnit} on the week before` : 'first week',
    });
  }
  if (wpts.length > 1) {
    const a = Number((firstPt.row.avgWeight as number).toFixed(1));
    const b = Number((lastPt.row.avgWeight as number).toFixed(1));
    facts.push({
      k: `Over the ${wpts.length} weeks shown`,
      n: `${formatDelta(b - a)} ${weightUnit}`,
      l: `${formatNumber(a, 1)} to ${formatNumber(b, 1)} ${weightUnit}, weekly averages`,
    });
  }
  if (lead && lead.isOngoing && lead.goalWeight !== null && lead.goalRemaining !== null) {
    facts.push({
      k: 'To the goal',
      n: `${formatNumber(lead.goalRemaining, 1)} ${weightUnit}`,
      l: `${formatNumber(lead.goalWeight)} ${weightUnit}, the ${lead.label.toLowerCase()}’s goal`,
    });
  }

  const hasPlan = model.plans.length > 0;
  const hasGoalLine = charts[0]?.goalMarks.length > 0;
  const shown = new Set(model.bars.map((b) => b.light));

  return (
    <section className="h-card is-lead">
      <div className="h-card-h">
        <h2>Weight</h2>
        <div className="h-legend">
          <span>
            <i className="h-sw is-line is-accent" />
            Weekly average
          </span>
          <span>
            <i className="h-sw is-dot is-mark" />
            Daily weigh-in
          </span>
          {hasPlan && (
            <span>
              <i className="h-sw is-plan" />
              Plan
            </span>
          )}
          {hasGoalLine && (
            <span>
              <i className="h-sw is-goal" />
              Goal
            </span>
          )}
          {LIGHTS.filter((l) => shown.has(l)).map((l) => (
            <span key={l}>
              <i className={`h-sw is-${l}`} />
              {l === 'hit' ? 'Calories on target' : l === 'close' ? 'Close' : 'Off target'}
            </span>
          ))}
        </div>
      </div>
      {charts.map((c) => (
        <div
          key={c.v}
          className={`h-panel h-v is-${c.v} is-hover h-wt`}
          onPointerMove={(e) => move(e, c)}
          onPointerDown={(e) => move(e, c)}
          onPointerLeave={leave}
        >
          <svg viewBox={`0 0 ${c.F.w} ${c.H}`} role="img" aria-label="Weight by day with weekly averages, and calories against the day’s target underneath">
            <path className="g-band" d={c.tint} />
            <path className="g-block" d={c.edges} />
            <path className="g-grid" d={c.grid} />
            {c.goalMarks.map((g) => (
              <path key={g.key} className="g-goal" d={g.d} />
            ))}
            {c.planMarks.map((p) => (
              <path key={p.key} className="g-plan" d={p.d} />
            ))}
            <path className="g-day" d={c.dots} />
            <path className="g-avg" d={c.avg} />
            <path className="g-pts" d={c.wk} />
            {LIGHTS.map((l) => (
              <path key={l} className={`g-${l}`} d={c.barPaths[l]} />
            ))}
            <path className="g-zero" d={c.zero} />
            <path className="g-block" d={c.rulerTicks} />
          </svg>
          <FitRow cells={c.nameRow} w={c.F.w} h={c.H} y={c.F.rows[0]} className="is-name" />
          <FitRow cells={c.goalRow} w={c.F.w} h={c.H} y={c.F.rows[1]} className="is-note" />
          <span className="h-ax is-unit" style={{ left: 0, top: pct(c.F.t - 22 * c.F.px, c.H), width: pct(c.F.l, c.F.w), textAlign: 'right', paddingRight: 6 }}>
            {weightUnit}
          </span>
          {c.wTicks.map(({ t, top }) => (
            <span key={`w${t}`} className="h-ax is-left is-w" style={{ top, width: pct(c.F.l, c.F.w) }}>
              {formatNumber(t, model.step < 1 ? 1 : 0)}
            </span>
          ))}
          {c.goalMarks.map((g) => (
            <span key={`g${g.key}`} className="h-ax is-note is-goal" style={{ ...g.anchor, top: g.top, transform: 'translateY(-130%)' }}>
              {g.text}
            </span>
          ))}
          {c.planMarks.map((p) => (
            <span key={`p${p.key}`} className="h-ax is-note" style={{ left: p.left, top: p.top, transform: 'translateY(-50%)' }}>
              plan
            </span>
          ))}
          {c.values.map((s) => (
            <span key={s.key} className="h-ax is-val" style={{ left: s.left, top: s.top, transform: s.transform }}>
              {s.text}
            </span>
          ))}
          <span className="h-ax is-cap" style={{ left: pct(c.F.l, c.F.w), top: c.captionTop }}>
            {model.weekly ? (c.v === 'wide' ? 'Calories against target, weekly average' : 'Calories against target, by week') : 'Calories against the day’s target'}
          </span>
          <FitRow cells={c.ruler} w={c.F.w} h={c.H} y={c.rulerY} overflow={false} className="is-ruler" />
          {c.cTicks.map(({ t, top }) => (
            <span key={`c${t}`} className="h-ax is-left" style={{ top, width: pct(c.F.l, c.F.w) }}>
              {t === 0 ? '0' : formatDelta(t, 0)}
            </span>
          ))}
          {c.sundays.map((s) => (
            <span key={s.key} className={`h-ax is-x${s.thin ? ' is-thin' : ''}`} style={{ left: s.left }}>
              {s.label}
            </span>
          ))}
          {hover && h && (
            <>
              <span className="h-crosshair" style={{ left: hover.x, top: c.crossTop, bottom: c.crossBottom }} />
              <div className="h-tip" style={{ left: hover.left, width: TIP_WIDTH }}>
                <div className="h-k">{dayDate(h.date)}</div>
                <div className="h-row">
                  <span>Phase</span>
                  <b>{hBlock ? hBlock.label : '—'}</b>
                </div>
                <div className="h-row">
                  <span>Weight</span>
                  <b>{h.weight !== null ? `${formatNumber(h.weight, 1)} ${weightUnit}` : '—'}</b>
                </div>
                <div className="h-row">
                  <span>Week average</span>
                  <b>{hWeek && hWeek.avgWeight !== null ? `${formatNumber(hWeek.avgWeight, 1)} ${weightUnit}` : '—'}</b>
                </div>
                <div className="h-row">
                  <span>Calories</span>
                  <b>{h.cals !== null ? formatNumber(h.cals) : '—'}</b>
                </div>
                {vs !== null && (
                  <div className="h-row">
                    <span>Against target</span>
                    <b className={calsTone(vs, h.cals, hBlock?.type ?? null)}>{formatDelta(vs, 0)}</b>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      ))}
      {facts.length > 0 && (
        <div className="h-facts">
          {facts.map((f) => (
            <div key={f.k}>
              <div className="h-k">{f.k}</div>
              <div className="h-n">{f.n}</div>
              <div className="h-l">{f.l}</div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
