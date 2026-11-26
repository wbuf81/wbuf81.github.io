import type { HealthCalorieTarget, PhaseSummary, WeeklyTrendRow } from '@/types/health';
import { type CaloriesAndScale, caloriesAndScale } from '@/lib/healthPatterns';
import { formatDelta, formatNumber, shortDate } from './format';
import { VARIANTS, type Variant, dotPath, linePath, pct } from './svg';

interface Props {
  weeklyTrend: WeeklyTrendRow[];
  /** The block the newest data falls in: its weeks are drawn filled, and its planned pace marked on the line. */
  lead: PhaseSummary | null;
  calorieTargets: HealthCalorieTarget[];
  /** The newest recorded day: the calorie target in force on it is the dotted rule. */
  newestDate: string | null;
  weightUnit: string;
}

/** The frames, in viewBox units (the mockup's idea 2): a unit is roughly a pixel where each is drawn. */
interface CFrame {
  w: number;
  l: number;
  r: number;
  t: number;
  plot: number;
  b: number;
  dot: number;
}
const FRAMES: Record<Variant, CFrame> = {
  wide: { w: 760, l: 48, r: 20, t: 26, plot: 260, b: 40, dot: 5.5 },
  compact: { w: 360, l: 40, r: 12, t: 26, plot: 300, b: 40, dot: 4.5 },
};
const height = (F: CFrame) => F.t + F.plot + F.b;
const f1 = (n: number) => n.toFixed(1);
const r10 = (v: number) => Math.round(v / 10) * 10;
/** A marker on the line is drawn when it lies this close to the weeks drawn, in kcal a day; further out it is only a fact. */
const MARK_REACH = 400;

/** A diamond of half-width `r` around a point, for the markers on the line. */
const diamond = (x: number, y: number, r: number) => `M${f1(x)} ${f1(y - r)}l${r} ${r}l${-r} ${r}l${-r} ${-r}Z`;

/**
 * One dot per complete week from the second on: across, its average calories a day; up or down, its average weight
 * against the week before. A dashed least-squares line runs through them all, marked where it crosses zero and where
 * it reaches the newest block's planned pace. Ported from the mockup's idea 2. The figures are patterns, plain ink.
 */
export default function CaloriesScale({ weeklyTrend, lead, calorieTargets, newestDate, weightUnit }: Props) {
  const m = caloriesAndScale(weeklyTrend, lead, calorieTargets, newestDate);
  if (!m) return null;
  const earlier = [...new Set(m.weeks.filter((w) => !w.inLead).map((w) => w.row.phase?.label ?? null))];
  const ringName = earlier.length === 1 && earlier[0] ? `${earlier[0]} week` : lead ? 'An earlier block’s week' : 'A week';
  const hasLead = m.weeks.some((w) => w.inLead);
  const hasRing = m.weeks.some((w) => !w.inLead);

  return (
    <section className="h-card">
      <div className="h-card-h">
        <h2>A week&rsquo;s calories and what the scale did</h2>
        <div className="h-legend">
          {hasRing && (
            <span>
              <i className="h-sw is-ring" />
              {ringName}
            </span>
          )}
          {hasLead && lead && (
            <span>
              <i className="h-sw is-dot is-accent" />
              {lead.label} week
            </span>
          )}
          <span>
            <i className="h-sw is-plan" />
            Trend
          </span>
          {m.target !== null && (
            <span>
              <i className="h-sw is-target" />
              Target now
            </span>
          )}
        </div>
      </div>
      <p className="h-note">
        Each dot is a week: across, what you ate a day on average; up or down, how the week&rsquo;s average weight
        moved. The first weeks of a block also move on water, which steepens the line.
      </p>
      {VARIANTS.map((v) => (
        <Chart key={v} v={v} m={m} weightUnit={weightUnit} />
      ))}
      <div className="h-facts">
        {m.holdsAt !== null && (
          <div>
            <div className="h-k">The scale holds at about</div>
            <div className="h-n">{formatNumber(r10(m.holdsAt))}</div>
            <div className="h-l">kcal a day, where the line crosses zero</div>
          </div>
        )}
        {m.planAt !== null && m.plan !== null && (
          <div>
            <div className="h-k">
              The plan, {formatDelta(m.plan)} {weightUnit} a week
            </div>
            <div className="h-n">{formatNumber(r10(m.planAt))}</div>
            <div className="h-l">kcal a day, by the same line</div>
          </div>
        )}
        <div>
          <div className="h-k">Last week</div>
          <div className="h-n">
            {formatNumber(m.last.cals)} kcal, {formatDelta(m.last.change)} {weightUnit}
          </div>
          <div className="h-l">
            week ending {shortDate(m.last.row.weekEnd)}; the line would say about {formatDelta(m.lastPredicted)}
          </div>
        </div>
        <div>
          <div className="h-k">For every 100 kcal more a day</div>
          <div className="h-n">
            about {formatDelta(m.per100)} {weightUnit} a week
          </div>
          <div className="h-l">across the {m.weeks.length} weeks shown</div>
        </div>
      </div>
    </section>
  );
}

interface Label {
  key: string;
  cls: string;
  left: string;
  top: string;
  transform?: string;
  text: string;
}

function Chart({ v, m, weightUnit }: { v: Variant; m: CaloriesAndScale; weightUnit: string }) {
  const F = FRAMES[v];
  const H = height(F);
  const PW = F.w - F.l - F.r;
  const xs = m.weeks.map((w) => w.cals);
  const ys = m.weeks.map((w) => w.change);
  const dMin = Math.min(...xs);
  const dMax = Math.max(...xs);
  const near = (c: number | null): c is number => c !== null && c >= dMin - MARK_REACH && c <= dMax + MARK_REACH;
  const extra = [m.target, m.holdsAt, m.planAt].filter(near);
  const x0 = Math.floor((Math.min(dMin, ...extra) - 60) / 100) * 100;
  const x1 = Math.ceil((Math.max(dMax, ...extra) + 60) / 100) * 100;
  const yv = [...ys, 0, ...(m.plan !== null && near(m.planAt) ? [m.plan] : [])];
  const y0 = Math.floor((Math.min(...yv) - 0.2) * 2) / 2;
  const y1 = Math.ceil((Math.max(...yv) + 0.2) * 2) / 2;
  const x = (c: number) => F.l + ((c - x0) / (x1 - x0)) * PW;
  const y = (c: number) => F.t + ((y1 - c) / (y1 - y0)) * F.plot;
  const foot = F.t + F.plot;

  const labels: Label[] = [];
  let grid = '';
  for (let t = y0; t <= y1 + 1e-9; t += 0.5) {
    if (Math.abs(t) > 1e-9) grid += `M${F.l} ${f1(y(t))}H${F.w - F.r}`;
    // On a phone the lowest figure would sit on the first calorie figure under it, so the foot goes unlabelled there.
    if (Number.isInteger(t) && !(v === 'compact' && t === y0 && Math.ceil(x0 / 200) * 200 - x0 < 60)) {
      labels.push({ key: `y${t}`, cls: '', left: `calc(${pct(F.l, F.w)} - 7px)`, top: pct(y(t), H), transform: 'translate(-100%, -50%)', text: t ? `${formatDelta(t, 0)}${v === 'wide' ? ` ${weightUnit}` : ''}` : '0' });
    }
  }
  const xstep = (x1 - x0) / 200 > (v === 'wide' ? 9 : 5) ? 400 : 200;
  for (let c = Math.ceil(x0 / xstep) * xstep; c <= x1; c += xstep) {
    grid += `M${f1(x(c))} ${F.t}V${foot}`;
    labels.push({ key: `x${c}`, cls: '', left: pct(x(c), F.w), top: pct(foot + 13, H), transform: 'translate(-50%, -50%)', text: formatNumber(c) });
  }
  labels.push({ key: 'cap', cls: 'is-cap', left: pct(F.l + PW / 2, F.w), top: pct(foot + 31, H), transform: 'translate(-50%, -50%)', text: 'kcal a day, week average' });

  let target = '';
  if (m.target !== null && m.target >= x0 && m.target <= x1) {
    target = `M${f1(x(m.target))} ${F.t}V${foot}`;
    labels.push({ key: 'target', cls: 'is-note', left: `calc(${pct(x(m.target), F.w)} + 5px)`, top: pct(F.t - 10, H), transform: 'translateY(-50%)', text: `target ${formatNumber(m.target)}` });
  }

  // The line across the plot, cut where it would leave the scale.
  const fy = (c: number) => m.fit.intercept + m.fit.slope * c;
  let a = x0;
  let b = x1;
  if (m.fit.slope !== 0) {
    const fx = (c: number) => (c - m.fit.intercept) / m.fit.slope;
    const [u, w] = [fx(y0), fx(y1)].sort((p, q) => p - q);
    a = Math.max(a, u);
    b = Math.min(b, w);
  }
  const trend = b > a ? `M${f1(x(a))} ${f1(y(fy(a)))}L${f1(x(b))} ${f1(y(fy(b)))}` : '';

  const path = linePath(m.weeks.map((w) => ({ x: x(w.cals), y: y(w.change) })));
  const rings = m.weeks.filter((w) => !w.inLead).map((w) => dotPath(x(w.cals), y(w.change), F.dot)).join('');
  const filled = m.weeks.filter((w) => w.inLead).map((w) => dotPath(x(w.cals), y(w.change), F.dot)).join('');

  let marks = '';
  if (near(m.holdsAt) && m.holdsAt >= x0 && m.holdsAt <= x1) {
    marks += diamond(x(m.holdsAt), y(0), 5.5);
    labels.push({ key: 'zero', cls: 'is-chip', left: pct(x(m.holdsAt) - (v === 'wide' ? 44 : 34), F.w), top: pct(y(0), H), transform: 'translate(-100%, -50%)', text: v === 'wide' ? `holds at ${formatNumber(r10(m.holdsAt))}` : `0 at ${formatNumber(r10(m.holdsAt))}` });
  }
  if (m.plan !== null && near(m.planAt) && m.planAt >= x0 && m.planAt <= x1) {
    marks += diamond(x(m.planAt), y(m.plan), 5.5);
    labels.push({ key: 'plan', cls: 'is-note', left: `calc(${pct(x(m.planAt), F.w)} + 9px)`, top: pct(y(m.plan), H), transform: 'translateY(6px)', text: `${formatDelta(m.plan)} at ${formatNumber(r10(m.planAt))}` });
  }
  labels.push({ key: 'last', cls: 'is-note', left: `calc(${pct(x(m.last.cals), F.w)} - 10px)`, top: pct(y(m.last.change), H), transform: 'translate(-100%, -50%)', text: shortDate(m.last.row.weekEnd) });

  return (
    <div className={`h-panel h-v is-${v} h-cscale`}>
      <svg viewBox={`0 0 ${F.w} ${H}`} role="img" aria-label="Each week’s average calories a day against the change in its average weight from the week before, with a fitted line">
        <path className="g-grid" d={grid} />
        <path className="g-zero" d={`M${F.l} ${f1(y(0))}H${F.w - F.r}`} />
        <path className="g-target" d={target} />
        <path className="g-trend" d={trend} />
        <path className="g-path" d={path} />
        <path className="g-ring" d={rings} />
        <path className="g-pts" d={filled} />
        <path className="g-mk" d={marks} />
      </svg>
      {v === 'compact' && (
        <span className="h-ax is-unit" style={{ left: 0, top: pct(F.t - 14, H), width: pct(F.l, F.w), textAlign: 'right', paddingRight: 6, transform: 'translateY(-50%)' }}>
          {weightUnit}
        </span>
      )}
      {labels.map((l) => (
        <span key={l.key} className={`h-ax ${l.cls}`} style={{ left: l.left, top: l.top, transform: l.transform }}>
          {l.text}
        </span>
      ))}
    </div>
  );
}
