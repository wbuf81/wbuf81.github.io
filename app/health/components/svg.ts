/**
 * Geometry for the /health charts. They are hand-drawn SVG rather than a chart library so every mark can
 * take its colour from a token class (and so follow dark mode), and so labels can be HTML laid over the
 * plot: an SVG stretched to its box would stretch its text with it.
 *
 * Each chart draws in a viewBox `w` units wide and `h` high, positioned by a Frame's margins; labels are
 * placed in percentages of that box.
 */

export interface Frame {
  w: number;
  h: number;
  l: number;
  r: number;
  t: number;
  b: number;
}

const f1 = (v: number) => v.toFixed(1);

/** A position as a percentage of a length, for an HTML label over the plot. */
export function pct(v: number, total: number): string {
  return `${((v / total) * 100).toFixed(3)}%`;
}

/** n equal bands across the plot; x(i) is the middle of band i. */
export function bands(f: Frame, n: number): { band: number; x: (i: number) => number } {
  const band = (f.w - f.l - f.r) / Math.max(1, n);
  return { band, x: (i: number) => f.l + band * i + band / 2 };
}

/** A plain rectangle from (x0, y0) to (x1, y1), at least `minH` high so a zero still shows. */
export function rectPath(x0: number, y0: number, x1: number, y1: number, minH = 1): string {
  const top = Math.min(y0, y1);
  const h = Math.max(minH, Math.abs(y1 - y0));
  return `M${f1(x0)} ${f1(top)}h${f1(x1 - x0)}v${f1(h)}h${f1(x0 - x1)}Z`;
}

/** A filled circle as a path, so many can share one <path>. */
export function dotPath(cx: number, cy: number, r: number): string {
  return `M${f1(cx)} ${f1(cy)}m-${r} 0a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 -${2 * r} 0`;
}

/** A polyline through points, skipping nulls (a null breaks the line). */
export function linePath(points: ({ x: number; y: number } | null)[]): string {
  let d = '';
  let pen = false;
  for (const p of points) {
    if (!p) {
      pen = false;
      continue;
    }
    d += `${pen ? 'L' : 'M'}${f1(p.x)} ${f1(p.y)}`;
    pen = true;
  }
  return d;
}

/**
 * A stepped line across bands: each band's value holds for the whole band and steps at its edge, so a
 * target that changed on a day steps on that day. Null leaves a gap.
 */
export function stepPath(f: Frame, values: (number | null)[], y: (v: number) => number): string {
  const { band } = bands(f, values.length);
  let d = '';
  let prev: number | null = null;
  values.forEach((v, i) => {
    const x0 = f.l + band * i;
    if (v === null) {
      prev = null;
      return;
    }
    if (prev === null) d += `M${f1(x0)} ${f1(y(v))}`;
    else if (prev !== v) d += `H${f1(x0)}V${f1(y(v))}`;
    if (i === values.length - 1 || values[i + 1] === null) d += `H${f1(x0 + band)}`;
    prev = v;
  });
  return d;
}

/**
 * A bar chart's scale in whole steps, from zero or below to zero or above, with room under the lowest bar for the
 * value label printed beneath it. A bar that reaches the foot of the plot would print its label on whatever sits
 * under the plot (the weekday names on "The week, by day"), so the floor drops a step at a time until the lowest
 * negative value ends at least `room` units above the foot. `plot` is the plot's height in the same units.
 */
export function barScale(values: number[], step: number, plot: number, room: number): { lo: number; hi: number } {
  const min = Math.min(0, ...values);
  let lo = Math.floor(min / step) * step;
  const hi = Math.max(Math.ceil(Math.max(0, ...values) / step) * step, lo + step);
  // The gap only grows as the floor drops, and approaches the whole plot, so a room under it always ends the loop.
  if (min < 0 && room < plot) {
    while (((min - lo) / (hi - lo)) * plot < room) lo -= step;
  }
  return { lo, hi };
}

/**
 * Below 600px a chart drawn for the desktop shrinks to a strip a third of its height with labels piled on
 * each other, so each chart is drawn twice: in its wide frame, and in a taller compact frame with room for
 * the labels. CSS shows one or the other (`.h-v.is-wide` / `.h-v.is-compact` in health.css): no script, no
 * flash on load. The compact frame is ~320px across on a 390px phone, so 1 unit is about a third of a pixel.
 */
export const VARIANTS = ['wide', 'compact'] as const;
export type Variant = (typeof VARIANTS)[number];

/**
 * How many weeks apart a chart's Sunday labels go so they never touch: the fewest that leave `labelPx`
 * (a "Sun 27"-sized label and its gap) between them when the chart is drawn `renderPx` wide, the narrowest
 * that frame is shown at. As the log grows the bands narrow and the labels thin out.
 */
export function labelStride(band: number, frameWidth: number, renderPx: number, labelPx = 44): number {
  return Math.max(1, Math.ceil((labelPx * frameWidth) / (renderPx * 7 * band)));
}

/**
 * The Sundays to label, every `stride` weeks counting back from the newest so the latest week is always
 * named. `thin` marks every other one, which the wide frame hides on screens too narrow to fit them all.
 */
export function sundayLabels<T extends { day: string }>(days: T[], stride: number): { i: number; day: T; thin: boolean }[] {
  const sundays = days.map((day, i) => ({ day, i })).filter(({ day }) => day.day === 'Sun');
  const last = sundays.length - 1;
  return sundays
    .filter((_, j) => (last - j) % stride === 0)
    .map((s, _k, all) => ({ ...s, thin: (all.length - 1 - _k) % 2 === 1 }));
}
