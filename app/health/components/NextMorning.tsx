import { HealthCalorieTarget, HealthDay } from '@/types/health';
import { AfterBigDays, BIG_DAY_RATIO, MeanCount, NextMorningPair, afterBigDays, nextMorningFacts, nextMorningPairs } from '@/lib/healthInsights';
import { formatDelta, shortDate } from './format';
import { VARIANTS, Variant, dotPath, linePath, pct } from './svg';

interface Props {
  days: HealthDay[];
  calorieTargets: HealthCalorieTarget[];
  weightUnit: string;
}

/** Fewer pairs than this and a scatter and its trend line say nothing. */
const MIN_PAIRS = 7;

/**
 * The frames, in viewBox units. `px` is roughly how many units make a CSS pixel where the frame is drawn, so marks and
 * offsets read the same size in both: the scatter is about 460 to 600px wide beside the other chart (520 to 880px
 * stacked), the mornings-after chart about 370 to 480px (capped at 560px stacked); compact, both about 300 to 340px.
 */
interface NFrame {
  w: number;
  l: number;
  r: number;
  t: number;
  plot: number;
  b: number;
  px: number;
  dot: number;
}
const SCATTER: Record<Variant, NFrame> = {
  wide: { w: 1000, l: 80, r: 20, t: 20, plot: 520, b: 80, px: 1.9, dot: 6 },
  compact: { w: 1000, l: 130, r: 30, t: 40, plot: 790, b: 140, px: 3.1, dot: 10 },
};
const AFTER: Record<Variant, NFrame> = {
  wide: { w: 600, l: 56, r: 100, t: 20, plot: 340, b: 40, px: 1.4, dot: 5.6 },
  compact: { w: 600, l: 80, r: 150, t: 30, plot: 420, b: 56, px: 2, dot: 8 },
};
const height = (F: NFrame) => F.t + F.plot + F.b;
const f1 = (n: number) => n.toFixed(1);

const lb = (v: number, unit: string) => `${v ? formatDelta(v, 0) : '0'} ${unit}`;

/** What a big day is, in words: "20% or more over target". */
const BIG_WORDS = `${Math.round((BIG_DAY_RATIO - 1) * 100)}% or more over target`;

/** A pair scored against a target: the scatter's x is calories against that day's target. */
type ScoredPair = NextMorningPair & { vsTarget: number };

/**
 * Each day's calories against its target and the change on the scale by the next morning, and beside it the three
 * mornings after a big day: the average and the middle half of big days against every day's average, with only the
 * newest big day named. Ported from the mockup's drawScatter and drawAfter (docs/design/health-trends-2026-11-16).
 * The figures are patterns, not results, so they are plain ink.
 */
export default function NextMorning({ days, calorieTargets, weightUnit }: Props) {
  const pairs = nextMorningPairs(days, calorieTargets);
  // Each day is placed against its own target, so a day with none has nowhere to go.
  const scored = pairs.filter((p): p is ScoredPair => p.vsTarget !== null);
  if (scored.length < MIN_PAIRS) return null;

  const facts = nextMorningFacts(pairs);
  const after = afterBigDays(days, calorieTargets, 3);
  // A big day with no weighed next morning has nothing to draw yet.
  const showAfter = after.traces.some((t) => t.changes.length > 1);

  return (
    <section className="h-card">
      <div className="h-card-h">
        <h2>What a day&rsquo;s calories do to the next morning</h2>
        <div className="h-legend">
          <span>
            <i className="h-sw is-dot is-accent" />A day
          </span>
          <span>
            <i className="h-sw is-dot is-big" />A big day, {BIG_WORDS}
          </span>
          {facts.fit && (
            <span>
              <i className="h-sw is-line is-ink" />
              Trend
            </span>
          )}
        </div>
      </div>
      <p className="h-note">
        Each dot is a day: across, what you ate against that day&rsquo;s target; up or down, how the scale moved by
        the next morning. Day to day that is mostly water and food weight.
      </p>

      <div className={showAfter ? 'h-two' : undefined}>
        <div>
          {VARIANTS.map((v) => (
            <Scatter key={v} v={v} pairs={scored} fit={facts.fit} weightUnit={weightUnit} />
          ))}
        </div>
        {showAfter && (
          <div className="h-after">
            <div className="h-sub">The mornings after a big day</div>
            <div className="h-legend is-sub">
              <span>
                <i className="h-sw is-line is-big" />
                Average
              </span>
              <span>
                <i className="h-sw is-aband" />
                Middle half of big days
              </span>
              <span>
                <i className="h-sw is-plan" />
                Every day
              </span>
            </div>
            {VARIANTS.map((v) => (
              <AfterBigDay key={v} v={v} after={after} weightUnit={weightUnit} />
            ))}
          </div>
        )}
      </div>

      <div className="h-facts">
        <Fact label="After a day over target" value={facts.over} weightUnit={weightUnit} />
        <Fact label="After a day at or under" value={facts.atOrUnder} weightUnit={weightUnit} />
        {facts.big.n > 0 && <Fact label="After a big day" value={facts.big} weightUnit={weightUnit} />}
        {after.atHorizon.n > 0 && (
          <div>
            <div className="h-k">Three days after one</div>
            <div className="h-n">
              {formatDelta(after.atHorizon.avg as number)} {weightUnit}
            </div>
            <div className="h-l">
              against that morning; below it on {after.atHorizon.below} of {after.atHorizon.n}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function Fact({ label, value, weightUnit }: { label: string; value: MeanCount; weightUnit: string }) {
  return (
    <div>
      <div className="h-k">{label}</div>
      <div className="h-n">{value.avg === null ? '—' : `${formatDelta(value.avg)} ${weightUnit}`}</div>
      <div className="h-l">
        next morning, average of {value.n} {value.n === 1 ? 'day' : 'days'}
      </div>
    </div>
  );
}

interface ScatterProps {
  v: Variant;
  pairs: ScoredPair[];
  /** change = slope × vsTarget + intercept (lib/healthInsights › nextMorningFacts). */
  fit: { slope: number; intercept: number } | null;
  weightUnit: string;
}

/**
 * Calories against that day's target across (a dotted rule at "target"), the next morning's change up, on a scale
 * symmetric about no change so up and down read alike. Big days in orange, the fitted trend line over them.
 */
function Scatter({ v, pairs, fit, weightUnit }: ScatterProps) {
  const F = SCATTER[v];
  const H = height(F);
  const xs = pairs.map((p) => p.vsTarget);
  const xlo = Math.floor(Math.min(0, ...xs) / 200) * 200;
  const xhi = Math.max(Math.ceil(Math.max(0, ...xs) / 200) * 200, xlo + 200);
  const ym = Math.max(1, Math.ceil(Math.max(...pairs.map((p) => Math.abs(p.change)))));
  const x = (c: number) => F.l + ((c - xlo) / (xhi - xlo)) * (F.w - F.l - F.r);
  const y = (c: number) => F.t + F.plot / 2 - (c / ym) * (F.plot / 2);
  const hl = (yy: number) => `M${F.l} ${f1(yy)}H${F.w - F.r}`;

  const yTicks: number[] = [];
  for (let t = -ym; t <= ym; t++) yTicks.push(t);
  const xstep = (xhi - xlo) / 400 > (v === 'wide' ? 7 : 4) ? 800 : 400;
  const xTicks: number[] = [];
  for (let t = Math.ceil(xlo / xstep) * xstep; t <= xhi; t += xstep) xTicks.push(t);

  // The trend line across the plot, cut where it would leave the scale.
  let fitD = '';
  if (fit) {
    let a = xlo;
    let b = xhi;
    if (fit.slope !== 0) {
      const at = (c: number) => (c - fit.intercept) / fit.slope;
      const [u, w] = [at(-ym), at(ym)].sort((p, q) => p - q);
      a = Math.max(a, u);
      b = Math.min(b, w);
    }
    if (b > a) fitD = linePath([{ x: x(a), y: y(fit.slope * a + fit.intercept) }, { x: x(b), y: y(fit.slope * b + fit.intercept) }]);
  }
  const day = pairs.filter((p) => !p.big).map((p) => dotPath(x(p.vsTarget), y(p.change), F.dot)).join('');
  const big = pairs.filter((p) => p.big).map((p) => dotPath(x(p.vsTarget), y(p.change), F.dot)).join('');
  const tickTop = pct(F.t + F.plot + 16 * F.px, H);

  return (
    <div className={`h-panel h-v is-${v}`}>
      <svg viewBox={`0 0 ${F.w} ${H}`} role="img" aria-label="Each day’s calories against its target, and the change on the scale by the next morning">
        <path className="g-grid" d={yTicks.filter((t) => t !== 0).map((t) => hl(y(t))).join('')} />
        <path className="g-zero" d={hl(y(0))} />
        <path className="g-target" d={`M${f1(x(0))} ${F.t}V${F.t + F.plot}`} />
        <path className="g-fit" d={fitD} />
        <path className="g-pts" d={day} />
        <path className="g-big" d={big} />
      </svg>
      {yTicks.map((t) => (
        <span key={t} className="h-ax is-left" style={{ top: pct(y(t), H), width: pct(F.l, F.w) }}>
          {lb(t, weightUnit)}
        </span>
      ))}
      {xTicks.map((t) => (
        <span key={t} className="h-ax is-x" style={{ left: pct(x(t), F.w), top: tickTop, bottom: 'auto', transform: 'translate(-50%, -50%)' }}>
          {t === 0 ? 'target' : formatDelta(t, 0)}
        </span>
      ))}
      <span className="h-ax is-x" style={{ left: 'auto', right: pct(F.r, F.w), transform: 'none' }}>
        {v === 'wide' ? 'kcal over or under that day’s target' : 'kcal against target'}
      </span>
      <span className="h-ax is-note" style={{ left: `calc(${pct(F.l, F.w)} + 6px)`, top: pct(F.t, H) }}>
        heavier next morning ↑
      </span>
      <span className="h-ax is-note" style={{ left: `calc(${pct(F.l, F.w)} + 6px)`, top: pct(F.t + F.plot, H), transform: 'translateY(-100%)' }}>
        lighter next morning ↓
      </span>
    </div>
  );
}

/**
 * The three mornings after a big day, each measured from that morning: a faint line per big day, the middle half of
 * them as a band, their average as the heavy line, and every day's average dashed for comparison. Only the newest big
 * day is named: "Nov 14 · so far" while its mornings are still coming in.
 */
function AfterBigDay({ v, after, weightUnit }: { v: Variant; after: AfterBigDays; weightUnit: string }) {
  const F = AFTER[v];
  const H = height(F);
  const K = after.horizon;
  const traces = after.traces.filter((t) => t.changes.length > 1);
  const ks = after.offsets.map((s, k) => (s ? k : -1)).filter((k) => k >= 0);
  const every = after.everyDay;

  const vals = [...traces.flatMap((t) => t.changes), ...every.filter((s) => s !== null).map((s) => (s as { mean: number }).mean)];
  const lo = Math.floor(Math.min(0, ...vals));
  const hi = Math.max(Math.ceil(Math.max(0, ...vals)), lo + 1);
  const x = (k: number) => F.l + (k * (F.w - F.l - F.r)) / K;
  const y = (c: number) => F.t + F.plot - ((c - lo) / (hi - lo)) * F.plot;
  const line = (cs: (number | null)[]) => linePath(cs.map((c, k) => (c === null ? null : { x: x(k), y: y(c) })));
  const hl = (yy: number) => `M${F.l} ${f1(yy)}H${F.w - F.r}`;

  const yTicks: number[] = [];
  for (let t = lo; t <= hi; t++) yTicks.push(t);
  const stat = (k: number) => after.offsets[k] as { mean: number; q1: number; q3: number };
  const band = ks.length
    ? ks.map((k, j) => `${j ? 'L' : 'M'}${f1(x(k))} ${f1(y(stat(k).q3))}`).join('') +
      [...ks].reverse().map((k) => `L${f1(x(k))} ${f1(y(stat(k).q1))}`).join('') +
      'Z'
    : '';
  const mean = linePath(ks.map((k) => ({ x: x(k), y: y(stat(k).mean) })));
  const pts = ks.map((k) => dotPath(x(k), y(stat(k).mean), F.dot)).join('');

  // End labels: the big days' average where it ends, and every day's at three days on, kept 26px apart.
  const endK = ks[ks.length - 1];
  const everyEnd = every[K];
  let yb = endK === undefined ? null : y(stat(endK).mean);
  let ye = everyEnd ? y(everyEnd.mean) : null;
  const gap = 26 * F.px;
  if (yb !== null && ye !== null && endK === K && Math.abs(yb - ye) < gap) {
    const mid = (yb + ye) / 2;
    [yb, ye] = yb < ye ? [mid - gap / 2, mid + gap / 2] : [mid + gap / 2, mid - gap / 2];
  }

  // Only the newest big day is named.
  const latest = traces[traces.length - 1];
  let named: { left: string; top: string; transform: string; text: string } | null = null;
  if (latest) {
    const e = latest.changes.length - 1;
    if (latest.open) {
      named = { left: `calc(${pct(x(e), F.w)} + 8px)`, top: pct(y(latest.changes[e]), H), transform: 'translateY(-50%)', text: `${shortDate(latest.date)} · so far` };
    } else {
      const above = after.offsets[1] ? latest.changes[1] > stat(1).mean : true;
      named = {
        left: `calc(${pct(x(1), F.w)} + 6px)`,
        top: pct(y(latest.changes[1]), H),
        transform: above ? 'translateY(calc(-100% - 6px))' : 'translateY(6px)',
        text: `${shortDate(latest.date)}, the newest`,
      };
    }
  }
  // Short on purpose: "that morning" starts at the plot's left edge, and "1 day on" beside it ran into it.
  const xLabels = v === 'wide' ? ['that morning', '+1', '+2', '+3 days'] : ['day 0', '+1', '+2', '+3 days'];

  return (
    <div className={`h-panel h-v is-${v}`}>
      <svg viewBox={`0 0 ${F.w} ${H}`} role="img" aria-label={`How the scale moves over the ${K} mornings after a big day, ${BIG_WORDS}`}>
        <path className="g-grid" d={yTicks.filter((t) => t !== 0).map((t) => hl(y(t))).join('')} />
        <path className="g-zero" d={hl(y(0))} />
        <path className="g-one" d={traces.map((t) => line(t.changes)).join('')} />
        <path className="g-aband" d={band} />
        <path className="g-every" d={line(every.map((s) => (s ? s.mean : null)))} />
        <path className="g-amean" d={mean} />
        <path className="g-apts" d={pts} />
        {latest && <path className="g-last" d={line(latest.changes)} />}
        {latest && <path className="g-lastpts" d={latest.changes.map((c, k) => dotPath(x(k), y(c), F.dot * 0.75)).join('')} />}
      </svg>
      {yTicks.map((t) => (
        <span key={t} className="h-ax is-left" style={{ top: pct(y(t), H), width: pct(F.l, F.w) }}>
          {lb(t, weightUnit)}
        </span>
      ))}
      {xLabels.slice(0, K + 1).map((t, k) => (
        <span key={t} className="h-ax is-x" style={{ left: pct(x(k), F.w), transform: k ? 'translateX(-50%)' : 'none' }}>
          {t}
        </span>
      ))}
      {yb !== null && endK !== undefined && (
        <span className="h-ax is-val is-stack" style={{ left: `calc(${pct(x(endK), F.w)} + 9px)`, top: pct(yb, H) }}>
          {formatDelta(stat(endK).mean)} {weightUnit}
          <small>big days</small>
        </span>
      )}
      {ye !== null && (
        <span className="h-ax is-note" style={{ left: `calc(${pct(x(K), F.w)} + 9px)`, top: pct(ye, H), transform: 'translateY(-50%)' }}>
          every day
        </span>
      )}
      {named && (
        <span className="h-ax is-note is-named" style={{ left: named.left, top: named.top, transform: named.transform }}>
          {named.text}
        </span>
      )}
    </div>
  );
}
