import type { HealthDatedTargets, HealthDay, PhaseSummary, WeeklyTrendRow } from '@/types/health';
import { targetsFor } from './targets.ts';

/**
 * The sums behind the road to the goal (This week), the daily goals and the running totals (Habits): spec
 * docs/superpowers/specs/2026-11-26-health-patterns-and-ideas-design.md, cards 4 and 5 and change 5.
 *
 * Pure and client-safe, like `healthPatterns.ts`: no `lib/health.ts` (it reads files), type-only `@/` imports and an
 * extension-explicit relative import, so plain Node can load it. Blocks come in as the `PhaseSummary`s the lead card
 * already reads, so a rate or a weight here is the lead card's own and the two cannot disagree.
 */

function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string): number {
  const t = (iso: string) => {
    const [y, m, d] = iso.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((t(b) - t(a)) / 86_400_000);
}

function weekdayOf(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

const sorted = (days: HealthDay[]) => [...days].sort((a, b) => a.date.localeCompare(b.date));
const sum = (values: number[]) => values.reduce((s, v) => s + v, 0);

/**
 * The trailing window the lead card's "Recent pace" is fitted over: `RECENT_WINDOW_DAYS` in lib/health.ts. Only the
 * road card's caption reads it here ("fitted to the weigh-ins since Nov 2"); the rate itself comes from the block.
 */
export const RECENT_DAYS = 21;

/* ── 4. The road to the goal ──────────────────────────────────────────────────────────────────────────────────── */

export type PaceKey = 'recent' | 'block' | 'plan';

export interface Pace {
  key: PaceKey;
  /** Pounds a week, signed. */
  rate: number;
  /** The day the line meets the goal: the newest weigh-in plus pounds to go over the rate, in whole days. */
  date: string;
  /** The day it passes the previous block's first weekly average, when that lies on the way. */
  passDate: string | null;
}

export interface Road {
  block: PhaseSummary;
  goal: number;
  /** +1 when the goal is above the newest week's average, −1 when it is below. */
  direction: 1 | -1;
  /** The newest week's average (the lead card's "Now") and the block's last weigh-in, where every line starts. */
  now: number;
  nowDate: string;
  /** The block's first weigh-in: where its whole-block pace counts from. */
  start: { weight: number; date: string };
  /** The block's days with a weigh-in, and its weeks with an average, oldest first: the chart's left side. */
  weighIns: { date: string; weight: number }[];
  weeks: WeeklyTrendRow[];
  /** The paces that reach the goal, soonest first. A pace pointing away from it, or at zero, is left out. */
  paces: Pace[];
  /** The block before this one, and its first weekly average when it lies between now and the goal. */
  previous: { block: PhaseSummary; weight: number; week: WeeklyTrendRow } | null;
  /** The first weigh-in of the recent window, when there is a recent pace. */
  recentFrom: string | null;
}

/**
 * From the newest week's average, at the block's last weigh-in, a straight line to the goal at each pace the block
 * has: the last three weeks, the whole block and the plan. The arrival is the same sum the lead card's "On pace for"
 * uses, so the recent line lands on its date. Null unless the block is still running, has a goal, and at least one
 * pace reaches it.
 */
export function roadToGoal(days: HealthDay[], rows: WeeklyTrendRow[], phases: PhaseSummary[], lead: PhaseSummary | null): Road | null {
  if (!lead || !lead.isOngoing || lead.goalWeight === null || lead.currentWeight === null || lead.startWeight === null) return null;
  const goal = lead.goalWeight;
  const now = lead.currentWeight;
  const gap = goal - now;
  if (gap === 0) return null;
  const direction = gap > 0 ? 1 : -1;

  const weighIns = sorted(days)
    .filter((d) => d.date >= lead.start && d.weight !== null)
    .map((d) => ({ date: d.date, weight: d.weight as number }));
  if (!weighIns.length) return null;
  const nowDate = weighIns[weighIns.length - 1].date;

  const at = (target: number, rate: number) => addDays(nowDate, Math.round(((target - now) / rate) * 7));
  const reaches = (rate: number | null): rate is number => rate !== null && rate !== 0 && Math.sign(rate) === direction;

  const idx = phases.findIndex((p) => p.start === lead.start);
  const before = idx > 0 ? phases[idx - 1] : null;
  const firstWeek = before ? rows.find((r) => r.phase?.start === before.start && r.avgWeight !== null) : undefined;
  // On the way: past where the scale is now, short of the goal.
  const onWay = firstWeek && ((firstWeek.avgWeight as number) - now) * direction > 0 && (goal - (firstWeek.avgWeight as number)) * direction > 0;
  const previous = before && firstWeek && onWay ? { block: before, weight: firstWeek.avgWeight as number, week: firstWeek } : null;

  const candidates: [PaceKey, number | null][] = [
    ['recent', lead.recentChangePerWeek],
    ['block', lead.weightChangePerWeek],
    ['plan', lead.ratePerWeek],
  ];
  const paces: Pace[] = candidates
    .filter((c): c is [PaceKey, number] => reaches(c[1]))
    .map(([key, rate]) => ({ key, rate, date: at(goal, rate), passDate: previous ? at(previous.weight, rate) : null }))
    .sort((a, b) => a.date.localeCompare(b.date));
  if (!paces.length) return null;

  const windowStart = addDays(nowDate, -(RECENT_DAYS - 1));
  const recentFrom = lead.recentChangePerWeek !== null ? (weighIns.find((w) => w.date >= windowStart)?.date ?? null) : null;

  return {
    block: lead,
    goal,
    direction,
    now,
    nowDate,
    start: { weight: weighIns[0].weight, date: weighIns[0].date },
    weighIns,
    weeks: rows.filter((r) => r.phase?.start === lead.start && r.avgWeight !== null),
    paces,
    previous,
    recentFrom,
  };
}

export interface WeekOnWeek {
  /** The average of the block's weekly changes, pounds a week. */
  avg: number;
  /** How many weekly changes it averages. */
  n: number;
  /**
   * The last week before the block with an average: the block's first change is measured from it, so the weekly
   * changes add up to the newest week against this one. Null when the block's first week has no week before it.
   */
  from: WeeklyTrendRow | null;
}

/**
 * Week on week: the average of the weekly changes of the block's weeks, the figure on Trends › Pounds per week. Its
 * first week is measured against the week before the block, which is why it differs from the whole-block pace, which
 * counts from the block's first weigh-in.
 */
export function weekOnWeek(rows: WeeklyTrendRow[], lead: PhaseSummary | null): WeekOnWeek | null {
  if (!lead) return null;
  const mine = rows.filter((r) => r.phase?.start === lead.start);
  const changes = mine.filter((r) => r.weightChange !== null).map((r) => r.weightChange as number);
  if (!changes.length) return null;
  const first = rows.indexOf(mine[0]);
  const prior = first > 0 ? rows[first - 1] : null;
  return { avg: sum(changes) / changes.length, n: changes.length, from: prior && prior.avgWeight !== null && mine[0].weightChange !== null ? prior : null };
}

/* ── Daily goals ─────────────────────────────────────────────────────────────────────────────────────────────── */

export interface GoalDays {
  met: number;
  /** Days with a reading and a goal in force. */
  scored: number;
}

/** Days the protein goal was met, each day against the goal in force that day, so raising it never rescores the past. */
export function proteinGoalDays(days: HealthDay[], targets: HealthDatedTargets[] | undefined): GoalDays {
  let met = 0;
  let scored = 0;
  for (const d of days) {
    const goal = targetsFor(d.date, targets)?.proteinGoal ?? null;
    if (d.protein === null || goal === null) continue;
    scored++;
    if (d.protein >= goal) met++;
  }
  return { met, scored };
}

/* ── 5. So far ───────────────────────────────────────────────────────────────────────────────────────────────── */

export const STEP_UNIT = 1_000_000;
export const LIFT_UNIT = 25;
/** Cardio is counted to the next ten hours, in minutes. */
export const CARDIO_UNIT = 600;
/** The miles figure is an assumption, not a measurement, and the caption says so. */
export const STEPS_PER_MILE = 2100;
export const GRAMS_PER_LB = 453.59237;
/** The lifting days are the weekdays lifted on in at least half of this many newest complete weeks. */
export const LIFT_WEEKS = 4;

/** The round number after `n`: on a round number exactly, the next one. */
export function nextRound(n: number, unit: number): number {
  return (Math.floor(n / unit) + 1) * unit;
}

export interface SoFar {
  first: string;
  last: string;
  recorded: number;
  steps: { total: number; prev: number; next: number; perDay: number | null; due: string | null; miles: number };
  lifts: { total: number; prev: number; next: number; weekdays: number[]; due: string | null };
  cardio: { sessions: number; minutes: number; prev: number; next: number; perWeek: number; weeks: number | null };
  weighIns: number;
  cals: { total: number; days: number };
  protein: { grams: number; days: number };
}

/**
 * Running totals since the first recorded day, each with the next round number and when it falls: steps at the block's
 * average a day (all time with no block), lifts on the weekdays the newest complete weeks lifted on, cardio at the
 * last three weeks' minutes a week. Null with no days.
 */
export function soFar(days: HealthDay[], lead: PhaseSummary | null): SoFar | null {
  if (!days.length) return null;
  const ds = sorted(days);
  const first = ds[0].date;
  const last = ds[ds.length - 1].date;
  const nums = (k: 'steps' | 'cals' | 'protein') => ds.map((d) => d[k]).filter((v): v is number => v !== null);

  const stepsAll = nums('steps');
  const total = sum(stepsAll);
  const next = nextRound(total, STEP_UNIT);
  const perDay = lead?.avgSteps ?? (stepsAll.length ? total / stepsAll.length : null);
  const due = perDay ? addDays(last, Math.ceil((next - total) / perDay)) : null;

  const lifted = (d: HealthDay) => d.workout.trim() !== '';
  const lifts = ds.filter(lifted).length;
  const liftNext = nextRound(lifts, LIFT_UNIT);
  // The newest complete Monday-to-Sunday weeks, and the weekdays lifted on in at least half of them.
  const byWeek = new Map<string, HealthDay[]>();
  for (const d of ds) {
    const mon = addDays(d.date, -((weekdayOf(d.date) + 6) % 7));
    if (!byWeek.has(mon)) byWeek.set(mon, []);
    (byWeek.get(mon) as HealthDay[]).push(d);
  }
  const complete = [...byWeek.values()].filter((w) => w.length === 7).slice(-LIFT_WEEKS);
  const weekdays = [0, 1, 2, 3, 4, 5, 6].filter(
    (k) => complete.length > 0 && complete.filter((w) => w.some((d) => weekdayOf(d.date) === k && lifted(d))).length >= complete.length / 2,
  );
  let liftDue: string | null = null;
  if (weekdays.length) {
    let n = lifts;
    let d = last;
    while (n < liftNext) {
      d = addDays(d, 1);
      if (weekdays.includes(weekdayOf(d))) n++;
    }
    liftDue = d;
  }

  const cardioDays = ds.filter((d) => d.cardio);
  const minutes = sum(cardioDays.map((d) => d.cardioMinutes ?? 0));
  const cardioNext = nextRound(minutes, CARDIO_UNIT);
  const windowStart = addDays(last, -(RECENT_DAYS - 1));
  const perWeek = (sum(cardioDays.filter((d) => d.date >= windowStart).map((d) => d.cardioMinutes ?? 0)) / RECENT_DAYS) * 7;

  const cals = nums('cals');
  const protein = nums('protein');
  return {
    first,
    last,
    recorded: ds.length,
    steps: { total, prev: next - STEP_UNIT, next, perDay, due, miles: total / STEPS_PER_MILE },
    lifts: { total: lifts, prev: liftNext - LIFT_UNIT, next: liftNext, weekdays, due: liftDue },
    cardio: {
      sessions: cardioDays.length,
      minutes,
      prev: cardioNext - CARDIO_UNIT,
      next: cardioNext,
      perWeek,
      weeks: perWeek > 0 ? (cardioNext - minutes) / perWeek : null,
    },
    weighIns: ds.filter((d) => d.weight !== null).length,
    cals: { total: sum(cals), days: cals.length },
    protein: { grams: sum(protein), days: protein.length },
  };
}

/** Whole days between two ISO dates; exported for the components' captions. */
export { daysBetween };
