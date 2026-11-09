'use client';

import { useMemo, useState } from 'react';
import type { PointerEvent } from 'react';
import { HealthCalorieTarget, HealthDay, PhaseSummary, WeightPoint } from '@/types/health';
import { calorieTargetFor } from '@/lib/calorieTarget';
import { dayTickLabel } from '@/lib/dayLabel';
import { calsTone, dayDate, formatDelta, formatNumber, weightTone } from './format';
import { Frame, VARIANTS, Variant, bands, barPath, cleanTop, dotPath, hline, labelStride, linePath, niceStep, pct, stepPath, sundayLabels, ticks, yScale } from './svg';

interface Props {
  days: HealthDay[];
  /** Daily weights with the 7-day trailing average, from buildWeightSeries. */
  series: WeightPoint[];
  calorieTargets: HealthCalorieTarget[];
  /** Every block (cut, bulk, maintain): each one's goal is drawn over its own days, and the weight scale keeps it in view. */
  blocks: PhaseSummary[];
  /** False until two weeks exist: a 7-day average of a few days is noise. */
  showTrend: boolean;
  weightUnit: string;
}

const FRAMES: Record<Variant, Frame> = {
  wide: { w: 1000, h: 400, l: 52, r: 62, t: 22, b: 28 },
  compact: { w: 1000, h: 940, l: 110, r: 110, t: 80, b: 80 },
};
/** The narrowest each frame is drawn at (a 981px desktop; a 360px phone), which sets how far apart the date labels go. */
const RENDER_PX: Record<Variant, number> = { wide: 873, compact: 300 };
const TIP_WIDTH = 230;
/** A block narrower than this share of the plot puts its labels at its right-hand end, so they never run off the chart. */
const NARROW = 0.22;
const f1 = (n: number) => n.toFixed(1);

/**
 * Weight and calories on one chart, two scales: the one dual-axis chart on the page, allowed by Wes
 * (3 Oct 2026) so a run of high days and the bump in the scale after it can be seen together. Calories
 * are bars on the right scale, blue at or under the target in force that day, orange over; weight is the
 * line on the left. The note tells the reader to compare shapes, not crossings, because where two scales
 * cross means nothing.
 */
export default function WeightCalories({ days, series, calorieTargets, blocks, showTrend, weightUnit }: Props) {
  const [hover, setHover] = useState<{ i: number; x: number; left: number } | null>(null);

  const targets = useMemo(() => days.map((d) => calorieTargetFor(d.date, calorieTargets)), [days, calorieTargets]);
  const hasTarget = targets.some((t) => t !== null);

  // Each block the chart's days touch, with the first and last day it covers (Wes alternates cuts and bulks, so a
  // goal belongs to its block's weeks, never to the whole chart).
  const spans = useMemo(
    () =>
      blocks
        .map((b) => {
          const i0 = days.findIndex((d) => d.date >= b.start);
          let i1 = -1;
          for (let i = days.length - 1; i >= 0; i--) if (b.end === null || days[i].date <= b.end) { i1 = i; break; }
          return i0 === -1 || i1 < i0 ? null : { type: b.type, label: b.label, goal: b.goalWeight, i0, i1 };
        })
        .filter((s): s is NonNullable<typeof s> => s !== null),
    [blocks, days],
  );
  const goals = spans.map((s) => s.goal).filter((g): g is number => g !== null);
  const blockAt = (i: number) => spans.find((s) => i >= s.i0 && i <= s.i1)?.type ?? null;

  // Scales shared by both frames.
  const scales = useMemo(() => {
    const weights = days.map((d) => d.weight).filter((w): w is number => w !== null);
    const all = [...weights, ...goals];
    const wMin = Math.min(...all);
    const wMax = Math.max(...all);
    const step = niceStep(wMax - wMin + 2, 5);
    return {
      step,
      wLo: Math.floor((wMin - 1) / step) * step,
      wHi: Math.ceil((wMax + 1) / step) * step,
      cHi: cleanTop(Math.max(...days.map((d) => d.cals ?? 0), ...targets.map((t) => t ?? 0)), 1000),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days, goals.join(','), targets]);

  const charts = useMemo(() => {
    const build = (v: Variant) => {
      const F = FRAMES[v];
      const { band, x } = bands(F, days.length);
      const wy = yScale(F, scales.wLo, scales.wHi);
      const cy = yScale(F, 0, scales.cHi);
      const bw = Math.max(2, band * 0.62);
      let under = '';
      let over = '';
      // A day before the first target was scored against nothing, so it is neither blue nor orange.
      let plain = '';
      days.forEach((d, i) => {
        if (d.cals === null) return;
        const path = barPath(x(i), bw, cy(0), cy(d.cals));
        const t = targets[i];
        if (hasTarget && t === null) plain += path;
        else if (t !== null && d.cals > t) over += path;
        else under += path;
      });
      const points = days.map((d, i) => (d.weight === null ? null : { x: x(i), y: wy(d.weight) }));
      const trend = series.map((p, i) => (p.trend === null ? null : { x: x(i), y: wy(p.trend) }));
      const dot = v === 'wide' ? 3 : 7;
      return {
        v,
        F,
        band,
        x,
        grid: ticks(scales.wLo, scales.wHi, scales.step).map((t) => hline(F, wy(t))).join(''),
        under,
        over,
        plain,
        target: hasTarget ? stepPath(F, targets, cy) : '',
        // Each block's goal, only across its own days; a rule where each block after the first begins.
        goal: spans
          .filter((sp) => sp.goal !== null)
          .map((sp) => `M${f1(F.l + band * sp.i0)} ${f1(wy(sp.goal as number))}H${f1(F.l + band * (sp.i1 + 1))}`)
          .join(''),
        edges: spans
          .filter((sp) => sp.i0 > 0)
          .map((sp) => `M${f1(F.l + band * sp.i0)} ${F.t}V${F.h - F.b}`)
          .join(''),
        marks: spans.map((sp) => {
          const x0 = F.l + band * sp.i0;
          const x1 = F.l + band * (sp.i1 + 1);
          // A narrow block (a bulk in its first weeks) labels from its right-hand end, so the words stay on the chart.
          const anchor =
            (x1 - x0) / (F.w - F.l - F.r) < NARROW ? { right: `calc(${pct(F.w - x1, F.w)} + 6px)` } : { left: `calc(${pct(x0, F.w)} + 6px)` };
          return {
            key: `${sp.label}-${sp.i0}`,
            label: sp.label,
            anchor,
            top: pct(F.t, F.h),
            goal: sp.goal,
            goalTop: sp.goal !== null ? pct(wy(sp.goal), F.h) : '0',
          };
        }),
        daily: linePath(points),
        dots: points.map((p) => (p ? dotPath(p.x, p.y, dot) : '')).join(''),
        trend: showTrend ? linePath(trend) : '',
        left: ticks(scales.wLo, scales.wHi, scales.step).map((t) => ({ t, top: pct(wy(t), F.h) })),
        right: ticks(0, scales.cHi, 1000).map((t) => ({ t, top: pct(cy(t), F.h) })),
        sundays: sundayLabels(days, labelStride(band, F.w, RENDER_PX[v])).map(({ day, i, thin }) => ({
          key: day.date,
          left: pct(x(i), F.w),
          label: dayTickLabel(day),
          thin: v === 'wide' && thin,
        })),
      };
    };
    return VARIANTS.map(build);
  }, [days, series, targets, hasTarget, spans, showTrend, scales]);

  const move = (e: PointerEvent<HTMLDivElement>, c: (typeof charts)[number]) => {
    const r = e.currentTarget.getBoundingClientRect();
    if (r.width === 0) return;
    const i = Math.floor((((e.clientX - r.left) / r.width) * c.F.w - c.F.l) / c.band);
    if (!Number.isFinite(i)) return;
    if (i < 0 || i >= days.length) return setHover(null);
    const x = (c.x(i) / c.F.w) * r.width;
    // The tip sits to the right of the line, or to its left near the right edge; never past either edge.
    const left = x + 12 + TIP_WIDTH > r.width ? Math.max(0, x - 12 - TIP_WIDTH) : x + 12;
    setHover({ i, x, left });
  };
  const leave = (e: PointerEvent<HTMLDivElement>) => {
    // A tap on a phone ends with pointerleave; keep its tip up until the next tap.
    if (e.pointerType !== 'touch') setHover(null);
  };

  const h = hover ? days[hover.i] : null;
  const next = h ? days.find((d) => d.date > h.date) : undefined;
  const nextChange = h && next && next.date === addDay(h.date) && h.weight !== null && next.weight !== null ? next.weight - h.weight : null;
  const target = hover ? targets[hover.i] : null;
  const vs = h && h.cals !== null && target !== null ? h.cals - target : null;

  const block = hover ? blockAt(hover.i) : null;

  return (
    <section className="h-card">
      <div className="h-card-h">
        <h2>Weight and calories</h2>
        <div className="h-legend">
          {showTrend && (
            <span>
              <i className="h-sw is-line is-accent" />
              Weight, 7-day average · left
            </span>
          )}
          <span>
            <i className="h-sw is-hollow" />
            Daily weigh-in · left
          </span>
          <span>
            <i className="h-sw is-under" />
            {hasTarget ? 'Calories at or under target · right' : 'Calories · right'}
          </span>
          {hasTarget && (
            <span>
              <i className="h-sw is-over" />
              Over target · right
            </span>
          )}
          {goals.length > 0 && (
            <span>
              <i className="h-sw is-goal" />
              Goal weight · left
            </span>
          )}
          {hasTarget && (
            <span>
              <i className="h-sw is-target" />
              Calorie target · right
            </span>
          )}
          {hasTarget && targets.some((t, i) => t === null && days[i].cals !== null) && (
            <span>
              <i className="h-sw is-plain" />
              No target · right
            </span>
          )}
        </div>
      </div>
      <p className="h-note">
        Two scales: the line reads against {weightUnit} on the left, the bars against calories on the right. Compare
        the shapes, not where they cross.{goals.length > 0 && ' Each goal runs over its own block’s weeks, and a rule marks where a block began.'}
      </p>
      {charts.map((c) => (
        <div
          key={c.v}
          className={`h-panel h-v is-${c.v} is-hover`}
          onPointerMove={(e) => move(e, c)}
          onPointerDown={(e) => move(e, c)}
          onPointerLeave={leave}
        >
          <svg viewBox={`0 0 ${c.F.w} ${c.F.h}`} role="img" aria-label="Daily calories as bars on a right-hand scale, with weight as a line on a left-hand scale">
            <path className="g-grid" d={c.grid} />
            <path className="g-block" d={c.edges} />
            <path className="g-under" d={c.under} />
            <path className="g-over" d={c.over} />
            <path className="g-plain" d={c.plain} />
            <path className="g-target" d={c.target} />
            <path className="g-goal" d={c.goal} />
            <path className="g-daily" d={c.daily} />
            <path className="g-avg" d={c.trend} />
            <path className="g-hollow" d={c.dots} />
          </svg>
          <span className="h-ax is-unit" style={{ left: 0 }}>
            {weightUnit}
          </span>
          <span className="h-ax is-unit" style={{ right: 0 }}>
            kcal
          </span>
          {c.left.map(({ t, top }) => (
            <span key={`l${t}`} className="h-ax is-left" style={{ top, width: pct(c.F.l, c.F.w) }}>
              {formatNumber(t, scales.step < 1 ? 1 : 0)}
            </span>
          ))}
          {c.right.map(({ t, top }) => (
            <span key={`r${t}`} className="h-ax is-right" style={{ top, width: pct(c.F.r, c.F.w) }}>
              {c.v === 'wide' ? formatNumber(t) : t === 0 ? '0' : `${t / 1000}k`}
            </span>
          ))}
          {c.sundays.map((s) => (
            <span key={s.key} className={`h-ax is-x${s.thin ? ' is-thin' : ''}`} style={{ left: s.left }}>
              {s.label}
            </span>
          ))}
          {c.marks.map((m) => (
            <span key={`b-${m.key}`}>
              <span className="h-ax is-block" style={{ ...m.anchor, top: m.top }}>
                {m.label}
              </span>
              {m.goal !== null && (
                <span className="h-ax is-note is-goal" style={{ ...m.anchor, top: m.goalTop, transform: 'translateY(-130%)' }}>
                  goal {formatNumber(m.goal, 1)}
                </span>
              )}
            </span>
          ))}
          {hover && h && (
            <>
              <span className="h-crosshair" style={{ left: hover.x, top: pct(c.F.t, c.F.h), bottom: pct(c.F.b, c.F.h) }} />
              <div className="h-tip" style={{ left: hover.left, width: TIP_WIDTH }}>
                <div className="h-k">{dayDate(h.date)}</div>
                <div className="h-row">
                  <span>Weight</span>
                  <b>{h.weight !== null ? `${formatNumber(h.weight, 1)} ${weightUnit}` : '—'}</b>
                </div>
                <div className="h-row">
                  <span>Next morning</span>
                  <b className={weightTone(nextChange, block)}>{nextChange !== null ? `${formatDelta(nextChange)} ${weightUnit}` : '—'}</b>
                </div>
                <div className="h-row">
                  <span>Calories</span>
                  <b>{h.cals !== null ? formatNumber(h.cals) : '—'}</b>
                </div>
                {vs !== null && (
                  <div className="h-row">
                    <span>Vs target</span>
                    <b className={calsTone(vs, h.cals, block)}>{formatDelta(vs, 0)}</b>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      ))}
    </section>
  );
}

function addDay(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
}
