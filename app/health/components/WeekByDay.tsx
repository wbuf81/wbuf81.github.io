'use client';

import { useMemo, useState } from 'react';
import type { PointerEvent } from 'react';
import { HealthCalorieTarget, HealthDatedTargets, HealthDay } from '@/types/health';
import { targetsFor } from '@/lib/targets';
import { WeekdayProfile, WeekdayRow, weekdayProfile } from '@/lib/healthInsights';
import { formatDelta, formatNumber } from './format';
import { VARIANTS, Variant, barScale, pct, rectPath } from './svg';

interface Props {
  days: HealthDay[];
  calorieTargets: HealthCalorieTarget[];
  /** Dated standing goals; the protein goal is read from the revision in force each day. */
  targets: HealthDatedTargets[];
  weightUnit: string;
}

const NAMES = { Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday', Sun: 'Sunday' };

/**
 * The frames, in viewBox units, the same for both charts so they line up side by side. `px` is roughly how many units
 * make a CSS pixel where the frame is drawn: wide, about 420 to 540px beside the other chart (up to 880px stacked);
 * compact, about 300 to 340px. The bottom margin holds the weekday names and, under the calories, the days over.
 */
interface DFrame {
  w: number;
  l: number;
  r: number;
  t: number;
  plot: number;
  b: number;
  px: number;
}
const FRAMES: Record<Variant, DFrame> = {
  wide: { w: 600, l: 72, r: 8, t: 28, plot: 200, b: 54, px: 1.33 },
  compact: { w: 600, l: 104, r: 10, t: 40, plot: 300, b: 80, px: 2 },
};
const height = (F: DFrame) => F.t + F.plot + F.b;
/**
 * Room under the lowest bar for its value label, in CSS pixels: the 3px gap and an 11.5px label (health.css ›
 * .h-ax.is-sm) with a little air. Without it a bar reaching the foot printed its label on the weekday's name.
 */
const LABEL_ROOM_PX = 18;
const TIP_WIDTH = 236;
const f1 = (n: number) => n.toFixed(1);

/** Under two complete weeks a weekday's average is one or two days, which is an anecdote. */
const MIN_WEEKS = 2;

type Kind = 'cal' | 'wt';

interface Spec {
  kind: Kind;
  title: string;
  label: string;
  step: number;
  digits: number;
  zero: string;
  value: (r: WeekdayRow) => number | null;
}

function specs(weightUnit: string): Spec[] {
  return [
    {
      kind: 'cal',
      title: 'Calories against target, average · days over, underneath',
      label: 'Average calories against target, by weekday, with the days over target under each',
      step: 300,
      digits: 0,
      zero: 'target',
      value: (r) => r.avgVsTarget,
    },
    {
      kind: 'wt',
      title: 'Weigh-in against its 7-day trend, average',
      label: `Average weigh-in against its centred 7-day trend, by weekday, in ${weightUnit}`,
      step: 0.5,
      digits: 1,
      zero: 'trend',
      value: (r) => r.weighInVsTrend,
    },
  ];
}

function build(spec: Spec, v: Variant, profile: WeekdayProfile, weightUnit: string) {
  const F = FRAMES[v];
  const H = height(F);
  const band = (F.w - F.l - F.r) / 7;
  const x = (i: number) => F.l + band * (i + 0.5);
  const vals = profile.rows.map(spec.value).filter((n): n is number => n !== null);
  const { lo, hi } = barScale(vals, spec.step, F.plot, LABEL_ROOM_PX * F.px);
  const y = (n: number) => F.t + F.plot - ((n - lo) / (hi - lo)) * F.plot;
  const bw = Math.min(64 * F.px, band * 0.5);

  const ticks: number[] = [];
  for (let t = lo; t <= hi + 1e-9; t += spec.step) ticks.push(Math.round(t * 100) / 100);
  const bars = { under: '', over: '', wt: '' };
  const values: { key: string; left: string; top: string; transform: string; text: string }[] = [];
  profile.rows.forEach((r, i) => {
    const n = spec.value(r);
    if (n === null) return;
    const d = rectPath(x(i) - bw / 2, y(0), x(i) + bw / 2, y(n), 1.5 * F.px);
    if (spec.kind === 'wt') bars.wt += d;
    else if (n > 0) bars.over += d;
    else bars.under += d;
    values.push({
      key: r.day,
      left: pct(x(i), F.w),
      top: pct(y(n), H),
      transform: n >= 0 ? 'translate(-50%, calc(-100% - 3px))' : 'translate(-50%, 3px)',
      text: formatDelta(n, spec.digits),
    });
  });
  const unit = spec.kind === 'wt' ? ` ${weightUnit}` : '';

  return {
    spec,
    v,
    F,
    H,
    band,
    x,
    grid: ticks.filter((t) => Math.abs(t) > 1e-9).map((t) => `M${F.l} ${f1(y(t))}H${F.w - F.r}`).join(''),
    zero: `M${F.l} ${f1(y(0))}H${F.w - F.r}`,
    bars,
    values,
    ticks: ticks.map((t) => ({ t, top: pct(y(t), H), text: Math.abs(t) < 1e-9 ? spec.zero : `${formatDelta(t, spec.digits)}${unit}` })),
    dayTop: pct(F.t + F.plot, H),
    highlight: (i: number) => rectPath(x(i) - band / 2 + 2, F.t - 10 * F.px, x(i) + band / 2 - 2, F.t + F.plot, 0),
  };
}

/**
 * Monday to Sunday, averaged over the recorded weeks: calories against target, with the days over under each column,
 * beside the morning's weigh-in against its centred 7-day average, so a weekend's eating and the next mornings' scale
 * read across. Side by side on a wide screen, stacked on a narrow one. The figures are patterns, so plain ink.
 */
export default function WeekByDay({ days, calorieTargets, targets, weightUnit }: Props) {
  const [hover, setHover] = useState<{ kind: Kind; v: Variant; i: number; left: number } | null>(null);
  const profile = useMemo(
    () => weekdayProfile(days, calorieTargets, (date) => targetsFor(date, targets)?.proteinGoal ?? null),
    [days, calorieTargets, targets],
  );
  const charts = useMemo(() => specs(weightUnit).map((s) => VARIANTS.map((v) => build(s, v, profile, weightUnit))), [profile, weightUnit]);

  if (profile.weeks < MIN_WEEKS) return null;

  const move = (e: PointerEvent<HTMLDivElement>, c: ReturnType<typeof build>) => {
    const r = e.currentTarget.getBoundingClientRect();
    if (r.width === 0) return;
    const i = Math.floor((((e.clientX - r.left) / r.width) * c.F.w - c.F.l) / c.band);
    if (!Number.isFinite(i)) return;
    if (i < 0 || i > 6) return setHover(null);
    const x = (c.x(i) / c.F.w) * r.width;
    const half = (c.band / c.F.w) * r.width * 0.5;
    // Beside the column, or before it near the right edge; never past either edge.
    const left = x + half + TIP_WIDTH > r.width ? Math.max(0, x - half - TIP_WIDTH) : x + half;
    setHover({ kind: c.spec.kind, v: c.v, i, left });
  };
  const leave = (e: PointerEvent<HTMLDivElement>) => {
    // A tap on a phone ends with pointerleave; keep its tip up until the next tap.
    if (e.pointerType !== 'touch') setHover(null);
  };

  const row = hover ? profile.rows[hover.i] : null;
  const { weekendVsTarget, midweekVsTarget, sunMonVsFriSat, weeks } = profile;

  return (
    <section className="h-card">
      <div className="h-card-h">
        <h2>The week, by day</h2>
        <div className="h-legend">
          <span>
            <i className="h-sw is-under" />
            Under target
          </span>
          <span>
            <i className="h-sw is-over" />
            Over target
          </span>
          <span>
            <i className="h-sw is-accent" />
            Weigh-in against its trend
          </span>
        </div>
      </div>
      <p className="h-note">
        Each column is one weekday, averaged over every recorded week: calories against that day&rsquo;s target, and
        that morning&rsquo;s weigh-in against the 7-day average centred on it, so a column above the line weighs in
        heavy for where the trend is.
      </p>

      <div className="h-two is-even">
        {charts.map((frames) => (
          <div key={frames[0].spec.kind}>
            <div className="h-sub">{frames[0].spec.title}</div>
            {frames.map((c) => (
              <div
                key={c.v}
                className={`h-panel h-v is-${c.v} is-hover h-wkd is-${c.spec.kind}`}
                onPointerMove={(e) => move(e, c)}
                onPointerDown={(e) => move(e, c)}
                onPointerLeave={leave}
              >
                <svg viewBox={`0 0 ${c.F.w} ${c.H}`} role="img" aria-label={c.spec.label}>
                  {hover && <path className="g-hl" d={c.highlight(hover.i)} />}
                  <path className="g-grid" d={c.grid} />
                  <path className="g-under" d={c.bars.under} />
                  <path className="g-over" d={c.bars.over} />
                  <path className="g-wt" d={c.bars.wt} />
                  <path className="g-zero" d={c.zero} />
                </svg>
                {c.ticks.map(({ t, top, text }) => (
                  <span key={t} className="h-ax is-left" style={{ top, width: pct(c.F.l, c.F.w) }}>
                    {text}
                  </span>
                ))}
                {c.values.map((l) => (
                  <span key={l.key} className="h-ax is-sm" style={{ left: l.left, top: l.top, transform: l.transform }}>
                    {l.text}
                  </span>
                ))}
                {profile.rows.map((r, i) => (
                  <span key={r.day} className="h-wkd-day" style={{ left: pct(c.x(i), c.F.w), top: c.dayTop }}>
                    <b>{r.day}</b>
                    {c.spec.kind === 'cal' &&
                      (c.v === 'wide' ? (
                        // Three wordings by the chart's own width (health.css › .h-wkd): side by side the columns are
                        // too narrow for "11 of 17" seven times over, and the counts ran together.
                        <i>
                          <span className="h-wkd-long">
                            <span className="h-wkd-over">over on </span>
                            {r.overTarget} of {r.targeted}
                          </span>
                          <span className="h-wkd-short">
                            {r.overTarget}/{r.targeted}
                          </span>
                        </i>
                      ) : (
                        <i>
                          {r.overTarget}/{r.targeted}
                        </i>
                      ))}
                  </span>
                ))}
                {row && hover && hover.kind === c.spec.kind && hover.v === c.v && (
                  <div className="h-tip" style={{ left: hover.left, top: 4, width: TIP_WIDTH }}>
                    <div className="h-k">{NAMES[row.day]}</div>
                    <div className="h-row">
                      <span>Calories, average</span>
                      <b>{row.avgCals !== null ? formatNumber(row.avgCals) : '—'}</b>
                    </div>
                    <div className="h-row">
                      <span>Against target</span>
                      <b>{row.avgVsTarget !== null ? formatDelta(row.avgVsTarget, 0) : '—'}</b>
                    </div>
                    <div className="h-row">
                      <span>Over target</span>
                      <b>
                        {row.overTarget} of {row.targeted}
                      </b>
                    </div>
                    <div className="h-row">
                      <span>Protein, average</span>
                      <b>{row.avgProtein !== null ? `${formatNumber(row.avgProtein)} g` : '—'}</b>
                    </div>
                    {row.atProteinGoal !== null && (
                      <div className="h-row">
                        <span>At the protein goal</span>
                        <b>
                          {row.atProteinGoal} of {row.proteinScored}
                        </b>
                      </div>
                    )}
                    <div className="h-row">
                      <span>Weigh-in against trend</span>
                      <b>{row.weighInVsTrend !== null ? `${formatDelta(row.weighInVsTrend)} ${weightUnit}` : '—'}</b>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="h-facts">
        {weekendVsTarget !== null && (
          <div>
            <div className="h-k">Friday to Sunday</div>
            <div className="h-n">{formatDelta(weekendVsTarget, 0)} kcal</div>
            <div className="h-l">
              against target, a week on average; over in {profile.weekendOverWeeks} of {weeks} weeks
            </div>
          </div>
        )}
        {midweekVsTarget !== null && (
          <div>
            <div className="h-k">Monday to Thursday</div>
            <div className="h-n">{formatDelta(midweekVsTarget, 0)} kcal</div>
            <div className="h-l">
              against target, a week on average; under in {profile.midweekUnderWeeks} of {weeks} weeks
            </div>
          </div>
        )}
        {sunMonVsFriSat !== null && (
          <div>
            <div className="h-k">Sunday and Monday mornings</div>
            <div className="h-n">
              {formatDelta(sunMonVsFriSat)} {weightUnit}
            </div>
            <div className="h-l">
              {Number(sunMonVsFriSat.toFixed(1)) === 0
                ? 'the same as Friday and Saturday mornings'
                : `${sunMonVsFriSat > 0 ? 'heavier' : 'lighter'} than Friday and Saturday mornings`}
              , once the trend is taken out
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
