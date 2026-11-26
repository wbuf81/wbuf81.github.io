import { barScale, labelStride } from '@/app/health/components/svg';

// Weekly date labels on a daily chart: as the log grows the bands narrow, so the labels must thin out
// rather than overlap. labelStride(band, frameWidth, renderedPx) is how many weeks apart they go.
describe('labelStride', () => {
  test('every week while there is room', () => {
    // 70 days across the wide weight chart (886 units) at its narrowest desktop width.
    expect(labelStride(886 / 70, 1000, 873)).toBe(1);
  });

  test('every other week on a half-width chart, or when the days double', () => {
    expect(labelStride(916 / 70, 1000, 403)).toBe(2);
    expect(labelStride(886 / 140, 1000, 873)).toBe(2);
  });

  test('far apart for a year on a phone', () => {
    expect(labelStride(780 / 365, 1000, 300)).toBeGreaterThanOrEqual(9);
  });
});

// A bar's value label prints under a negative bar. A bar that reached the foot of the plot printed its label on the
// weekday's name below it (Friday's -0.5 on "The week, by day", 26 Nov 2026), so the scale leaves room under it.
describe('barScale', () => {
  const gapUnder = (values: number[], step: number, plot: number, room: number) => {
    const { lo, hi } = barScale(values, step, plot, room);
    return ((Math.min(...values) - lo) / (hi - lo)) * plot;
  };

  test('drops the floor a step when the lowest bar lands on it', () => {
    // The weigh-in chart's step is 0.5; -0.5 used to be the floor itself.
    expect(barScale([0.4, 0.1, -0.2, 0.3, -0.5, 0.2, 0.6], 0.5, 200, 24)).toEqual({ lo: -1, hi: 1 });
  });

  test('leaves the room asked for in every frame, whatever the values', () => {
    // The week-by-day frames: 200 units of plot at 1.33 units a pixel, and 300 at 2, with 18px for the label.
    for (const [plot, room] of [[200, 18 * 1.33], [300, 18 * 2]]) {
      for (const values of [[-0.5, 0.6], [-0.49, 1.4], [-300, 600], [-301, 20], [-2.5, 0.1], [-0.01, 3]]) {
        const step = Math.abs(values[0]) >= 100 ? 300 : 0.5;
        expect(gapUnder(values, step, plot, room)).toBeGreaterThanOrEqual(room);
      }
    }
  });

  test('keeps the scale as it was with no bar below zero', () => {
    expect(barScale([0.2, 0.7], 0.5, 200, 24)).toEqual({ lo: 0, hi: 1 });
    expect(barScale([], 300, 200, 24)).toEqual({ lo: 0, hi: 300 });
  });
});
