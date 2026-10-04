/** Number and date formatting shared by the /health components. */

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
