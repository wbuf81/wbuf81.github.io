import { calorieTargetFor } from '@/lib/calorieTarget';
import { HealthCalorieTarget } from '@/types/health';

const TARGETS: HealthCalorieTarget[] = [
  { from: '2026-07-20', cals: 2350 },
  { from: '2026-08-10', cals: 2450 },
];

describe('calorieTargetFor', () => {
  test('is the target in effect on that date', () => {
    expect(calorieTargetFor('2026-07-20', TARGETS)).toBe(2350);
    expect(calorieTargetFor('2026-08-09', TARGETS)).toBe(2350);
  });

  test('a target takes effect on its own start date', () => {
    expect(calorieTargetFor('2026-08-10', TARGETS)).toBe(2450);
    expect(calorieTargetFor('2026-09-01', TARGETS)).toBe(2450);
  });

  test('is null before the first target starts', () => {
    expect(calorieTargetFor('2026-07-19', TARGETS)).toBeNull();
  });

  test('is null with nothing configured', () => {
    expect(calorieTargetFor('2026-08-10', [])).toBeNull();
    expect(calorieTargetFor('2026-08-10', undefined)).toBeNull();
  });

  test('reads the latest applicable target however they are ordered', () => {
    const jumbled = [TARGETS[1], TARGETS[0]];

    expect(calorieTargetFor('2026-08-11', jumbled)).toBe(2450);
    expect(calorieTargetFor('2026-08-01', jumbled)).toBe(2350);
  });
});
