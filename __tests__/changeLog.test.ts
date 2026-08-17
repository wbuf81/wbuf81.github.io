import { buildChangeLog } from '@/lib/health';
import { HealthDatedTargets } from '@/types/health';

const CUT = { start: '2026-07-20', type: 'cut' as const, label: 'Cut', note: 'Summer cut' };

describe('buildChangeLog', () => {
  test('a phase start reads as the block beginning', () => {
    const log = buildChangeLog({ phases: [CUT] });

    expect(log).toEqual([
      {
        date: '2026-07-20',
        dateLabel: 'Jul 20',
        label: 'Phase',
        from: null,
        to: 'Cut',
        note: 'Summer cut',
      },
    ]);
  });

  test('a following phase shows what it replaced', () => {
    const log = buildChangeLog({
      phases: [CUT, { start: '2026-11-01', type: 'maintain', label: 'Maintenance' }],
    });

    expect(log[1]).toMatchObject({ label: 'Phase', from: 'Cut', to: 'Maintenance' });
  });

  test("a phase's goal weight is its own entry", () => {
    const log = buildChangeLog({ phases: [{ ...CUT, goalWeight: 190 }] });

    expect(log).toContainEqual(
      expect.objectContaining({ label: 'Goal weight', from: null, to: '190' })
    );
  });

  test('the first calorie target reads as set rather than changed', () => {
    const log = buildChangeLog({ calorieTargets: [{ from: '2026-07-20', cals: 2350 }] });

    expect(log).toEqual([
      expect.objectContaining({ label: 'Calorie target', from: null, to: '2,350' }),
    ]);
  });

  test('a later calorie target shows the number it moved from', () => {
    const log = buildChangeLog({
      calorieTargets: [
        { from: '2026-07-20', cals: 2350 },
        { from: '2026-08-10', cals: 2450, note: 'Losing too fast' },
      ],
    });

    expect(log[1]).toMatchObject({
      date: '2026-08-10',
      label: 'Calorie target',
      from: '2,350',
      to: '2,450',
      note: 'Losing too fast',
    });
  });

  test('the first goals revision lists every goal it sets', () => {
    const log = buildChangeLog({
      targets: [
        { from: '2026-07-20', stepsGoal: 13500, liftsPerWeek: 5, cardioPerWeek: 3 },
      ] as HealthDatedTargets[],
    });

    expect(log.map((entry) => [entry.label, entry.from, entry.to])).toEqual([
      ['Steps goal', null, '13,500'],
      ['Lifts per week', null, '5'],
      ['Cardio per week', null, '3'],
    ]);
  });

  test('a later goals revision reports only what actually changed', () => {
    const log = buildChangeLog({
      targets: [
        { from: '2026-07-20', stepsGoal: 13500, liftsPerWeek: 5 },
        { from: '2026-09-01', stepsGoal: 13500, liftsPerWeek: 6, note: 'Sixth session' },
      ] as HealthDatedTargets[],
    });

    const september = log.filter((entry) => entry.date === '2026-09-01');
    expect(september).toEqual([
      expect.objectContaining({ label: 'Lifts per week', from: '5', to: '6', note: 'Sixth session' }),
    ]);
  });

  test('entries run oldest first, whatever order the sources are written in', () => {
    const log = buildChangeLog({
      phases: [CUT],
      calorieTargets: [
        { from: '2026-08-10', cals: 2450 },
        { from: '2026-07-20', cals: 2350 },
      ],
    });

    expect(log.map((entry) => entry.date)).toEqual(['2026-07-20', '2026-07-20', '2026-08-10']);
  });

  test('is empty when nothing is configured', () => {
    expect(buildChangeLog({})).toEqual([]);
  });
});
