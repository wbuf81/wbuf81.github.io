import type { HealthCalorieTarget, HealthDay, PhaseSummary, PhaseType, WeeklyTrendRow } from '@/types/health';
import { calorieTargetFor } from './calorieTarget.ts';

/**
 * The sums behind three cards on /health › Patterns (spec docs/superpowers/specs/2026-11-26-health-patterns-and-ideas-
 * design.md, cards 1 to 3): the same weight on the way down and on the way back, a week's calories against what the
 * scale did, and how far one morning moves.
 *
 * Pure and client-safe, like `healthInsights.ts`: no `lib/health.ts` (it reads files), type-only `@/` imports and an
 * extension-explicit relative import, so plain Node can load it. Weeks come in as `WeeklyTrendRow`s and blocks as
 * `PhaseSummary`s, already built by `lib/health.ts`, so nothing here re-derives them.
 */

function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

function mean(values: number[]): number | null {
  return values.length ? values.reduce((s, v) => s + v, 0) / values.length : null;
}

/** Weights are recorded to a tenth, so a difference of two is too; this drops floating-point noise. */
const tenth = (v: number) => Math.round(v * 10) / 10;

/** Which way a block wants the scale to move: up on a bulk, down on a cut, nowhere in particular on maintenance. */
export function directionOf(type: PhaseType | null | undefined): -1 | 0 | 1 {
  return type === 'bulk' ? 1 : type === 'cut' ? -1 : 0;
}

/** Least squares, y = slope × x + intercept. Null under three points or with no spread across. */
export function leastSquares(xs: number[], ys: number[]): { slope: number; intercept: number } | null {
  if (xs.length < 3 || xs.length !== ys.length) return null;
  const mx = mean(xs) as number;
  const my = mean(ys) as number;
  let sxx = 0;
  let sxy = 0;
  xs.forEach((x, i) => {
    sxx += (x - mx) ** 2;
    sxy += (x - mx) * (ys[i] - my);
  });
  if (sxx === 0) return null;
  const slope = sxy / sxx;
  return { slope, intercept: my - slope * mx };
}

/* ── 1. The same weight, twice ─────────────────────────────────────────────────────────────────────────────────── */

/** Two weeks are the same weight when their averages are this close, in pounds. */
export const RUNG_GAP = 0.5;
/** "Still ahead" names at most this many of the older block's weeks. */
export const AHEAD_MAX = 2;

/** A complete week of the newer block and the week of the older block nearest it in average weight. */
export interface Rung {
  older: WeeklyTrendRow;
  newer: WeeklyTrendRow;
  /** Newer week's average weight minus the older's. */
  gap: number;
  /** Rounded calories a day, newer minus older, as the table prints them. */
  dCals: number | null;
  dSteps: number | null;
}

export interface SameWeight {
  older: PhaseSummary;
  newer: PhaseSummary;
  /** The weeks of each block with an average weight, oldest first: what the chart draws. */
  weeks: WeeklyTrendRow[];
  /** Highest weight first. */
  rungs: Rung[];
  /** The rung whose newer week is the newest: the fact cells' "then and now". */
  newest: Rung;
  /** Grams a day at the newest rung, newer minus older, each rounded first. Null where either week has none. */
  macros: { protein: number | null; carbs: number | null; fat: number | null };
  /**
   * The newer block's way of travel, +1 up, −1 down, 0 neither: a bulk climbs, a cut falls; with a maintenance block
   * it is the reverse of the older block's.
   */
  direction: -1 | 0 | 1;
  /** The older block's weeks beyond the newest rung in the direction of travel, nearest first, at most two. */
  ahead: WeeklyTrendRow[];
  /** True when the weeks still ahead are the ones the older block began with. */
  aheadBeganWith: boolean;
}

const roundedDiff = (a: number | null, b: number | null) => (a === null || b === null ? null : Math.round(a) - Math.round(b));

/**
 * The block the newest data falls in (`lead`) against the block before it. For each complete week of the newer block,
 * the week of the older block nearest it in average weight, if within `RUNG_GAP`; an older week is used once, so the
 * closest pairs are taken first. Null without two blocks or without a rung.
 */
export function sameWeightTwice(rows: WeeklyTrendRow[], phases: PhaseSummary[], lead: PhaseSummary | null): SameWeight | null {
  if (!lead) return null;
  const at = phases.findIndex((p) => p.start === lead.start);
  if (at < 1) return null;
  const newer = phases[at];
  const older = phases[at - 1];
  const of = (p: PhaseSummary) => rows.filter((r) => r.phase?.start === p.start && r.avgWeight !== null);
  const olderWeeks = of(older);
  const newerWeeks = of(newer);

  const candidates: Rung[] = [];
  for (const n of newerWeeks) {
    if (n.isPartial) continue;
    for (const o of olderWeeks) {
      if (o.isPartial) continue;
      const gap = (n.avgWeight as number) - (o.avgWeight as number);
      if (Math.abs(gap) <= RUNG_GAP + 1e-9) {
        candidates.push({ older: o, newer: n, gap, dCals: roundedDiff(n.avgCals, o.avgCals), dSteps: roundedDiff(n.avgSteps, o.avgSteps) });
      }
    }
  }
  candidates.sort((a, b) => Math.abs(a.gap) - Math.abs(b.gap) || a.newer.weekStart.localeCompare(b.newer.weekStart) || a.older.weekStart.localeCompare(b.older.weekStart));
  const usedOlder = new Set<string>();
  const usedNewer = new Set<string>();
  const rungs: Rung[] = [];
  for (const c of candidates) {
    if (usedOlder.has(c.older.weekStart) || usedNewer.has(c.newer.weekStart)) continue;
    usedOlder.add(c.older.weekStart);
    usedNewer.add(c.newer.weekStart);
    rungs.push(c);
  }
  if (!rungs.length) return null;
  rungs.sort((a, b) => (b.newer.avgWeight as number) - (a.newer.avgWeight as number) || b.newer.weekStart.localeCompare(a.newer.weekStart));
  const newest = rungs.reduce((a, b) => (b.newer.weekStart > a.newer.weekStart ? b : a));

  const direction = directionOf(newer.type) || ((-directionOf(older.type)) as -1 | 0 | 1);
  // Beyond both ends of the newest rung, so its own older week is never "still ahead".
  const ends = [newest.newer.avgWeight as number, newest.older.avgWeight as number];
  const from = direction > 0 ? Math.max(...ends) : Math.min(...ends);
  const ahead = direction
    ? olderWeeks
        .filter((w) => !w.isPartial && ((w.avgWeight as number) - from) * direction > 0)
        .sort((a, b) => Math.abs((a.avgWeight as number) - from) - Math.abs((b.avgWeight as number) - from))
        .slice(0, AHEAD_MAX)
    : [];
  // Ahead in the direction of travel is usually where the older block started: its first weeks.
  const firsts = olderWeeks.slice(0, ahead.length).map((w) => w.weekStart);
  const aheadBeganWith = ahead.length > 0 && ahead.every((w) => firsts.includes(w.weekStart));

  return {
    older,
    newer,
    weeks: [...olderWeeks, ...newerWeeks],
    rungs,
    newest,
    macros: {
      protein: roundedDiff(newest.newer.avgProtein, newest.older.avgProtein),
      carbs: roundedDiff(newest.newer.avgCarbs, newest.older.avgCarbs),
      fat: roundedDiff(newest.newer.avgFat, newest.older.avgFat),
    },
    direction,
    ahead,
    aheadBeganWith,
  };
}

/* ── 2. A week's calories and what the scale did ──────────────────────────────────────────────────────────────── */

/** Fewer weeks than this and the line through them says little. */
export const MIN_SCALE_WEEKS = 8;

export interface ScaleWeek {
  row: WeeklyTrendRow;
  /** The week's average calories a day. */
  cals: number;
  /** The week's average weight against the week before's. */
  change: number;
  /** In the block the newest data falls in: drawn filled, the others hollow. */
  inLead: boolean;
}

export interface CaloriesAndScale {
  weeks: ScaleWeek[];
  /** change = slope × cals + intercept, in pounds a week per kcal a day. */
  fit: { slope: number; intercept: number };
  /** The slope for 100 kcal a day more. */
  per100: number;
  /** Where the line crosses zero, in kcal a day. Null unless more food means more weight (a positive slope). */
  holdsAt: number | null;
  /** The newest block's planned pace in pounds a week, or null. */
  plan: number | null;
  /** Where the line reaches the planned pace. Null without a plan or a positive slope. */
  planAt: number | null;
  /** The calorie target in force on the newest recorded day. */
  target: number | null;
  /** The newest week drawn, and what the line says for its calories. */
  last: ScaleWeek;
  lastPredicted: number;
}

/**
 * One point per complete week from the second on: across, the week's average calories a day; up or down, its average
 * weight against the week before. A week whose week before was not recorded is left out, so a gap never reads as one
 * week's change. Null under `MIN_SCALE_WEEKS` points or with no spread in calories.
 */
export function caloriesAndScale(
  rows: WeeklyTrendRow[],
  lead: PhaseSummary | null,
  calorieTargets: HealthCalorieTarget[] | undefined,
  newestDate: string | null,
): CaloriesAndScale | null {
  const weeks: ScaleWeek[] = [];
  rows.forEach((row, i) => {
    const prev = rows[i - 1];
    if (!prev || row.isPartial || row.avgCals === null || row.weightChange === null) return;
    if (prev.weekStart !== addDays(row.weekStart, -7)) return;
    weeks.push({ row, cals: row.avgCals, change: row.weightChange, inLead: !!lead && row.phase?.start === lead.start });
  });
  if (weeks.length < MIN_SCALE_WEEKS) return null;
  const fit = leastSquares(
    weeks.map((w) => w.cals),
    weeks.map((w) => w.change),
  );
  if (!fit) return null;
  const at = (y: number) => (fit.slope > 0 ? (y - fit.intercept) / fit.slope : null);
  const plan = lead?.ratePerWeek ?? null;
  const last = weeks[weeks.length - 1];
  return {
    weeks,
    fit,
    per100: fit.slope * 100,
    holdsAt: at(0),
    plan,
    planAt: plan === null ? null : at(plan),
    target: newestDate ? calorieTargetFor(newestDate, calorieTargets) : null,
    last,
    lastPredicted: fit.intercept + fit.slope * last.cals,
  };
}

/* ── 3. How far one morning moves ─────────────────────────────────────────────────────────────────────────────── */

/** Fewer mornings than this and a middle and a nine-in-ten span are a handful of days. */
export const MIN_MORNINGS = 14;
/** A jump is a rise of this much or more overnight. */
export const JUMP = 1.5;
/** "Two mornings after a jump" waits for this many earlier jumps with a reading two days on. */
export const MIN_JUMPS = 5;
/** The newest morning's rank is named when it is among this many of the biggest rises or drops. */
export const TOP_RANK = 5;
/** Mornings are stacked in columns this many pounds wide. */
export const BIN = 0.2;

export interface Morning {
  date: string;
  /** This morning's weight minus the morning before's, to a tenth. */
  change: number;
  /** Its column: the change to the nearest 0.2, halves rounded away from zero so both sides are binned alike. */
  bin: number;
  prev: number;
  weight: number;
}

export interface MorningMoves {
  mornings: Morning[];
  /** The middle absolute change. */
  median: number;
  /** The smallest tenth of a pound that holds nine mornings in ten, either way, and how many it holds. */
  within: number;
  withinCount: number;
  newest: Morning;
  /** The newest morning's place among rises (or drops) when it is in the top five; the bigger ones, biggest first. */
  rank: { n: number; dir: 'rise' | 'drop'; bigger: Morning[]; tied: boolean } | null;
  /** Two mornings after an earlier jump: the jumps' average, and what was left against the morning before each. */
  jumps: { n: number; avgJump: number; avgLeft: number } | null;
  /** The columns, from the biggest drop to the biggest rise, each with its mornings oldest first. */
  bins: { bin: number; mornings: Morning[] }[];
  /** The tallest column. */
  maxBin: number;
}

export function binOf(change: number): number {
  const t = Math.round(Math.abs(change) * 10);
  return tenth(Math.sign(change) * Math.round(t / 2 + 1e-9) * BIN);
}

/** The q-quantile of sorted values, interpolated. */
function quantile(sorted: number[], q: number): number {
  const i = (sorted.length - 1) * q;
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo);
}

/**
 * Every pair of consecutive calendar days both weighed, as the change overnight. A gap is never bridged: two days of
 * change read as one morning would overstate it. Null under `MIN_MORNINGS`.
 */
export function morningMoves(days: HealthDay[]): MorningMoves | null {
  const byDate = new Map(days.map((d) => [d.date, d]));
  const mornings: Morning[] = [];
  for (const d of [...days].sort((a, b) => a.date.localeCompare(b.date))) {
    const prev = byDate.get(addDays(d.date, -1));
    if (d.weight === null || !prev || prev.weight === null) continue;
    const change = tenth(d.weight - prev.weight);
    mornings.push({ date: d.date, change, bin: binOf(change), prev: prev.weight, weight: d.weight });
  }
  if (mornings.length < MIN_MORNINGS) return null;

  const abs = mornings.map((m) => Math.abs(m.change)).sort((a, b) => a - b);
  const median = quantile(abs, 0.5);
  let within = abs[abs.length - 1];
  for (let t = 0; t <= within; t = tenth(t + 0.1)) {
    if (abs.filter((a) => a <= t + 1e-9).length >= 0.9 * abs.length) {
      within = t;
      break;
    }
  }
  const withinCount = abs.filter((a) => a <= within + 1e-9).length;

  const newest = mornings[mornings.length - 1];
  let rank: MorningMoves['rank'] = null;
  if (newest.change !== 0) {
    const dir = newest.change > 0 ? 'rise' : 'drop';
    const s = Math.sign(newest.change);
    const others = mornings.filter((m) => m !== newest);
    const bigger = others.filter((m) => m.change * s > newest.change * s).sort((a, b) => (b.change - a.change) * s || a.date.localeCompare(b.date));
    const n = bigger.length + 1;
    if (n <= TOP_RANK) rank = { n, dir, bigger, tied: others.some((m) => m.change === newest.change) };
  }

  const earlier = mornings.filter((m) => m !== newest && m.change >= JUMP - 1e-9);
  const traced = earlier
    .map((m) => {
      const two = byDate.get(addDays(m.date, 2));
      return two && two.weight !== null ? { jump: m.change, left: two.weight - m.prev } : null;
    })
    .filter((t): t is { jump: number; left: number } => t !== null);
  const jumps =
    traced.length >= MIN_JUMPS
      ? { n: traced.length, avgJump: mean(traced.map((t) => t.jump)) as number, avgLeft: mean(traced.map((t) => t.left)) as number }
      : null;

  const map = new Map<number, Morning[]>();
  for (const m of mornings) {
    if (!map.has(m.bin)) map.set(m.bin, []);
    (map.get(m.bin) as Morning[]).push(m);
  }
  const bins = [...map.entries()].sort((a, b) => a[0] - b[0]).map(([bin, ms]) => ({ bin, mornings: ms }));

  return {
    mornings,
    median,
    within,
    withinCount,
    newest,
    rank,
    jumps,
    bins,
    maxBin: Math.max(...bins.map((b) => b.mornings.length)),
  };
}
