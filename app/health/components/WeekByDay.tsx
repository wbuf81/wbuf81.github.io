'use client';

import { useMemo, useState } from 'react';
import type { PointerEvent } from 'react';
import { HealthCalorieTarget, HealthDatedTargets, HealthDay } from '@/types/health';
import { targetsFor } from '@/lib/targets';
import { WeekdayProfile, weekdayProfile } from '@/lib/healthInsights';
import { downIsGood, formatDelta, formatNumber } from './format';
import { Frame, VARIANTS, Variant, bands, hline, pct, rectPath, yScale } from './svg';

interface Props {
  days: HealthDay[];
  calorieTargets: HealthCalorieTarget[];
  /** Dated standing goals; the protein goal is read from the revision in force each day. */
  targets: HealthDatedTargets[];
  weightUnit: string;
}

const NAMES = { Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday', Sun: 'Sunday' };
const FRAMES: Record<Variant, { top: Frame; low: Frame }> = {
  wide: {
    top: { w: 1000, h: 220, l: 64, r: 24, t: 10, b: 10 },
    low: { w: 1000, h: 150, l: 64, r: 24, t: 8, b: 8 },
  },
  compact: {
    top: { w: 1000, h: 560, l: 170, r: 20, t: 40, b: 40 },
    low: { w: 1000, h: 420, l: 170, r: 20, t: 40, b: 40 },
  },
};
const TIP_WIDTH = 236;

/** Under two complete weeks a weekday's average is one or two days, which is an anecdote. */
const MIN_WEEKS = 2;

function build(v: Variant, profile: WeekdayProfile) {
  const { top: TOP, low: LOW } = FRAMES[v];
  const { band, x } = bands(TOP, 7);
  const bw = band * 0.5;
  const col = (i: number, y0: number, y1: number) => rectPath(x(i) - bw / 2, y0, x(i) + bw / 2, y1);
  // The value labels sit a line's height beyond the end of each column.
  const off = v === 'wide' ? 10 : 26;

  // Calories against target: symmetric, on a clean step.
  const cMax = Math.max(200, ...profile.rows.map((r) => Math.abs(r.avgVsTarget ?? 0)));
  const cr = Math.ceil(cMax / 200) * 200;
  const cy = yScale(TOP, -cr, cr);
  let under = '';
  let over = '';
  profile.rows.forEach((r, i) => {
    if (r.avgVsTarget === null) return;
    const p = col(i, cy(0), cy(r.avgVsTarget));
    if (r.avgVsTarget > 0) over += p;
    else under += p;
  });

  const wMax = Math.max(0.5, ...profile.rows.map((r) => Math.abs(r.weighInVsTrend ?? 0)));
  const wr = Math.ceil((wMax + 0.1) * 2) / 2;
  const wy = yScale(LOW, -wr, wr);
  const cTicks = [-cr, -cr / 2, 0, cr / 2, cr];

  return {
    v,
    TOP,
    LOW,
    band,
    x,
    cGrid: cTicks.filter((t) => t !== 0).map((t) => hline(TOP, cy(t))).join(''),
    cZero: hline(TOP, cy(0)),
    under,
    over,
    cTicks: cTicks.map((t) => ({ t, top: pct(cy(t), TOP.h) })),
    cLabels: profile.rows.map((r, i) =>
      r.avgVsTarget === null ? null : { left: pct(x(i), TOP.w), top: pct(cy(r.avgVsTarget) + (r.avgVsTarget > 0 ? -off : off), TOP.h), value: r.avgVsTarget },
    ),
    wBars: profile.rows.map((r, i) => (r.weighInVsTrend === null ? '' : col(i, wy(0), wy(r.weighInVsTrend)))).join(''),
    wGrid: [-wr, wr].map((t) => hline(LOW, wy(t))).join(''),
    wZero: hline(LOW, wy(0)),
    wTicks: [-wr, 0, wr].map((t) => ({ t, top: pct(wy(t), LOW.h) })),
    wLabels: profile.rows.map((r, i) =>
      r.weighInVsTrend === null ? null : { left: pct(x(i), LOW.w), top: pct(wy(r.weighInVsTrend) + (r.weighInVsTrend > 0 ? -off : off), LOW.h), value: r.weighInVsTrend },
    ),
    highlight: (i: number, f: Frame) => rectPath(x(i) - band / 2 + 2, 0, x(i) + band / 2 - 2, f.h),
  };
}

/**
 * Monday to Sunday, averaged over the recorded weeks: calories against target on top, the morning's
 * weigh-in against its centred 7-day average below, so a weekend's eating and the next mornings' scale
 * can be read in the same column.
 */
export default function WeekByDay({ days, calorieTargets, targets, weightUnit }: Props) {
  const [hover, setHover] = useState<{ i: number; left: number } | null>(null);
  const profile = useMemo(
    () => weekdayProfile(days, calorieTargets, (date) => targetsFor(date, targets)?.proteinGoal ?? null),
    [days, calorieTargets, targets],
  );
  const charts = useMemo(() => VARIANTS.map((v) => build(v, profile)), [profile]);

  if (profile.weeks < MIN_WEEKS) return null;

  const move = (e: PointerEvent<HTMLDivElement>, c: (typeof charts)[number]) => {
    const r = e.currentTarget.getBoundingClientRect();
    if (r.width === 0) return;
    const i = Math.floor((((e.clientX - r.left) / r.width) * c.TOP.w - c.TOP.l) / c.band);
    if (!Number.isFinite(i)) return;
    if (i < 0 || i > 6) return setHover(null);
    const x = (c.x(i) / c.TOP.w) * r.width;
    const half = (c.band / c.TOP.w) * r.width * 0.5;
    const left = x + half + TIP_WIDTH > r.width ? Math.max(0, x - half - TIP_WIDTH) : x + half;
    setHover({ i, left });
  };
  const leave = (e: PointerEvent<HTMLDivElement>) => {
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
        Each column is one weekday, averaged over every recorded week. Top: calories against that day&rsquo;s target.
        Bottom: that morning&rsquo;s weigh-in against the 7-day average centred on it, so a column above the line
        weighs in heavy for where the trend is.
      </p>

      {charts.map((c) => (
        <div key={c.v} className={`h-wkd h-v is-${c.v}`} onPointerMove={(e) => move(e, c)} onPointerDown={(e) => move(e, c)} onPointerLeave={leave}>
          <div className="h-sub">Calories against target, average</div>
          <div className="h-panel">
            <svg viewBox={`0 0 ${c.TOP.w} ${c.TOP.h}`} role="img" aria-label="Average calories against target by weekday">
              {hover && <path className="g-hl" d={c.highlight(hover.i, c.TOP)} />}
              <path className="g-grid" d={c.cGrid} />
              <path className="g-under" d={c.under} />
              <path className="g-over" d={c.over} />
              <path className="g-zero" d={c.cZero} />
            </svg>
            {c.cTicks.map(({ t, top }) => (
              <span key={t} className="h-ax is-left" style={{ top, width: pct(c.TOP.l, c.TOP.w) }}>
                {t === 0 ? 'target' : formatDelta(t, 0)}
              </span>
            ))}
            {c.cLabels.map((l, i) =>
              l ? (
                <span key={i} className="h-ax is-value" style={{ left: l.left, top: l.top }}>
                  {formatDelta(l.value, 0)}
                </span>
              ) : null,
            )}
          </div>

          <div className="h-wkd-row">
            {profile.rows.map((r, i) => (
              <span key={r.day} className="h-wkd-day" style={{ left: pct(c.x(i), c.TOP.w) }}>
                <b>{r.day}</b>
                {/* A phone has room for the day alone; the counts are in its tooltip and the facts below. */}
                {c.v === 'wide' && (
                  <i>
                    <span className="h-wkd-over">over on </span>
                    {r.overTarget} of {r.targeted}
                  </i>
                )}
              </span>
            ))}
          </div>

          <div className="h-sub">Weigh-in against its 7-day trend, average</div>
          <div className="h-panel">
            <svg viewBox={`0 0 ${c.LOW.w} ${c.LOW.h}`} role="img" aria-label="Average morning weight against its 7-day trend by weekday">
              {hover && <path className="g-hl" d={c.highlight(hover.i, c.LOW)} />}
              <path className="g-grid" d={c.wGrid} />
              <path className="g-wt" d={c.wBars} />
              <path className="g-zero" d={c.wZero} />
            </svg>
            {c.wTicks.map(({ t, top }) => (
              <span key={t} className="h-ax is-left" style={{ top, width: pct(c.LOW.l, c.LOW.w) }}>
                {t === 0 ? 'trend' : `${formatDelta(t)} ${weightUnit}`}
              </span>
            ))}
            {c.wLabels.map((l, i) =>
              l ? (
                <span key={i} className="h-ax is-value" style={{ left: l.left, top: l.top }}>
                  {formatDelta(l.value)}
                </span>
              ) : null,
            )}
          </div>

          {row && hover && (
            <div className="h-tip" style={{ left: hover.left, top: 28, width: TIP_WIDTH }}>
              <div className="h-k">{NAMES[row.day]}</div>
              <div className="h-row">
                <span>Calories, average</span>
                <b>{row.avgCals !== null ? formatNumber(row.avgCals) : '—'}</b>
              </div>
              <div className="h-row">
                <span>Vs target</span>
                <b className={downIsGood(row.avgVsTarget, 0)}>{row.avgVsTarget !== null ? formatDelta(row.avgVsTarget, 0) : '—'}</b>
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
                <span>Weigh-in vs trend</span>
                <b>{row.weighInVsTrend !== null ? `${formatDelta(row.weighInVsTrend)} ${weightUnit}` : '—'}</b>
              </div>
            </div>
          )}
        </div>
      ))}

      <div className="h-facts">
        {weekendVsTarget !== null && (
          <div>
            <div className="h-k">Friday to Sunday</div>
            <div className={`h-n ${downIsGood(weekendVsTarget, 0)}`}>{formatDelta(weekendVsTarget, 0)} kcal</div>
            <div className="h-l">
              against target, a week on average; over in {profile.weekendOverWeeks} of {weeks} weeks
            </div>
          </div>
        )}
        {midweekVsTarget !== null && (
          <div>
            <div className="h-k">Monday to Thursday</div>
            <div className={`h-n ${downIsGood(midweekVsTarget, 0)}`}>{formatDelta(midweekVsTarget, 0)} kcal</div>
            <div className="h-l">
              against target, a week on average; under in {profile.midweekUnderWeeks} of {weeks} weeks
            </div>
          </div>
        )}
        {sunMonVsFriSat !== null && (
          <div>
            <div className="h-k">Sunday and Monday mornings</div>
            <div className={`h-n ${downIsGood(sunMonVsFriSat)}`}>
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
