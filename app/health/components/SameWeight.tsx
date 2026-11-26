import type { HealthDay, PhaseSummary, WeeklyTrendRow } from '@/types/health';
import { type Rung, type SameWeight as SameWeightModel, RUNG_GAP, sameWeightTwice } from '@/lib/healthPatterns';
import { formatDelta, formatNumber, shortDate } from './format';
import FitRow, { type FitCell } from './FitRow';
import { VARIANTS, type Variant, dotPath, linePath, pct } from './svg';
import { blockDates, blockSpans, stepFor, weekPoints } from './trendRange';

interface Props {
  days: HealthDay[];
  weeklyTrend: WeeklyTrendRow[];
  phases: PhaseSummary[];
  /** The block the newest data falls in (lib/health › leadPhase): the newer of the two. */
  lead: PhaseSummary | null;
  weightUnit: string;
}

/**
 * The frames, in viewBox units (the mockup's: docs/design/health-ideas-2026-11-26). The wide frame is drawn about 520
 * to 1140px across, so a unit is roughly a pixel; the compact one about 310 to 360px, a unit a pixel. `rows` are the
 * middles of the block-name rows above the plot.
 */
interface SFrame {
  w: number;
  l: number;
  r: number;
  t: number;
  plot: number;
  b: number;
  rows: number[];
  dot: number;
  big: number;
  /** How far a rung's label sits from the end of the rung it is drawn at. */
  off: number;
}
const FRAMES: Record<Variant, SFrame> = {
  wide: { w: 760, l: 44, r: 20, t: 40, plot: 250, b: 26, rows: [17], dot: 4, big: 6, off: 12 },
  compact: { w: 360, l: 36, r: 12, t: 50, plot: 380, b: 26, rows: [14, 30], dot: 3.2, big: 5, off: 9 },
};
const height = (F: SFrame) => F.t + F.plot + F.b;
const f1 = (n: number) => n.toFixed(1);
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const monthOf = (iso: string) => MONTHS[Number(iso.slice(5, 7)) - 1];
const NUMBER_WORDS = ['', 'week', 'two weeks'];

/** "On the way down" and "On the way up", in the order the blocks ran; a block's name where neither moved. */
function heads(m: SameWeightModel): [string, string] {
  if (m.direction > 0) return ['On the way down', 'On the way up'];
  if (m.direction < 0) return ['On the way up', 'On the way down'];
  return [m.older.label, m.newer.label];
}

/**
 * The block the newest data falls in against the block before it: each complete week of the newer block joined by a
 * rung to the older block's week nearest it in average weight (within half a pound, each older week once), then a
 * table of the rungs and what was eaten at the same weight then and now. Ported from the mockup's idea 1.
 */
export default function SameWeight({ days, weeklyTrend, phases, lead, weightUnit }: Props) {
  const m = sameWeightTwice(weeklyTrend, phases, lead);
  if (!m) return null;
  const [downHead, upHead] = heads(m);
  const { newest, macros, ahead } = m;
  const nw = newest.newer.avgWeight as number;
  const isNow = newest.newer.weekStart === weeklyTrend[weeklyTrend.length - 1]?.weekStart;
  const kcal = (v: number | null) => (v === null ? '—' : formatNumber(v));
  const grams = (
    [
      ['protein', macros.protein],
      ['carbs', macros.carbs],
      ['fat', macros.fat],
    ] as const
  )
    .filter(([, v]) => v !== null)
    .map(([k, v]) => `${k} ${formatDelta(v as number, 0)} g`);
  const sentence =
    m.direction > 0
      ? 'Each rung joins a week on the way down to the week nearest it in weight on the way back up, when the two are within half a pound.'
      : m.direction < 0
        ? 'Each rung joins a week on the way up to the week nearest it in weight on the way back down, when the two are within half a pound.'
        : `Each rung joins a week of the ${m.older.label.toLowerCase()} to the week of the ${m.newer.label.toLowerCase()} nearest it in weight, when the two are within half a pound.`;

  return (
    <section className="h-card">
      <div className="h-card-h">
        <h2>The same weight, twice</h2>
        <div className="h-legend">
          <span>
            <i className="h-sw is-line is-accent" />
            Weekly average
          </span>
          <span>
            <i className="h-sw is-rungwk" />A week with a rung
          </span>
          <span>
            <i className="h-sw is-rung" />
            Rung
          </span>
        </div>
      </div>
      <p className="h-note">{sentence}</p>
      {VARIANTS.map((v) => (
        <Chart key={v} v={v} m={m} days={days} weeklyTrend={weeklyTrend} weightUnit={weightUnit} />
      ))}

      <table className="h-rungs">
        <thead>
          <tr>
            <th scope="col">Weight, {weightUnit}</th>
            <th scope="col">{downHead}</th>
            <th scope="col">{upHead}</th>
            <th scope="col" className="is-num">
              Difference
            </th>
          </tr>
        </thead>
        <tbody>
          {m.rungs.map((r) => (
            <tr key={r.newer.weekStart}>
              <th scope="row" className="is-wt">
                {f1(r.newer.avgWeight as number)}
                <span className="is-ex"> and {f1(r.older.avgWeight as number)}</span>
              </th>
              <WeekCell row={r.older} />
              <WeekCell row={r.newer} />
              <td className="is-num">
                <b>{r.dCals === null ? '—' : formatDelta(r.dCals, 0)}</b>
                <span className="h-rung-wk">kcal a day</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="h-facts">
        <div>
          <div className="h-k">
            At {f1(nw)} {weightUnit} in {monthOf(newest.older.weekEnd)}
          </div>
          <div className="h-n">{kcal(newest.older.avgCals === null ? null : Math.round(newest.older.avgCals))}</div>
          <div className="h-l">
            kcal a day, week ending {shortDate(newest.older.weekEnd)}, at {f1(newest.older.avgWeight as number)}
          </div>
        </div>
        <div>
          <div className="h-k">
            At {f1(nw)} {weightUnit} {isNow ? 'now' : `in ${monthOf(newest.newer.weekEnd)}`}
          </div>
          <div className="h-n">{kcal(newest.newer.avgCals === null ? null : Math.round(newest.newer.avgCals))}</div>
          <div className="h-l">kcal a day, week ending {shortDate(newest.newer.weekEnd)}</div>
        </div>
        {newest.dCals !== null && (
          <div>
            <div className="h-k">The difference</div>
            <div className="h-n">{formatDelta(newest.dCals, 0)} kcal</div>
            {grams.length > 0 && <div className="h-l">{grams.join(', ')} a day</div>}
          </div>
        )}
        {ahead.length > 0 && (
          <div>
            <div className="h-k">Still ahead</div>
            <div className="h-n">
              {ahead.map((w) => f1(w.avgWeight as number)).join(' and ')} {weightUnit}
            </div>
            <div className="h-l">
              {m.aheadBeganWith
                ? `the ${NUMBER_WORDS[ahead.length]} the ${m.older.label.toLowerCase()} began with`
                : `${ahead.length === 1 ? 'a week' : 'weeks'} of the ${m.older.label.toLowerCase()} ${m.direction > 0 ? 'above' : 'below'} this one`}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

/** A week's calories and steps a day, and its name: on a phone the steps go under the calories. */
function WeekCell({ row }: { row: WeeklyTrendRow }) {
  return (
    <td>
      <b>{row.avgCals === null ? '—' : formatNumber(row.avgCals)}</b> kcal<span className="h-rung-dv"> · </span>
      <br className="h-rung-br" />
      <span className="h-rung-m">{row.avgSteps === null ? '—' : formatNumber(row.avgSteps)} steps</span>
      <span className="h-rung-wk">week ending {shortDate(row.weekEnd)}</span>
    </td>
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

function Chart({ v, m, days, weeklyTrend, weightUnit }: { v: Variant; m: SameWeightModel; days: HealthDay[]; weeklyTrend: WeeklyTrendRow[]; weightUnit: string }) {
  const F = FRAMES[v];
  const H = height(F);
  const ds = days.filter((d) => d.date >= m.older.start);
  const n = ds.length;
  const band = (F.w - F.l - F.r) / Math.max(1, n);
  const cx = (mid: number) => F.l + band * (mid + 0.5);
  const keep = new Set(m.weeks.map((w) => w.weekStart));
  const pts = weekPoints(ds, weeklyTrend).filter((p) => keep.has(p.row.weekStart));
  const at = new Map(pts.map((p) => [p.row.weekStart, cx(p.mid)]));
  const ws = pts.map((p) => p.row.avgWeight as number);
  const step = stepFor(Math.max(...ws) - Math.min(...ws) + 1.6, v === 'wide' ? 7 : 9, [1, 2, 5, 10]);
  const lo = Math.floor((Math.min(...ws) - 0.8) / step) * step;
  const hi = Math.ceil((Math.max(...ws) + 0.8) / step) * step;
  const y = (w: number) => F.t + F.plot - ((w - lo) / (hi - lo)) * F.plot;
  const foot = F.t + F.plot;

  const spans = blockSpans(ds, [m.older, m.newer]);
  const xs = (sp: { a: number; z: number }) => ({ x0: F.l + band * sp.a, x1: F.l + band * (sp.z + 1) });
  const later = spans.find((sp) => sp.phase === m.newer);
  const tint = later ? `M${f1(xs(later).x0)} 4H${f1(xs(later).x1)}V${f1(foot)}H${f1(xs(later).x0)}Z` : '';
  const edge = later && later.a > 0 ? `M${f1(xs(later).x0)} 4V${f1(foot)}` : '';
  const nameCells: FitCell[] = spans.map((sp) => {
    const nm = sp.phase.label.toUpperCase();
    return { key: sp.phase.start, ...xs(sp), words: v === 'wide' ? [`${nm} · ${blockDates(sp.phase)}`, nm] : [nm] };
  });
  const dateCells: FitCell[] = spans.map((sp) => ({ key: sp.phase.start, ...xs(sp), words: [blockDates(sp.phase)] }));

  const ticks: number[] = [];
  for (let t = lo; t <= hi + 1e-9; t += step) ticks.push(t);
  const grid = ticks.map((t) => `M${F.l} ${f1(y(t))}H${F.w - F.r}`).join('');
  const months = ds.map((d, i) => ({ d, i })).filter(({ d, i }) => i > 0 && d.date.endsWith('-01'));
  const monthTicks = months.map(({ i }) => `M${f1(F.l + band * i)} ${f1(foot)}v5`).join('');

  const labels: Label[] = [];
  const ends = new Set<string>();
  let rungs = '';
  let prevAbove: number | null = null;
  m.rungs.forEach((r: Rung) => {
    ends.add(r.older.weekStart);
    ends.add(r.newer.weekStart);
    const xo = at.get(r.older.weekStart);
    const xn = at.get(r.newer.weekStart);
    if (xo === undefined || xn === undefined) return;
    const wo = r.older.avgWeight as number;
    const wn = r.newer.avgWeight as number;
    rungs += `M${f1(xo)} ${f1(y(wo))}L${f1(xn)} ${f1(y(wn))}`;
    // Too close under the rung above: this one is labelled at its other end, beside the newer week.
    const under = prevAbove !== null && prevAbove - wn < 0.8;
    prevAbove = under ? null : wn;
    const lx = under ? xn - F.off : xo + F.off;
    const ly = y(wo + (wn - wo) * ((lx - xo) / (xn - xo || 1)));
    labels.push({ key: `r${r.newer.weekStart}`, cls: 'is-rung', left: pct(lx, F.w), top: pct(ly, H), transform: `translate(${under ? '-100%' : '0'}, calc(-100% - 3px))`, text: f1(wn) });
  });

  const line = linePath(pts.map((p) => ({ x: cx(p.mid), y: y(p.row.avgWeight as number) })));
  const small = pts.filter((p) => !ends.has(p.row.weekStart)).map((p) => dotPath(cx(p.mid), y(p.row.avgWeight as number), F.dot)).join('');
  const big = pts.filter((p) => ends.has(p.row.weekStart)).map((p) => dotPath(cx(p.mid), y(p.row.avgWeight as number), F.big)).join('');

  const first = pts[0];
  const low = pts.reduce((a, b) => ((b.row.avgWeight as number) < (a.row.avgWeight as number) ? b : a));
  if (first) {
    labels.push({ key: 'first', cls: 'is-val', left: `calc(${pct(cx(first.mid), F.w)} + 8px)`, top: pct(y(first.row.avgWeight as number), H), transform: 'translateY(calc(-100% - 2px))', text: f1(first.row.avgWeight as number) });
  }
  if (low && low !== first) {
    labels.push({ key: 'low', cls: 'is-val', left: pct(cx(low.mid), F.w), top: pct(y(low.row.avgWeight as number), H), transform: 'translate(-50%, 9px)', text: f1(low.row.avgWeight as number) });
  }

  return (
    <div className={`h-panel h-v is-${v} h-same`}>
      <svg viewBox={`0 0 ${F.w} ${H}`} role="img" aria-label={`Weekly average weight across the ${m.older.label.toLowerCase()} and the ${m.newer.label.toLowerCase()}, with rungs joining weeks of the same weight, within ${RUNG_GAP} ${weightUnit}`}>
        <path className="g-band" d={tint} />
        <path className="g-block" d={edge} />
        <path className="g-grid" d={grid} />
        <path className="g-block" d={monthTicks} />
        <path className="g-rung" d={rungs} />
        <path className="g-avg" d={line} />
        <path className="g-wk" d={small} />
        <path className="g-wk is-big" d={big} />
      </svg>
      <FitRow cells={nameCells} w={F.w} h={H} y={F.rows[0]} className="is-name" />
      {v === 'compact' && <FitRow cells={dateCells} w={F.w} h={H} y={F.rows[1]} />}
      <span className="h-ax is-unit" style={{ left: 0, top: pct(y(hi) - 16, H), width: pct(F.l, F.w), textAlign: 'right', paddingRight: 6, transform: 'translateY(-50%)' }}>
        {weightUnit}
      </span>
      {ticks.map((t) => (
        <span key={t} className="h-ax is-left" style={{ top: pct(y(t), H), width: pct(F.l, F.w) }}>
          {formatNumber(t)}
        </span>
      ))}
      {months.map(({ d, i }) => (
        <span key={d.date} className="h-ax" style={{ left: `calc(${pct(F.l + band * i, F.w)} + 4px)`, top: pct(foot + 14, H), transform: 'translateY(-50%)' }}>
          {shortDate(d.date).slice(0, 3)}
        </span>
      ))}
      {labels.map((l) => (
        <span key={l.key} className={`h-ax ${l.cls}`} style={{ left: l.left, top: l.top, transform: l.transform }}>
          {l.text}
        </span>
      ))}
    </div>
  );
}
