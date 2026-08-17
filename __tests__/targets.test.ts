import { targetsFor } from '@/lib/targets';
import { HealthDatedTargets } from '@/types/health';

const TARGETS: HealthDatedTargets[] = [
  {
    from: '2026-07-20',
    stepsMinimum: 10000,
    stepsGoal: 13500,
    weighInsPerWeek: 7,
    liftsPerWeek: 5,
    cardioPerWeek: 3,
    note: 'Cut begins',
  },
  { from: '2026-09-01', liftsPerWeek: 6, note: 'Added a sixth session' },
];

describe('targetsFor', () => {
  test('resolves the entry in effect on that date', () => {
    expect(targetsFor('2026-08-01', TARGETS)?.liftsPerWeek).toBe(5);
    expect(targetsFor('2026-09-05', TARGETS)?.liftsPerWeek).toBe(6);
  });

  test('an entry takes effect on its own start date', () => {
    expect(targetsFor('2026-09-01', TARGETS)?.liftsPerWeek).toBe(6);
    expect(targetsFor('2026-08-31', TARGETS)?.liftsPerWeek).toBe(5);
  });

  test('a later entry patches the earlier one rather than replacing it', () => {
    // The Sep entry only names lifts, so the step and weigh-in goals carry over.
    const resolved = targetsFor('2026-09-05', TARGETS);

    expect(resolved?.stepsGoal).toBe(13500);
    expect(resolved?.weighInsPerWeek).toBe(7);
    expect(resolved?.cardioPerWeek).toBe(3);
  });

  test('is null before the first entry starts', () => {
    expect(targetsFor('2026-07-19', TARGETS)).toBeNull();
  });

  test('is null with nothing configured', () => {
    expect(targetsFor('2026-08-01', [])).toBeNull();
    expect(targetsFor('2026-08-01', undefined)).toBeNull();
  });

  test('resolves correctly however the entries are ordered', () => {
    const jumbled = [TARGETS[1], TARGETS[0]];

    expect(targetsFor('2026-09-05', jumbled)?.liftsPerWeek).toBe(6);
    expect(targetsFor('2026-08-01', jumbled)?.liftsPerWeek).toBe(5);
  });

  test('does not carry the note forward as if it applied to a later date', () => {
    expect(targetsFor('2026-09-05', TARGETS)?.note).toBe('Added a sixth session');
  });
});
