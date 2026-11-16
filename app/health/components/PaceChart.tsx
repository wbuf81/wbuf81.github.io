'use client';

import { useMemo, useState } from 'react';
import type { PointerEvent } from 'react';
import type { PhaseSummary, WeeklyTrendRow } from '@/types/health';
import { formatDelta, formatNumber, shortDate } from './format';
import FitRow, { type FitCell } from './FitRow';
import { VARIANTS, type Variant, labelStride, pct, rectPath, sundayLabels } from './svg';
import { type TrendRange, addDays, blockDirection, blockSpans, planAt, weekPoints } from './trendRange';

interface Props {
  range: TrendRange;
  weeklyTrend: WeeklyTrendRow[];
  phases: PhaseSummary[];
  /** The block the newest data falls in (lib/health › leadPhase): the block the facts describe. */
  lead: PhaseSummary | null;
  weightUnit: string;
}

interface PFrame {
  w: number;
  l: number;
  r: number;
  t: number;
  plot: number;
  b: number;
  row: number;
  px: number;
}
/** On the same day-based x scale as the weight chart (same l and r), so the two line up. */
const FRAMES: Record<Variant, PFrame> = {
  wide: { w: 1000, l: 50, r: 50, t: 36, plot: 200, b: 30, row: 14, px: 1 },
  compact: { w: 1000, l: 125, r: 115, t: 110, plot: 560, b: 95, row: 42, px: 3.1 },
};
const height = (F: PFrame) => F.t + F.plot + F.b;
const RENDER_PX: Record<Variant, number> = { wide: 873, compact: 300 };
/** Every bar is labelled when a week is at least this many pixels wide where the frame is narrowest; else only the newest. */
const LABEL_ALL_PX = 34;
/** The plan band runs a quarter pound either side of the planned pace. */
export const PLAN_BAND = 0.25;
const TIP_WIDTH = 220;
const f1 = (n: number) => n.toFixed(1);

type Tone = 'to' | 'away' | 'flat';
const TONES: Tone[] = ['to', 'away', 'flat'];

/** Toward the block's goal, away from it, or neither (maintenance, no block, or a change under 0.05). */
export function paceTone(change: number, type: PhaseSummary['type'] | null | undefined): Tone {
  const dir = blockDirection(type);
  if (!dir || Math.abs(change) < 0.05) return 'flat';
  return Math.sign(change) === dir ? 'to' : 'away';
}

/**
 * Pounds per week: one bar per week, its average against the week before, on the weight chart's dates and bands.
 * A block with a planned pace carries a band a quarter pound either side of it. Ported from the mockup's drawPace.
 */
export default function PaceChart({ range, weeklyTrend, phases, lead, weightUnit }: Props) {
  const [hover, setHover] = useState<{ k: number; x: number; left: number } | null>(null);
  const ds = range.days;
  const n = ds.length;

  const model = useMemo(() => {
    const spans = blockSpans(ds, phases);
    const pts = weekPoints(ds, weeklyTrend).filter((p) => p.row.weightChange !== null);
    const vals = pts.map((p) => p.row.weightChange as number);
    spans.forEach((sp) => {
      if (sp.phase.ratePerWeek) vals.push(sp.phase.ratePerWeek + PLAN_BAND, sp.phase.ratePerWeek - PLAN_BAND);
    });
    let lo = Math.min(0, ...vals);
    let hi = Math.max(0, ...vals);
    const step = hi - lo > 3 ? 1 : 0.5;
    lo = Math.floor((lo - 0.05) / step) * step;
    hi = Math.ceil((hi + 0.05) / step) * step;
    return { spans, pts, lo, hi, step };
  }, [ds, phases, weeklyTrend]);

  const charts = useMemo(() => {
    const { spans, pts, lo, hi, step } = model;
    return VARIANTS.map((v) => {
      const F = FRAMES[v];
      const H = height(F);
      const band = (F.w - F.l - F.r) / Math.max(1, n);
      const cx = (mid: number) => F.l + band * (mid + 0.5);
      const y = (c: number) => F.t + F.plot - ((c - lo) / (hi - lo)) * F.plot;
      const xs = (sp: { a: number; z: number }) => ({ x0: F.l + band * sp.a, x1: F.l + band * (sp.z + 1) });

      const tint = spans.length > 1 ? spans.filter((sp) => sp.index % 2 === 1).map((sp) => rectPath(xs(sp).x0, 4, xs(sp).x1, H - F.b)).join('') : '';
      const edges = spans.filter((sp) => sp.a > 0).map((sp) => `M${f1(xs(sp).x0)} 4V${f1(H - F.b)}`).join('');
      const ticks: number[] = [];
      for (let t = lo; t <= hi + 1e-9; t += step) ticks.push(Math.round(t * 100) / 100);
      const grid = ticks.filter((t) => Math.abs(t) > 1e-9).map((t) => `M${F.l} ${f1(y(t))}H${F.w - F.r}`).join('');

      const planned = spans.filter((sp) => sp.phase.ratePerWeek);
      const planBand = planned
        .map((sp) => rectPath(xs(sp).x0, y((sp.phase.ratePerWeek as number) + PLAN_BAND), xs(sp).x1, y((sp.phase.ratePerWeek as number) - PLAN_BAND)))
        .join('');
      const planLine = planned.map((sp) => `M${f1(xs(sp).x0)} ${f1(y(sp.phase.ratePerWeek as number))}H${f1(xs(sp).x1)}`).join('');

      const nameRow: FitCell[] = spans.map((sp) => {
        const p = sp.phase;
        const nm = p.label.toUpperCase();
        const rate = p.ratePerWeek ? formatDelta(p.ratePerWeek) : null;
        return { key: p.start, ...xs(sp), words: rate ? [`${nm} · plan ${rate} ${weightUnit} a week`, `${nm} · plan ${rate}`, nm] : [nm] };
      });

      // Every bar is labelled when the weeks are wide enough to hold a label; otherwise only the newest, beside it.
      const all = pts.length > 0 && ((pts[0].count * band) / F.w) * RENDER_PX[v] >= LABEL_ALL_PX;
      const bars: Record<Tone, string> = { to: '', away: '', flat: '' };
      const labels: { key: string; left: string; top: string; transform: string; text: string }[] = [];
      const centres: number[] = [];
      pts.forEach((p, k) => {
        const c = p.row.weightChange as number;
        const x = cx(p.mid);
        centres.push(x);
        const bw = Math.min(96 * F.px, p.count * band * 0.62);
        bars[paceTone(c, p.row.phase?.type)] += rectPath(x - bw / 2, y(0), x + bw / 2, y(c), 1.5 * F.px);
        const text = formatDelta(c);
        if (all) {
          labels.push({ key: p.row.weekStart, left: pct(x, F.w), top: pct(y(c), H), transform: c >= 0 ? 'translate(-50%, calc(-100% - 3px))' : 'translate(-50%, 3px)', text });
        } else if (k === pts.length - 1) {
          labels.push({ key: p.row.weekStart, left: `calc(${pct(x + bw / 2, F.w)} + 5px)`, top: pct(y(c), H), transform: 'translateY(-50%)', text });
        }
      });

      return {
        v,
        F,
        H,
        tint,
        edges,
        grid,
        planBand,
        planLine,
        bars,
        labels,
        centres,
        nameRow,
        zero: `M${F.l} ${f1(y(0))}H${F.w - F.r}`,
        ticks: ticks.map((t) => ({ t, top: pct(y(t), H) })),
        sundays: sundayLabels(ds, labelStride(band, F.w, RENDER_PX[v], 50)).map(({ day, i, thin }) => ({
          key: day.date,
          left: pct(F.l + band * (i + 0.5), F.w),
          label: shortDate(day.date),
          thin: v === 'wide' && thin,
        })),
      };
    });
  }, [model, ds, n, weightUnit]);

  const { pts } = model;
  const move = (e: PointerEvent<HTMLDivElement>, c: (typeof charts)[number]) => {
    const r = e.currentTarget.getBoundingClientRect();
    if (r.width === 0 || !c.centres.length) return;
    const u = ((e.clientX - r.left) / r.width) * c.F.w;
    if (!Number.isFinite(u)) return;
    if (u < c.F.l || u > c.F.w - c.F.r) return setHover(null);
    let k = 0;
    c.centres.forEach((x, j) => {
      if (Math.abs(x - u) < Math.abs(c.centres[k] - u)) k = j;
    });
    const x = (c.centres[k] / c.F.w) * r.width;
    const left = x + 12 + TIP_WIDTH > r.width ? Math.max(0, x - 12 - TIP_WIDTH) : x + 12;
    setHover({ k, x, left });
  };
  const leave = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'touch') setHover(null);
  };
  const hp = hover ? pts[hover.k] : null;
  const hPhase = hp?.row.phase ? phases.find((p) => p.start === hp.row.phase?.start) ?? null : null;

  // Four plain facts: last week, this block's average week on week, the plan, and this week against the plan line.
  const facts: { k: string; n: string; l: string }[] = [];
  const lastWeek = weeklyTrend[weeklyTrend.length - 1];
  if (lastWeek && lastWeek.weightChange !== null) {
    facts.push({ k: 'Last week', n: `${formatDelta(lastWeek.weightChange)} ${weightUnit}`, l: `week ending ${shortDate(lastWeek.weekEnd)}` });
  }
  if (lead) {
    const changes = weeklyTrend.filter((w) => w.phase?.start === lead.start && w.weightChange !== null).map((w) => w.weightChange as number);
    if (changes.length) {
      const word = lead.type === 'maintain' ? 'block' : lead.type;
      facts.push({
        k: `This ${word}, week on week`,
        n: `${formatDelta(changes.reduce((s, c) => s + c, 0) / changes.length)} ${weightUnit}`,
        l: `a week on average, over ${changes.length} week${changes.length === 1 ? '' : 's'}`,
      });
    }
    if (lead.ratePerWeek) {
      facts.push({ k: 'The plan', n: `${formatDelta(lead.ratePerWeek)} ${weightUnit}`, l: 'a week' });
      const plan = lastWeek && lastWeek.phase?.start === lead.start && lastWeek.avgWeight !== null ? planAt(lead, addDays(lastWeek.weekStart, 3)) : null;
      if (plan !== null && lastWeek.avgWeight !== null) {
        const ahead = lastWeek.avgWeight - plan;
        facts.push({
          k: 'Against the plan line',
          n: `${formatNumber(Math.abs(ahead), 1)} ${weightUnit}`,
          l: `${ahead >= 0 ? 'above' : 'below'} it this week; the line starts at the block’s first weigh-in`,
        });
      }
    }
  }

  const tones = new Set(pts.map((p) => paceTone(p.row.weightChange as number, p.row.phase?.type)));
  const hasPlan = model.spans.some((sp) => sp.phase.ratePerWeek);

  return (
    <section className="h-card">
      <div className="h-card-h">
        <h2>Pounds per week</h2>
        <div className="h-legend">
          {tones.has('to') && (
            <span>
              <i className="h-sw is-to" />
              Toward the goal
            </span>
          )}
          {tones.has('away') && (
            <span>
              <i className="h-sw is-away" />
              Away from it
            </span>
          )}
          {tones.has('flat') && (
            <span>
              <i className="h-sw is-flat" />
              No change, or no direction
            </span>
          )}
          {hasPlan && (
            <span>
              <i className="h-sw is-pband" />
              Planned pace
            </span>
          )}
        </div>
      </div>
      <p className="h-note">Each bar is one week’s average weight against the week before.</p>
      {charts.map((c) => (
        <div
          key={c.v}
          className={`h-panel h-v is-${c.v} is-hover h-pace`}
          onPointerMove={(e) => move(e, c)}
          onPointerDown={(e) => move(e, c)}
          onPointerLeave={leave}
        >
          <svg viewBox={`0 0 ${c.F.w} ${c.H}`} role="img" aria-label="Change in weekly average weight, week by week, against the planned pace">
            <path className="g-band" d={c.tint} />
            <path className="g-block" d={c.edges} />
            <path className="g-grid" d={c.grid} />
            <path className="g-planband" d={c.planBand} />
            <path className="g-plan" d={c.planLine} />
            {TONES.map((t) => (
              <path key={t} className={`g-${t}`} d={c.bars[t]} />
            ))}
            <path className="g-zero" d={c.zero} />
          </svg>
          <FitRow cells={c.nameRow} w={c.F.w} h={c.H} y={c.F.row} className="is-name" />
          <span className="h-ax is-unit" style={{ left: 0, top: pct(c.F.t - 20 * c.F.px, c.H), width: pct(c.F.l, c.F.w), textAlign: 'right', paddingRight: 6 }}>
            {weightUnit}
          </span>
          {c.ticks.map(({ t, top }) => (
            <span key={t} className="h-ax is-left" style={{ top, width: pct(c.F.l, c.F.w) }}>
              {Math.abs(t) < 1e-9 ? '0' : formatDelta(t, model.step < 1 ? 1 : 0)}
            </span>
          ))}
          {c.labels.map((s) => (
            <span key={s.key} className="h-ax is-sm" style={{ left: s.left, top: s.top, transform: s.transform }}>
              {s.text}
            </span>
          ))}
          {c.sundays.map((s) => (
            <span key={s.key} className={`h-ax is-x${s.thin ? ' is-thin' : ''}`} style={{ left: s.left }}>
              {s.label}
            </span>
          ))}
          {hover && hp && (
            <>
              <span className="h-crosshair" style={{ left: hover.x, top: pct(c.F.t, c.H), bottom: pct(c.F.b, c.H) }} />
              <div className="h-tip" style={{ left: hover.left, width: TIP_WIDTH }}>
                <div className="h-k">Week ending {shortDate(hp.row.weekEnd)}</div>
                <div className="h-row">
                  <span>Phase</span>
                  <b>{hp.row.phase ? hp.row.phase.label : '—'}</b>
                </div>
                <div className="h-row">
                  <span>Average</span>
                  <b>{hp.row.avgWeight !== null ? `${formatNumber(hp.row.avgWeight, 1)} ${weightUnit}` : '—'}</b>
                </div>
                <div className="h-row">
                  <span>On the week before</span>
                  <b>{`${formatDelta(hp.row.weightChange as number)} ${weightUnit}`}</b>
                </div>
                {hPhase?.ratePerWeek ? (
                  <div className="h-row">
                    <span>Planned</span>
                    <b>{`${formatDelta(hPhase.ratePerWeek)} ${weightUnit}`}</b>
                  </div>
                ) : null}
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
