/**
 * How far back the Trends page looks, and the pieces every Trends chart shares: which block each day falls in,
 * the weeks a range holds, a block's planned pace. Pure and client-safe (no lib/health import: that reads files).
 * The logic is the mockup's (docs/design/health-trends-2026-11-16/mockup.html › rangeOf, spansOf, planAt).
 */
import type { HealthDay, PhaseSummary, PhaseType, WeeklyTrendRow } from '@/types/health';

export type TrendRangeKey = 'w8' | 'block' | 'all';

/** A range of recorded days: `days` is the slice drawn, `from` its first day's index in the whole log. */
export interface TrendRange {
  key: TrendRangeKey;
  days: HealthDay[];
  from: number;
}

/** "8 weeks" is the last 56 recorded days. */
export const W8_DAYS = 56;

export const RANGE_LABELS: Record<TrendRangeKey, string> = { w8: '8 weeks', block: 'This block', all: 'Everything' };

/** The block a date falls in, the newest first, or null outside every block. */
export function blockOn(phases: PhaseSummary[], date: string): PhaseSummary | null {
  for (let i = phases.length - 1; i >= 0; i--) {
    const p = phases[i];
    if (p.start <= date && (p.end === null || date <= p.end)) return p;
  }
  return null;
}

/** The ranges on offer: "This block" only when the newest day falls in one. */
export function rangeKeys(days: HealthDay[], phases: PhaseSummary[]): TrendRangeKey[] {
  const newest = days[days.length - 1];
  return newest && blockOn(phases, newest.date) ? ['w8', 'block', 'all'] : ['w8', 'all'];
}

/** The days a range covers. "This block" starts at the first day of the block the newest day falls in. */
export function trendRange(days: HealthDay[], key: TrendRangeKey, phases: PhaseSummary[]): TrendRange {
  let from = 0;
  if (key === 'w8') from = Math.max(0, days.length - W8_DAYS);
  if (key === 'block' && days.length) {
    const block = blockOn(phases, days[days.length - 1].date);
    if (block) from = Math.max(0, days.findIndex((d) => d.date >= block.start));
  }
  return { key, days: days.slice(from), from };
}

/** A block's stretch of a range: `a` and `z` are its first and last day's index in the range. */
export interface BlockSpan {
  phase: PhaseSummary;
  /** Its place in the list of blocks: alternate blocks are tinted. */
  index: number;
  a: number;
  z: number;
}

export function blockSpans(ds: HealthDay[], phases: PhaseSummary[]): BlockSpan[] {
  const out: BlockSpan[] = [];
  phases.forEach((phase, index) => {
    let a = -1;
    let z = -1;
    ds.forEach((d, i) => {
      if (blockOn(phases, d.date) === phase) {
        if (a < 0) a = i;
        z = i;
      }
    });
    if (a >= 0) out.push({ phase, index, a, z });
  });
  return out;
}

/** A week in a range: `mid` is the middle of its days in the range, as a fractional day index. */
export interface WeekPoint {
  row: WeeklyTrendRow;
  mid: number;
  /** Its days inside the range. */
  count: number;
}

/** A week belongs to a range when at least four of its days do. */
export const MIN_WEEK_DAYS = 4;

export function weekPoints(ds: HealthDay[], rows: WeeklyTrendRow[]): WeekPoint[] {
  const out: WeekPoint[] = [];
  for (const row of rows) {
    const idx: number[] = [];
    ds.forEach((d, i) => {
      if (d.date >= row.weekStart && d.date <= row.weekEnd) idx.push(i);
    });
    if (idx.length >= MIN_WEEK_DAYS) out.push({ row, mid: idx.reduce((s, i) => s + i, 0) / idx.length, count: idx.length });
  }
  return out;
}

export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 864e5);
}

export function addDays(date: string, n: number): string {
  const t = new Date(`${date}T12:00:00Z`);
  t.setUTCDate(t.getUTCDate() + n);
  return t.toISOString().slice(0, 10);
}

/** Where a block's planned pace puts it on a date: from its first weigh-in, `ratePerWeek` a week. Null without a plan. */
export function planAt(phase: PhaseSummary, date: string): number | null {
  if (!phase.ratePerWeek || phase.startWeight === null) return null;
  return phase.startWeight + (phase.ratePerWeek * daysBetween(phase.start, date)) / 7;
}

/** Which way a block wants the scale to move: up on a bulk, down on a cut, nowhere in particular on maintenance. */
export function blockDirection(type: PhaseType | null | undefined): -1 | 0 | 1 {
  return type === 'bulk' ? 1 : type === 'cut' ? -1 : 0;
}

/** "since Oct 26" for a running block, "Jul 20 – Oct 25" for a closed one. */
export function blockDates(phase: PhaseSummary): string {
  return phase.isOngoing || !phase.endLabel ? `since ${phase.startLabel}` : `${phase.startLabel} – ${phase.endLabel}`;
}

/** The mockup's steps: the smallest that splits a range into at most `most` intervals. */
export function stepFor(range: number, most: number, steps = [0.5, 1, 2, 5, 10, 20]): number {
  return steps.find((s) => range / s <= most) ?? 50;
}
