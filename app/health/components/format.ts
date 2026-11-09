/** Number and date formatting shared by the /health components. */
import type { PhaseType } from '@/types/health';
import { calorieLight } from '@/lib/healthCalendar';

export function formatNumber(value: number, digits = 0): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

/**
 * Signed, for deltas where direction is the point. Rounds first, so a value that rounds to zero prints
 * unsigned ("0.0") rather than as "−0.0".
 */
export function formatDelta(value: number, digits = 1): string {
  const rounded = Number(value.toFixed(digits));
  const sign = rounded > 0 ? '+' : rounded < 0 ? '−' : '';
  return `${sign}${formatNumber(Math.abs(rounded), digits)}`;
}

/**
 * A class for a change where down is the good direction (weight on a cut, calories against a target):
 * nothing for no change, good for down, over for up.
 */
export function downIsGood(value: number | null, digits = 1): string {
  if (value === null) return '';
  const rounded = Number(value.toFixed(digits));
  return rounded < 0 ? 'is-good' : rounded > 0 ? 'is-over' : '';
}

/**
 * A weight change, coloured by the block it happened in (Wes alternates cuts and bulks): down is good on a cut, up
 * on a bulk, and maintenance is neutral. Outside any block it keeps the tracker's first reading, down is good.
 */
export function weightTone(change: number | null, block: PhaseType | null, digits = 1): string {
  if (block === 'bulk') return downIsGood(change === null ? null : -change, digits);
  if (block === 'maintain') return '';
  return downIsGood(change, digits);
}

/**
 * Average calories against the target, coloured by the block, on the calendar's rule (lib/healthCalendar.ts): a cut
 * wants them at or under the target, so over is the worse direction; a bulk or maintenance wants them near it, so
 * within 5% is good, more than 10% off either way the worse, and between says nothing.
 */
export function calsTone(vsGoal: number | null, avgCals: number | null, block: PhaseType | null): string {
  if (vsGoal === null) return '';
  if ((block === 'bulk' || block === 'maintain') && avgCals !== null) {
    const light = calorieLight(avgCals, avgCals - vsGoal, block);
    return light === 'hit' ? 'is-good' : light === 'miss' ? 'is-over' : '';
  }
  return downIsGood(vsGoal, 0);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function utc(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/** "2026-09-27" → "Sep 27" */
export function shortDate(iso: string): string {
  const date = utc(iso);
  return `${MONTHS[date.getUTCMonth()]} ${date.getUTCDate()}`;
}

/** "2026-09-27" → "Sun Sep 27" */
export function dayDate(iso: string): string {
  return `${WEEKDAYS[utc(iso).getUTCDay()]} ${shortDate(iso)}`;
}

/** "N day" or "N days". */
export function plural(n: number, word: string): string {
  return `${formatNumber(n)} ${word}${n === 1 ? '' : 's'}`;
}
