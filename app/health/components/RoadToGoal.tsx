import type { HealthDay, PhaseSummary, WeeklyTrendRow } from '@/types/health';
import { type Pace, type PaceKey, type Road, daysBetween, roadToGoal, weekOnWeek } from '@/lib/healthProgress';
import { formatDelta, formatNumber, shortDate } from './format';
import { VARIANTS, type Variant, dotPath, linePath, pct } from './svg';
import { addDays, stepFor } from './trendRange';

interface Props {
  days: HealthDay[];
  weeklyTrend: WeeklyTrendRow[];
  phases: PhaseSummary[];
  /** The block the newest data falls in (lib/health › leadPhase): the block the lead card tells, and this card too. */
  lead: PhaseSummary | null;
  weightUnit: string;
}

/**
 * The frames, in viewBox units. `render` is the narrowest each is drawn at, in CSS pixels (the wide frame from 601px,
 * the compact one on a 375px phone), so the arrival dates at the goal line can be kept apart without measuring.
 */
interface RFrame {
  w: number;
  l: number;
  r: number;
  t: number;
  plot: number;
  b: number;
  render: number;
  dot: number;
  wk: number;
}
const FRAMES: Record<Variant, RFrame> = {
  wide: { w: 760, l: 44, r: 20, t: 12, plot: 270, b: 26, render: 520, dot: 2.2, wk: 3.8 },
  compact: { w: 360, l: 36, r: 12, t: 10, plot: 320, b: 26, render: 310, dot: 1.7, wk: 3 },
};
/** One row of arrival dates, in CSS pixels, and the width of a character of the 11px mono they are set in. */
const ROW_PX = 17;
const CHAR_PX = 6.8;
const f1 = (n: number) => n.toFixed(1);
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const LEGEND: Record<PaceKey, string> = { recent: 'Last three weeks', block: 'This block', plan: 'Plan' };
const NAME: Record<PaceKey, string> = { recent: 'recent pace', block: 'block’s pace', plan: 'plan' };
const LINE: Record<PaceKey, string> = { recent: 'g-rd-recent', block: 'g-rd-block', plan: 'g-plan' };
const SWATCH: Record<PaceKey, string> = { recent: 'is-rd-recent', block: 'is-rd-block', plan: 'is-plan' };

/** "Apr 4, 2027" when the year differs from the newest data's, else "Apr 4". */
export function pageDate(iso: string, year: string): string {
  return iso.slice(0, 4) === year ? shortDate(iso) : `${shortDate(iso)}, ${iso.slice(0, 4)}`;
}

function weekday(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

/**
 * The road to the goal: the block so far, then a straight line from the newest week's average to the goal at each
 * pace the block has. The rates and weights are the lead card's own (`PhaseSummary`), so the recent line lands on its
 * "On pace for". Under the chart, what each per-week figure on the page counts from. Ported from the mockup's idea 4.
 */
export default function RoadToGoal({ days, weeklyTrend, phases, lead, weightUnit }: Props) {
  const road = roadToGoal(days, weeklyTrend, phases, lead);
  if (!road) return null;
  const year = (days.length ? days[days.length - 1].date : road.nowDate).slice(0, 4);
  const goalText = formatNumber(road.goal, road.goal % 1 ? 1 : 0);
  const pace = (p: Pace, unit = '') => `${formatDelta(p.rate)}${unit}`;
  const byKey = Object.fromEntries(road.paces.map((p) => [p.key, p])) as Partial<Record<PaceKey, Pace>>;
  const names = road.paces.map((p) =>
    p.key === 'recent' ? 'the pace of the last three weeks' : p.key === 'block' ? 'the pace of the whole block' : 'the plan',
  );
  const count = ['', 'A straight line', 'Two straight lines', 'Three straight lines'][road.paces.length];
  const list = names.length < 2 ? names[0] : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
  const weeks = (daysBetween(road.start.date, road.nowDate) + 1) / 7;
  const wow = weekOnWeek(weeklyTrend, road.block);

  const passes = road.previous ? road.paces.map((p) => p.passDate as string) : [];
  const soonest = road.paces[0];
  const latest = road.paces[road.paces.length - 1];

  return (
    <section className="h-card" aria-label={`The road to ${goalText} ${weightUnit}`}>
      <div className="h-card-h">
        <h2>The road to {goalText}</h2>
        <div className="h-legend">
          <span>
            <i className="h-sw is-line is-accent" />
            Weekly average
          </span>
          <span>
            <i className="h-sw is-dot is-mark" />
            Weigh-in
          </span>
          {(['recent', 'block', 'plan'] as const).map((k) => {
            const p = byKey[k];
            if (!p) return null;
            return (
              <span key={k}>
                <i className={`h-sw ${SWATCH[k]}`} />
                {LEGEND[k]}, {pace(p, k === 'recent' ? ' a week' : '')}
              </span>
            );
          })}
        </div>
      </div>
      <p className="h-note">
        {count} from this week’s average to the goal: {list}.
      </p>
      {VARIANTS.map((v) => (
        <Chart key={v} v={v} road={road} year={year} goalText={goalText} />
      ))}
      <div className="h-facts">
        {byKey.recent && (
          <div>
            <div className="h-k">At the recent pace, {pace(byKey.recent, ' a week')}</div>
            <div className="h-n">{pageDate(byKey.recent.date, year)}</div>
            <div className="h-l">{road.recentFrom ? `fitted to the weigh-ins since ${shortDate(road.recentFrom)}` : 'the last three weeks'}</div>
          </div>
        )}
        {byKey.block && (
          <div>
            <div className="h-k">At this block’s pace, {pace(byKey.block)}</div>
            <div className="h-n">{pageDate(byKey.block.date, year)}</div>
            <div className="h-l">
              {f1(road.start.weight)} on {shortDate(road.start.date)} to {f1(road.now)} in {formatNumber(weeks, weeks % 1 ? 1 : 0)} weeks
            </div>
          </div>
        )}
        {byKey.plan && (
          <div>
            <div className="h-k">At the plan, {pace(byKey.plan)}</div>
            <div className="h-n">{pageDate(byKey.plan.date, year)}</div>
            <div className="h-l">the pace planned for the {road.block.label.toLowerCase()}</div>
          </div>
        )}
        {road.previous && (
          <div>
            <div className="h-k">
              Back where the {road.previous.block.label.toLowerCase()} began, {f1(road.previous.weight)} {weightUnit}
            </div>
            <div className="h-n">
              {passes.length > 1 && soonest.passDate !== latest.passDate
                ? `${pageDate(soonest.passDate as string, year)} to ${pageDate(latest.passDate as string, year)}`
                : pageDate(soonest.passDate as string, year)}
            </div>
            <div className="h-l">
              {road.paces.length > 1 ? `from the ${NAME[soonest.key]} to the ${NAME[latest.key]}` : `at the ${NAME[soonest.key]}`};
              the {road.previous.block.label.toLowerCase()}’s first week, ending {shortDate(road.previous.week.weekEnd)}
            </div>
          </div>
        )}
      </div>
      {(road.block.weightChangePerWeek !== null || wow) && (
        <p className="h-note is-after h-road-note">
          {road.block.weightChangePerWeek !== null && (
            <>
              This block’s pace, {formatDelta(road.block.weightChangePerWeek)} {weightUnit} a week, counts from its first weigh-in:{' '}
              {f1(road.start.weight)} {weightUnit} on {shortDate(road.start.date)}.{' '}
            </>
          )}
          {wow && (
            <>
              Week on week, {formatDelta(wow.avg)} {weightUnit} on Trends, is the average of the weekly changes
              {wow.from ? (
                <>
                  {' '}
                  and counts from the last weekly average before the block: {f1(wow.from.avgWeight as number)} {weightUnit}, the week
                  ending {shortDate(wow.from.weekEnd)}.
                </>
              ) : (
                '.'
              )}
            </>
          )}
        </p>
      )}
    </section>
  );
}

interface Label {
  key: string;
  left: number;
  top: number;
  cls: string;
  text: string;
  transform: string;
}

function Chart({ v, road, year, goalText }: { v: Variant; road: Road; year: string; goalText: string }) {
  const F = FRAMES[v];
  const H = F.t + F.plot + F.b;
  const s = F.w / F.render; // viewBox units per CSS pixel at the narrowest render
  const PW = F.w - F.l - F.r;
  const start = road.block.start;
  const end = addDays(road.paces[road.paces.length - 1].date, 21);
  const span = Math.max(1, daysBetween(start, end));
  const x = (d: string) => F.l + (daysBetween(start, d) / span) * PW;

  // The arrival dates sit on the goal's side of its line, in rows, kept apart in CSS pixels; "goal 220" holds the left.
  const labels: Label[] = [];
  const placed: { a: number; b: number; row: number }[] = [];
  const place = (a: number, w: number) => {
    let row = 0;
    while (placed.some((p) => p.row === row && a < p.b + 6 && a + w > p.a - 6)) row++;
    placed.push({ a, b: a + w, row });
    return row;
  };
  const goalW = (`goal ${goalText}`.length * CHAR_PX + 8) * s;
  place((F.l + 4) / s, goalW / s);
  const arrivals = road.paces.map((p) => {
    const text = v === 'wide' ? pageDate(p.date, year) : shortDate(p.date);
    const w = text.length * CHAR_PX + 8;
    const cx = x(p.date) / s;
    const a = Math.min(Math.max(cx - w / 2, F.l / s), F.w / s - w);
    return { p, text, a, row: place(a, w) };
  });
  const rows = Math.max(...placed.map((p) => p.row)) + 1;
  const room = (rows * ROW_PX + 6) * s;

  // The weight scale: zoomed to the block's readings and the goal, never from zero, the goal at the edge the labels
  // stand beyond.
  const ws = road.weighIns.map((w) => w.weight).concat(road.now);
  const up = road.direction > 0;
  const far = up ? Math.min(...ws) - 1 : Math.max(...ws) + 1;
  const yGoal = up ? F.t + room : F.t + F.plot - room;
  const yFar = up ? F.t + F.plot : F.t;
  const y = (w: number) => yGoal + ((road.goal - w) / (road.goal - far)) * (yFar - yGoal);
  const base = F.t + F.plot;

  const step = stepFor(Math.abs(road.goal - far), v === 'wide' ? 6 : 7, [1, 2, 5, 10, 20]);
  const ticks: number[] = [];
  for (let t = Math.ceil(Math.min(far, road.goal) / step) * step; t <= Math.max(far, road.goal) + 1e-9; t += step) ticks.push(t);
  const grid = ticks.filter((t) => t !== road.goal).map((t) => `M${F.l} ${f1(y(t))}H${F.w - F.r}`).join('');

  // Months along the foot, thinned so their names never touch.
  const monthPx = ((30 / span) * PW) / s;
  const stride = Math.max(1, Math.ceil(38 / monthPx));
  const months: { d: string; k: number }[] = [];
  for (let d = start, k = 0; d <= end; d = addDays(d, 1)) {
    if (d.endsWith('-01')) months.push({ d, k: k++ });
  }
  const monthTicks = months.map(({ d }) => `M${f1(x(d))} ${base}v5`).join('');

  const nowX = x(road.nowDate);
  const nowY = y(road.now);
  const goalY = y(road.goal);
  const fan =
    road.paces.length > 1
      ? `M${f1(nowX)} ${f1(nowY)}L${f1(x(road.paces[0].date))} ${f1(goalY)}L${f1(x(road.paces[road.paces.length - 1].date))} ${f1(goalY)}Z`
      : '';
  const today = `M${f1(nowX)} ${f1(nowY + 12)}V${base}`;
  const dots = road.weighIns.map((w) => dotPath(x(w.date), y(w.weight), F.dot)).join('');
  const avg = linePath(road.weeks.map((r) => ({ x: x(addDays(r.weekStart, 3)), y: y(r.avgWeight as number) })));
  const wkPts = road.weeks.map((r) => dotPath(x(addDays(r.weekStart, 3)), y(r.avgWeight as number), F.wk)).join('');
  const hits = road.paces.map((p) => dotPath(x(p.date), goalY, 3.5)).join('');
  // A date lifted off its first row is tied to its point by a short stem.
  const stems = arrivals
    .filter((a) => a.row > 0)
    .map((a) => {
      const ly = up ? goalY - (8 + a.row * ROW_PX) * s : goalY + (8 + a.row * ROW_PX) * s;
      return `M${f1(x(a.p.date))} ${f1(up ? goalY - 4 : goalY + 4)}V${f1(ly)}`;
    })
    .join('');

  const rowTop = (row: number) => (up ? goalY - (5 + row * ROW_PX) * s : goalY + (5 + row * ROW_PX) * s);
  const rowShift = up ? '-100%' : '0';
  labels.push({ key: 'goal', left: F.l + 4, top: rowTop(0), cls: 'is-goal-n', text: `goal ${goalText}`, transform: `translateY(${rowShift})` });
  arrivals.forEach((a) =>
    labels.push({ key: a.p.key, left: a.a * s, top: rowTop(a.row), cls: 'is-date', text: a.text, transform: `translateY(${rowShift})` }),
  );
  labels.push({ key: 'now', left: nowX + 8, top: nowY + (up ? 6 : -6), cls: 'is-val', text: f1(road.now), transform: up ? 'none' : 'translateY(-100%)' });
  if (road.previous) {
    const label = v === 'wide' ? `${f1(road.previous.weight)}, where the ${road.previous.block.label.toLowerCase()} began` : `${f1(road.previous.weight)}, the ${road.previous.block.label.toLowerCase()}’s start`;
    labels.push({ key: 'prev', left: F.w - F.r - 2, top: y(road.previous.weight) - 3, cls: 'is-note is-ref', text: label, transform: 'translate(-100%, -100%)' });
  }

  return (
    <div className={`h-panel h-v is-${v} h-road`}>
      <svg
        viewBox={`0 0 ${F.w} ${H}`}
        role="img"
        aria-label={`The ${road.block.label.toLowerCase()} so far, and a straight line from this week’s average to the goal of ${goalText} at each pace`}
      >
        <path className="g-grid" d={grid} />
        {road.previous && <path className="g-ref" d={`M${F.l} ${f1(y(road.previous.weight))}H${F.w - F.r}`} />}
        <path className="g-base" d={`M${F.l} ${base}H${F.w - F.r}`} />
        <path className="g-block" d={monthTicks + stems} />
        <path className="g-fan" d={fan} />
        <path className="g-goal" d={`M${F.l} ${f1(goalY)}H${F.w - F.r}`} />
        <path className="g-today" d={today} />
        <path className="g-day" d={dots} />
        <path className="g-avg" d={avg} />
        <path className="g-wk" d={wkPts} />
        {road.paces.map((p) => (
          <path key={p.key} className={LINE[p.key]} d={`M${f1(nowX)} ${f1(nowY)}L${f1(x(p.date))} ${f1(goalY)}`} />
        ))}
        <path className="g-arrive" d={hits} />
      </svg>
      {ticks.map((t) => (
        <span key={t} className="h-ax is-left" style={{ top: pct(y(t), H), width: pct(F.l, F.w) }}>
          {formatNumber(t, t % 1 ? 1 : 0)}
        </span>
      ))}
      {months
        .filter(({ k }) => (months.length - 1 - k) % stride === 0 || stride === 1)
        .map(({ d }) => (
          <span key={d} className="h-ax" style={{ left: pct(x(d) + 3, F.w), top: pct(base + 14, H), transform: 'translateY(-50%)' }}>
            {MONTHS[Number(d.slice(5, 7)) - 1]}
          </span>
        ))}
      {labels.map((l) => (
        <span key={l.key} className={`h-ax ${l.cls}`} style={{ left: pct(l.left, F.w), top: pct(l.top, H), transform: l.transform }}>
          {l.text}
        </span>
      ))}
    </div>
  );
}

/** "Fri, Nov 27": a day of the week with its date, in the page's style. */
export function dayAndDate(iso: string, year: string): string {
  return `${weekday(iso)}, ${pageDate(iso, year)}`;
}
