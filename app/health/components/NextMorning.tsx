import { HealthCalorieTarget, HealthDay } from '@/types/health';
import { calorieTargetFor } from '@/lib/calorieTarget';
import { AfterBigDays, BIG_DAY, MeanCount, NextMorningPair, afterBigDays, nextMorningFacts, nextMorningPairs } from '@/lib/healthInsights';
import { downIsGood, formatDelta, formatNumber, shortDate } from './format';
import { Frame, VARIANTS, Variant, dotPath, hline, linePath, pct, ticks, xScale, yScale } from './svg';

interface Props {
  days: HealthDay[];
  calorieTargets: HealthCalorieTarget[];
  weightUnit: string;
}

/** Fewer pairs than this and a scatter and its trend line say nothing. */
const MIN_PAIRS = 7;

const SCATTER: Record<Variant, Frame> = {
  wide: { w: 1000, h: 560, l: 56, r: 24, t: 10, b: 30 },
  compact: { w: 1000, h: 1000, l: 150, r: 30, t: 60, b: 90 },
};
const AFTER: Record<Variant, Frame> = {
  wide: { w: 600, h: 520, l: 48, r: 92, t: 14, b: 34 },
  compact: { w: 600, h: 620, l: 90, r: 130, t: 20, b: 60 },
};

const signedTicks = (v: number, unit: string) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v)} ${unit}`;

/**
 * Each day's calories against the change in weight by the next morning, and beside it the three mornings
 * after each big day. Wes found the first in the mockups ("i love your new what a days calories do the
 * next morning thing"); the second shows the jump after a big day is gone within a few days.
 */
export default function NextMorning({ days, calorieTargets, weightUnit }: Props) {
  const pairs = nextMorningPairs(days, calorieTargets);
  if (pairs.length < MIN_PAIRS) return null;

  const facts = nextMorningFacts(pairs, BIG_DAY);
  const after = afterBigDays(days, BIG_DAY, 3);
  const hasTarget = days.some((d) => calorieTargetFor(d.date, calorieTargets) !== null);
  const target = calorieTargetFor(days[days.length - 1].date, calorieTargets);
  const showAfter = after.traces.length > 0;

  return (
    <section className="h-card">
      <div className="h-card-h">
        <h2>What a day&rsquo;s calories do to the next morning</h2>
        <div className="h-legend">
          <span>
            <i className="h-sw is-dot is-accent" />A day
          </span>
          <span>
            <i className="h-sw is-dot is-big" />
            Over {formatNumber(BIG_DAY)} kcal
          </span>
          {facts.fit && (
            <span>
              <i className="h-sw is-line is-ink" />
              Trend
            </span>
          )}
          {target !== null && (
            <span>
              <i className="h-sw is-dashed" />
              Target {formatNumber(target)}
            </span>
          )}
        </div>
      </div>
      <p className="h-note">
        Each dot is a day: across, what you ate; up or down, how the scale moved by the next morning. Day to day that
        is mostly water and food weight.
      </p>

      <div className={showAfter ? 'h-two' : undefined}>
        <div>{VARIANTS.map((v) => <Scatter key={v} v={v} pairs={pairs} fit={facts.fit} target={target} weightUnit={weightUnit} />)}</div>
        {showAfter && (
          <div>
            <div className="h-sub">The mornings after a {formatNumber(BIG_DAY)}+ day</div>
            <p className="h-note is-sm">
              Each orange line is one big day, measured from that morning&rsquo;s weigh-in. Dashed: every day
              averaged, for comparison.
            </p>
            {VARIANTS.map((v) => (
              <AfterBigDay key={v} v={v} after={after} weightUnit={weightUnit} />
            ))}
          </div>
        )}
      </div>

      <div className="h-facts">
        {hasTarget && <Fact label="After a day over target" value={facts.over} weightUnit={weightUnit} />}
        {hasTarget && <Fact label="After a day at or under" value={facts.atOrUnder} weightUnit={weightUnit} />}
        {facts.big.n > 0 && <Fact label={`After a day over ${formatNumber(BIG_DAY)}`} value={facts.big} weightUnit={weightUnit} />}
        {after.atHorizon.n > 0 && (
          <div>
            <div className="h-k">Three days after one</div>
            <div className={`h-n ${downIsGood(after.atHorizon.avg)}`}>
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
      <div className={`h-n ${downIsGood(value.avg)}`}>{value.avg === null ? '—' : `${formatDelta(value.avg)} ${weightUnit}`}</div>
      <div className="h-l">
        next morning, average of {value.n} {value.n === 1 ? 'day' : 'days'}
      </div>
    </div>
  );
}

interface ScatterProps {
  v: Variant;
  pairs: NextMorningPair[];
  fit: { slope: number; intercept: number } | null;
  target: number | null;
  weightUnit: string;
}

/** Calories across, the next morning's change up; the change scale is symmetric so up and down read alike. */
function Scatter({ v, pairs, fit, target, weightUnit }: ScatterProps) {
  const S = SCATTER[v];
  const cals = pairs.map((p) => p.cals);
  const x0 = Math.floor((Math.min(...cals) - 100) / 100) * 100;
  const x1 = Math.ceil((Math.max(...cals) + 60) / 100) * 100;
  const yr = Math.max(1, Math.ceil(Math.max(...pairs.map((p) => Math.abs(p.change))) * 2) / 2);
  const sx = xScale(S, x0, x1);
  const sy = yScale(S, -yr, yr);
  const fitAt = (c: number) => (fit ? fit.slope * c + fit.intercept : 0);
  const yTicks = ticks(-Math.floor(yr), Math.floor(yr), 1);
  const xTicks = ticks(x0 + 50, x1 - 50, 400);
  const r = v === 'wide' ? 6 : 13;
  const pts = pairs.filter((p) => p.cals < BIG_DAY).map((p) => dotPath(sx(p.cals), sy(p.change), r)).join('');
  const big = pairs.filter((p) => p.cals >= BIG_DAY).map((p) => dotPath(sx(p.cals), sy(p.change), r)).join('');
  const showTarget = target !== null && target > x0 && target < x1;

  return (
    <div className={`h-panel h-v is-${v}`}>
      <svg viewBox={`0 0 ${S.w} ${S.h}`} role="img" aria-label="Scatter of each day's calories against the change in weight by the next morning">
        <path className="g-grid" d={yTicks.map((t) => hline(S, sy(t))).join('')} />
        <path className="g-zero" d={hline(S, sy(0))} />
        {showTarget && <path className="g-target" d={`M${sx(target).toFixed(1)} ${S.t}V${S.h - S.b}`} />}
        {fit && (
          <path
            className="g-fit"
            d={linePath([
              { x: sx(x0 + 50), y: sy(fitAt(x0 + 50)) },
              { x: sx(x1 - 50), y: sy(fitAt(x1 - 50)) },
            ])}
          />
        )}
        <path className="g-pts" d={pts} />
        <path className="g-big" d={big} />
      </svg>
      {yTicks.map((t) => (
        <span key={t} className="h-ax is-left" style={{ top: pct(sy(t), S.h), width: pct(S.l, S.w) }}>
          {signedTicks(t, weightUnit)}
        </span>
      ))}
      {xTicks.map((t) => (
        <span key={t} className="h-ax is-x" style={{ left: pct(sx(t), S.w) }}>
          {v === 'wide' ? `${formatNumber(t)} kcal` : formatNumber(t)}
        </span>
      ))}
      {showTarget && (
        <span className="h-ax is-note" style={{ left: pct(sx(target), S.w), top: 0, transform: 'translateX(6px)' }}>
          target {formatNumber(target)}
        </span>
      )}
      <span className="h-ax is-note" style={{ left: pct(S.l + 16, S.w), top: pct(sy(yr) + 4, S.h) }}>
        {v === 'wide' ? 'heavier next morning ↑' : 'heavier ↑'}
      </span>
      <span className="h-ax is-note" style={{ left: pct(S.l + 16, S.w), top: pct(sy(-yr) - (v === 'wide' ? 22 : 44), S.h) }}>
        {v === 'wide' ? 'lighter next morning ↓' : 'lighter ↓'}
      </span>
    </div>
  );
}

/** One line per big day, from that morning's weigh-in, with every day averaged as a dashed comparison. */
function AfterBigDay({ v, after, weightUnit }: { v: Variant; after: AfterBigDays; weightUnit: string }) {
  const A = AFTER[v];
  const K = after.horizon;
  const x = (k: number) => A.l + 14 + (k / K) * (A.w - A.l - A.r - 28);
  const values = [...after.traces.flatMap((t) => t.changes), ...after.typical.filter((c): c is number => c !== null)];
  const lo = Math.min(-1, Math.floor(Math.min(...values) - 0.3));
  const hi = Math.max(1, Math.ceil((Math.max(...values) + 0.3) * 2) / 2);
  const y = yScale(A, lo, hi);
  const r = v === 'wide' ? 4 : 7;

  const traces = after.traces.map((t) => linePath(t.changes.map((c, k) => ({ x: x(k), y: y(c) })))).join('');
  const dots = after.traces.flatMap((t) => t.changes.map((c, k) => dotPath(x(k), y(c), r))).join('');
  const typical = linePath(after.typical.map((c, k) => (c === null ? null : { x: x(k), y: y(c) })));

  // End labels: one per trace, plus the comparison; those sharing an x are kept apart, top to bottom.
  const minGap = v === 'wide' ? 18 : 26;
  const ends = after.traces.map((t) => {
    const last = t.changes.length - 1;
    const sofar = last < K ? ` · ${last === 0 ? 'no mornings' : last === 1 ? 'one morning' : `${last} mornings`} so far` : '';
    return { x: x(last), y: y(t.changes[last]), label: `${shortDate(t.date)}${sofar}` };
  });
  const lastTypical = after.typical[K];
  if (lastTypical !== null) ends.push({ x: x(K), y: y(lastTypical), label: 'every day' });
  const byX = new Map<number, typeof ends>();
  for (const e of ends) byX.set(Math.round(e.x), [...(byX.get(Math.round(e.x)) ?? []), e]);
  for (const group of byX.values()) {
    group.sort((a, b) => a.y - b.y);
    for (let j = 1; j < group.length; j++) if (group[j].y - group[j - 1].y < minGap) group[j].y = group[j - 1].y + minGap;
  }
  const yTicks = ticks(Math.ceil(lo), Math.floor(hi), 1);
  const xLabels = v === 'wide' ? ['that morning', '1 day on', '2 days on', '3 days on'] : ['that morning', '+1 day', '+2', '+3'];

  return (
    <div className={`h-panel h-v is-${v}`}>
      <svg viewBox={`0 0 ${A.w} ${A.h}`} role="img" aria-label={`Weight for the ${K} mornings after each day over ${formatNumber(BIG_DAY)} kcal`}>
        <path className="g-grid" d={yTicks.map((t) => hline(A, y(t))).join('')} />
        <path className="g-zero" d={hline(A, y(0))} />
        <path className="g-typ" d={typical} />
        <path className="g-trace" d={traces} />
        <path className="g-big" d={dots} />
      </svg>
      {yTicks.map((t) => (
        <span key={t} className="h-ax is-left" style={{ top: pct(y(t), A.h), width: pct(A.l, A.w) }}>
          {signedTicks(t, weightUnit)}
        </span>
      ))}
      {xLabels.slice(0, K + 1).map((t, k) => (
        <span key={t} className="h-ax is-x" style={{ left: pct(x(k), A.w) }}>
          {t}
        </span>
      ))}
      {ends.map((e) => (
        <span key={e.label} className="h-ax is-end" style={{ left: pct(e.x + 10, A.w), top: pct(e.y, A.h) }}>
          {e.label}
        </span>
      ))}
    </div>
  );
}
