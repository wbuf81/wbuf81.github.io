import type { HealthCalorieTarget, HealthDay } from '@/types/health';
import { calorieTargetFor } from './calorieTarget.ts';

/**
 * The patterns /health draws beside the raw charts: what a day's calories do to the next morning, the
 * mornings after a big day, the week by day, and the morning after cardio.
 *
 * Pure and client-safe (no fs), with an extension-explicit relative import, for the same reason as
 * `calorieTarget.ts`: anything near `lib/health.ts` must stay loadable by plain Node.
 *
 * "The next morning" is always the next calendar day. A day with no row after it, or a morning with no
 * weigh-in, is left out rather than paired with whatever reading comes next: two days of change read as
 * one would overstate every swing.
 */

/**
 * A big day is this many times that day's calorie target or more: 20% over. Relative, not a fixed number of
 * calories, so it means the same on a cut at 2,450 and a bulk at 2,900. A day with no target is never big.
 */
export const BIG_DAY_RATIO = 1.2;

/** Whether a day's calories make it a big day against the target in force that day. */
export function isBigDay(cals: number | null, target: number | null): boolean {
  return cals !== null && target !== null && target > 0 && cals >= target * BIG_DAY_RATIO;
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
export type Weekday = (typeof WEEKDAYS)[number];

function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

/** Monday-first weekday of an ISO date, read from the date rather than the typed Day column. */
function weekdayOf(iso: string): Weekday {
  const [y, m, d] = iso.split('-').map(Number);
  return WEEKDAYS[(new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7];
}

function mean(values: number[]): number | null {
  return values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : null;
}

/** Weights are recorded to a tenth, so a difference is too; this drops floating-point noise. */
const tenth = (v: number) => Math.round(v * 10) / 10;
const hundredth = (v: number | null) => (v === null ? null : Math.round(v * 100) / 100);
const whole = (v: number | null) => (v === null ? null : Math.round(v));

export interface MeanCount {
  avg: number | null;
  n: number;
}

function meanCount(values: number[]): MeanCount {
  return { avg: hundredth(mean(values)), n: values.length };
}

export interface NextMorningPair {
  date: string;
  cals: number;
  /** Next morning's weight minus this morning's. */
  change: number;
  /** Over the calorie target in force that day. False with no target. */
  over: boolean;
  /** The calorie target in force that day, or null before the first one. */
  target: number | null;
  /** Calories minus that day's target. Null with no target. */
  vsTarget: number | null;
  /** 20% or more over that day's target (`BIG_DAY_RATIO`). False with no target. */
  big: boolean;
}

export function nextMorningPairs(days: HealthDay[], calorieTargets?: HealthCalorieTarget[]): NextMorningPair[] {
  const byDate = new Map(days.map((d) => [d.date, d]));
  const pairs: NextMorningPair[] = [];
  for (const day of days) {
    const next = byDate.get(addDays(day.date, 1));
    if (!next || day.cals === null || day.weight === null || next.weight === null) continue;
    const target = calorieTargetFor(day.date, calorieTargets);
    pairs.push({
      date: day.date,
      cals: day.cals,
      change: tenth(next.weight - day.weight),
      over: target !== null && day.cals > target,
      target,
      vsTarget: target === null ? null : day.cals - target,
      big: isBigDay(day.cals, target),
    });
  }
  return pairs;
}

export interface NextMorningFacts {
  over: MeanCount;
  atOrUnder: MeanCount;
  big: MeanCount;
  /**
   * Least-squares line over the pairs with a target, change = slope × vsTarget + intercept. Null under three such
   * pairs or with no spread.
   */
  fit: { slope: number; intercept: number } | null;
}

export function nextMorningFacts(pairs: NextMorningPair[]): NextMorningFacts {
  let fit: NextMorningFacts['fit'] = null;
  const scored = pairs.filter((p): p is NextMorningPair & { vsTarget: number } => p.vsTarget !== null);
  if (scored.length >= 3) {
    const mx = mean(scored.map((p) => p.vsTarget)) as number;
    const my = mean(scored.map((p) => p.change)) as number;
    const sxx = scored.reduce((s, p) => s + (p.vsTarget - mx) ** 2, 0);
    if (sxx > 0) {
      const slope = scored.reduce((s, p) => s + (p.vsTarget - mx) * (p.change - my), 0) / sxx;
      fit = { slope, intercept: my - slope * mx };
    }
  }
  return {
    over: meanCount(pairs.filter((p) => p.over).map((p) => p.change)),
    // A day with no target in force was neither over nor at-or-under: it was scored against nothing.
    atOrUnder: meanCount(pairs.filter((p) => !p.over && p.target !== null).map((p) => p.change)),
    big: meanCount(pairs.filter((p) => p.big).map((p) => p.change)),
    fit,
  };
}

export interface BigDayTrace {
  date: string;
  cals: number;
  /** The calorie target in force that day. */
  target: number;
  /** Weight against that day's morning: [0, next morning, …], stopping at the first missing reading. */
  changes: number[];
  /** Short only because the data ends: more mornings may come with the next import. */
  open: boolean;
}

export interface AfterBigDays {
  horizon: number;
  traces: BigDayTrace[];
  /** Every day's average change at each offset (`everyDay`'s means), for comparison. Null where none reaches it. */
  typical: (number | null)[];
  /**
   * The same statistics as `offsets`, over every weighed day rather than the big ones: each day traced from its morning
   * through the mornings after it, stopping at the first one not weighed, as the big days are (the mockup's allPaths).
   * A day with no weighed next morning is left out. Null at an offset no day reaches.
   */
  everyDay: (OffsetStats | null)[];
  /** Over the traces that reach the horizon: their average there, how many, how many below that morning. */
  atHorizon: { avg: number | null; n: number; below: number };
  /**
   * Per offset 0…horizon, over the traces that reach it: the average, the quartiles (the middle half lies between q1
   * and q3) and how many. Null at an offset no trace reaches.
   */
  offsets: (OffsetStats | null)[];
}

export interface OffsetStats {
  mean: number;
  q1: number;
  q3: number;
  n: number;
}

/** The value a fraction `t` of the way through sorted values, interpolating linearly between neighbours. */
function quantile(sorted: number[], t: number): number {
  const pos = (sorted.length - 1) * t;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

function offsetStats(values: number[]): OffsetStats | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return {
    mean: hundredth(mean(sorted)) as number,
    q1: hundredth(quantile(sorted, 0.25)) as number,
    q3: hundredth(quantile(sorted, 0.75)) as number,
    n: sorted.length,
  };
}

export function afterBigDays(days: HealthDay[], calorieTargets?: HealthCalorieTarget[], horizon = 3): AfterBigDays {
  const byDate = new Map(days.map((d) => [d.date, d]));
  const weightOn = (iso: string) => byDate.get(iso)?.weight ?? null;

  const lastDate = days.reduce((max, d) => (d.date > max ? d.date : max), '');
  // A day's weight against its own morning, through the mornings after it, until one was not weighed.
  const trace = (day: HealthDay & { weight: number }): number[] => {
    const changes = [0];
    for (let k = 1; k <= horizon; k++) {
      const w = weightOn(addDays(day.date, k));
      if (w === null) break;
      changes.push(tenth(w - day.weight));
    }
    return changes;
  };

  const traces: BigDayTrace[] = [];
  const everyPaths: number[][] = [];
  for (const day of days) {
    if (day.weight === null) continue;
    const changes = trace(day as HealthDay & { weight: number });
    if (changes.length > 1) everyPaths.push(changes);
    const target = calorieTargetFor(day.date, calorieTargets);
    if (!isBigDay(day.cals, target)) continue;
    const open = changes.length <= horizon && addDays(day.date, changes.length) > lastDate;
    traces.push({ date: day.date, cals: day.cals as number, target: target as number, changes, open });
  }

  const statsAt = (paths: number[][]) =>
    Array.from({ length: horizon + 1 }, (_, k) => offsetStats(paths.filter((p) => p.length > k).map((p) => p[k])));
  const everyDay = statsAt(everyPaths);

  const ends = traces.filter((t) => t.changes.length === horizon + 1).map((t) => t.changes[horizon]);
  return {
    horizon,
    traces,
    typical: everyDay.map((s) => (s ? s.mean : null)),
    everyDay,
    atHorizon: { avg: hundredth(mean(ends)), n: ends.length, below: ends.filter((v) => v < 0).length },
    offsets: statsAt(traces.map((t) => t.changes)),
  };
}

export interface WeekdayRow {
  day: Weekday;
  /** Recorded days falling on this weekday. */
  days: number;
  avgCals: number | null;
  /** Average of calories minus the target in force each day. Null with no target. */
  avgVsTarget: number | null;
  overTarget: number;
  /** Days with both calories and a target, the denominator for `overTarget`. */
  targeted: number;
  avgProtein: number | null;
  /** Days at or over the protein goal in force that day. Null when no day had a goal. */
  atProteinGoal: number | null;
  /** Days with both a protein reading and a goal, the denominator for `atProteinGoal`. */
  proteinScored: number;
  /** The morning's weight against the 7-day average centred on it, averaged. Null without a full window. */
  weighInVsTrend: number | null;
}

export interface WeekdayProfile {
  rows: WeekdayRow[];
  /** Complete Monday–Sunday weeks, every day with calories and a target: what the split is averaged over. */
  weeks: number;
  weekendVsTarget: number | null;
  weekendOverWeeks: number;
  midweekVsTarget: number | null;
  midweekUnderWeeks: number;
  /** How much heavier Sunday and Monday mornings read than Friday and Saturday, trend removed. */
  sunMonVsFriSat: number | null;
}

const WEEKEND: Weekday[] = ['Fri', 'Sat', 'Sun'];

export function weekdayProfile(
  days: HealthDay[],
  calorieTargets: HealthCalorieTarget[] | undefined,
  /** The protein goal, or the goal in force on a date: a raised goal must not rescore the days before it. */
  proteinGoal: number | null | ((date: string) => number | null),
): WeekdayProfile {
  const byDate = new Map(days.map((d) => [d.date, d]));
  const goalOn = typeof proteinGoal === 'function' ? proteinGoal : () => proteinGoal;

  // Against a centred average, so a block's steady drift does not tilt the weekdays.
  const trendGap = (day: HealthDay): number | null => {
    if (day.weight === null) return null;
    const window: number[] = [];
    for (let k = -3; k <= 3; k++) {
      const w = byDate.get(addDays(day.date, k))?.weight ?? null;
      if (w === null) return null;
      window.push(w);
    }
    return day.weight - (mean(window) as number);
  };

  const rows: WeekdayRow[] = WEEKDAYS.map((name) => {
    const these = days.filter((d) => weekdayOf(d.date) === name);
    const withCals = these.filter((d) => d.cals !== null);
    const scored = withCals
      .map((d) => ({ d, target: calorieTargetFor(d.date, calorieTargets) }))
      .filter((x): x is { d: HealthDay; target: number } => x.target !== null);
    const protein = these.map((d) => d.protein).filter((p): p is number => p !== null);
    const goaled = these
      .map((d) => ({ protein: d.protein, goal: goalOn(d.date) }))
      .filter((x): x is { protein: number; goal: number } => x.protein !== null && x.goal !== null);
    const gaps = these.map(trendGap).filter((g): g is number => g !== null);
    return {
      day: name,
      days: these.length,
      avgCals: whole(mean(withCals.map((d) => d.cals as number))),
      avgVsTarget: whole(mean(scored.map(({ d, target }) => (d.cals as number) - target))),
      overTarget: scored.filter(({ d, target }) => (d.cals as number) > target).length,
      targeted: scored.length,
      avgProtein: whole(mean(protein)),
      atProteinGoal: goaled.length === 0 ? null : goaled.filter((x) => x.protein >= x.goal).length,
      proteinScored: goaled.length,
      weighInVsTrend: hundredth(mean(gaps)),
    };
  });

  // Complete weeks only: a week cut off on Wednesday has no weekend to weigh against its weekdays.
  const weekend: number[] = [];
  const midweek: number[] = [];
  const mondays = days.filter((d) => weekdayOf(d.date) === 'Mon').map((d) => d.date);
  for (const monday of mondays) {
    let ends = 0;
    let mids = 0;
    let complete = true;
    for (let k = 0; k < 7 && complete; k++) {
      const iso = addDays(monday, k);
      const d = byDate.get(iso);
      const target = calorieTargetFor(iso, calorieTargets);
      if (!d || d.cals === null || target === null) {
        complete = false;
        break;
      }
      if (WEEKEND.includes(weekdayOf(iso))) ends += d.cals - target;
      else mids += d.cals - target;
    }
    if (complete) {
      weekend.push(ends);
      midweek.push(mids);
    }
  }

  const gapOf = (name: Weekday) => rows.find((r) => r.day === name)?.weighInVsTrend ?? null;
  const [sun, mon, fri, sat] = (['Sun', 'Mon', 'Fri', 'Sat'] as Weekday[]).map(gapOf);
  const sunMonVsFriSat =
    sun === null || mon === null || fri === null || sat === null ? null : hundredth((sun + mon) / 2 - (fri + sat) / 2);

  return {
    rows,
    weeks: weekend.length,
    weekendVsTarget: whole(mean(weekend)),
    weekendOverWeeks: weekend.filter((v) => v > 0).length,
    midweekVsTarget: whole(mean(midweek)),
    midweekUnderWeeks: midweek.filter((v) => v <= 0).length,
    sunMonVsFriSat,
  };
}

export interface CardioSide {
  avg: number | null;
  n: number;
  /** Average calories eaten on those days, so a drop can't be put down to eating less. */
  avgCals: number | null;
}

export interface CardioMornings {
  withCardio: CardioSide;
  without: CardioSide;
}

/**
 * Monday to Friday only: Sunday is a rest day with no cardio, and the weekend runs heavy for reasons of
 * its own (see `weekdayProfile`), which would load the "without" side.
 */
export function cardioMornings(days: HealthDay[]): CardioMornings {
  const byDate = new Map(days.map((d) => [d.date, d]));
  const sides = { withCardio: [] as HealthDay[], without: [] as HealthDay[] };
  const changes = new Map<HealthDay, number>();
  for (const day of days) {
    const weekday = weekdayOf(day.date);
    if (weekday === 'Sat' || weekday === 'Sun') continue;
    const next = byDate.get(addDays(day.date, 1));
    if (!next || day.weight === null || next.weight === null) continue;
    changes.set(day, next.weight - day.weight);
    (day.cardio ? sides.withCardio : sides.without).push(day);
  }
  const side = (list: HealthDay[]): CardioSide => ({
    avg: hundredth(mean(list.map((d) => changes.get(d) as number))),
    n: list.length,
    avgCals: whole(mean(list.map((d) => d.cals).filter((c): c is number => c !== null))),
  });
  return { withCardio: side(sides.withCardio), without: side(sides.without) };
}
