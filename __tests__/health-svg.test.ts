import { labelStride } from '@/app/health/components/svg';

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
