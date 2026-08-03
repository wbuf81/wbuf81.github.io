/**
 * Chart tokens for /health.
 *
 * The three series hues are categorical slots 1-3 of the validated default
 * palette, assigned in fixed order. Verified against the page surface with
 * the dataviz palette validator: worst adjacent CVD deltaE 9.2, normal-vision
 * 27.6, both clear of the gates. Aqua sits at 2.7:1 contrast, below 3:1, so
 * every chart using it ships a legend and the full day table as relief.
 */
export const SERIES = {
  blue: '#2a78d6',
  orange: '#eb6834',
  aqua: '#1baf7a',
} as const;

/** Surface color, used for the gaps that separate touching marks. */
export const SURFACE = '#ffffff';

export const GRID = '#e8e8e6';

export const TEXT_PRIMARY = '#1a1a1a';
export const TEXT_SECONDARY = '#52514e';
export const TEXT_MUTED = '#8a8985';

/** Raw daily readings sit behind the trend line, so they recede. */
export const MUTED_MARK = '#c2c1bd';

const AXIS_FONT = 12;

export const axisProps = {
  stroke: GRID,
  strokeWidth: 1,
  tick: { fill: TEXT_MUTED, fontSize: AXIS_FONT },
  tickLine: false,
} as const;

export const gridProps = {
  stroke: GRID,
  strokeWidth: 1,
  vertical: false,
} as const;

/**
 * Shared geometry for every chart with one mark per day: weight, steps, macros,
 * calories.
 *
 * These have to be identical across all of them, because the charts stack down
 * the page and a reader compares them column by column. Any difference in the
 * y-axis width or the horizontal margins moves a given day to a different x and
 * the days stop lining up. They were four different combinations before.
 *
 * The right margin is the gutter the reference-line labels sit in. Charts with
 * no such labels keep it anyway — reclaiming it would shift their plot area out
 * of step with the others.
 *
 * The consistency grid is deliberately not in this group: it is a CSS grid of
 * one week per row, not a 14-day axis, so there is no column to align to.
 */
export const DAILY_MARGIN = { top: 8, right: 64, bottom: 0, left: 4 } as const;

/** Wide enough for the longest y label across those four ("3,000", "211.0"). */
export const DAILY_Y_WIDTH = 56;

/**
 * A bar chart insets its marks by half a band; a line chart anchors its first
 * and last point on the plot edge. Without this the weight line sits half a day
 * out of step with the bars below it. A band scale gives the line the same
 * inset, and unlike a fixed pixel padding it stays correct as weeks accumulate
 * and the band narrows.
 */
export const DAILY_X_BAND = { scale: 'band' } as const;

/**
 * Entry animation is off everywhere. The data is static and the page is read at
 * a glance; an animating chart is empty for its first second, which reads as "no
 * data" rather than "loading".
 */
export const ANIMATE = false;

/**
 * A zero-based axis topped out at a clean multiple, with ticks on that step.
 * Recharts' own tick picker lands on values like 4,500 — legible as a number but
 * not as a scale.
 */
export function cleanAxis(max: number, step: number): { domain: [number, number]; ticks: number[] } {
  const top = Math.max(Math.ceil(max / step) * step, step);
  const ticks: number[] = [];
  for (let value = 0; value <= top; value += step) ticks.push(value);
  return { domain: [0, top], ticks };
}

export function formatNumber(value: number, digits = 0): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

/** Signed, for deltas where direction is the point. */
export function formatDelta(value: number, digits = 1): string {
  const sign = value > 0 ? '+' : value < 0 ? '−' : '';
  return `${sign}${formatNumber(Math.abs(value), digits)}`;
}
