import {
  buildCalendarDays,
  calorieLight,
  monthGrid,
  monthSummary,
  monthsWithData,
  proteinLight,
  stepsLight,
  weekSummary,
} from '@/lib/healthCalendar';
import type { HealthDay, PhaseSummary } from '@/types/health';

function day(p: Partial<HealthDay> & { date: string }): HealthDay {
  return {
    day: '', cals: 2400, protein: 200, carbs: 250, fat: 70, weight: 200, steps: 14000,
    workout: 'Lift', cardio: false, cardioMinutes: null, cardioNote: '', notes: '', ...p,
  };
}

const phase = (p: Partial<PhaseSummary>) => ({ type: 'cut', label: 'Cut', start: '2026-07-20', end: null, ...p }) as PhaseSummary;

describe('calorieLight', () => {
  test('on a cut, at or under the target is a hit and up to 10% over is close', () => {
    expect(calorieLight(2450, 2450, 'cut')).toBe('hit');
    expect(calorieLight(1900, 2450, 'cut')).toBe('hit');
    expect(calorieLight(2695, 2450, 'cut')).toBe('close');
    expect(calorieLight(2696, 2450, 'cut')).toBe('miss');
  });

  test('on a bulk, within 5% either way is a hit and within 10% close', () => {
    expect(calorieLight(2900, 2900, 'bulk')).toBe('hit');
    expect(calorieLight(2755, 2900, 'bulk')).toBe('hit');
    expect(calorieLight(3045, 2900, 'bulk')).toBe('hit');
    expect(calorieLight(2610, 2900, 'bulk')).toBe('close');
    expect(calorieLight(3190, 2900, 'bulk')).toBe('close');
    expect(calorieLight(2600, 2900, 'bulk')).toBe('miss');
    expect(calorieLight(3200, 2900, 'bulk')).toBe('miss');
  });

  test('maintenance scores like a bulk: near the number is the point', () => {
    expect(calorieLight(2000, 2400, 'maintain')).toBe('miss');
  });

  test('is unscored with no reading or no target', () => {
    expect(calorieLight(null, 2450, 'cut')).toBe('none');
    expect(calorieLight(2400, null, 'cut')).toBe('none');
  });
});

describe('proteinLight and stepsLight', () => {
  test('protein: the goal is a hit, within 10% close', () => {
    expect(proteinLight(200, 200)).toBe('hit');
    expect(proteinLight(180, 200)).toBe('close');
    expect(proteinLight(179, 200)).toBe('miss');
    expect(proteinLight(150, null)).toBe('none');
    expect(proteinLight(null, 200)).toBe('none');
  });

  test('steps: the goal is a hit, the floor close', () => {
    expect(stepsLight(13500, 10000, 13500)).toBe('hit');
    expect(stepsLight(10000, 10000, 13500)).toBe('close');
    expect(stepsLight(9999, 10000, 13500)).toBe('miss');
    expect(stepsLight(9999, null, 13500)).toBe('miss');
    expect(stepsLight(null, 10000, 13500)).toBe('none');
    expect(stepsLight(20000, 10000, null)).toBe('none');
  });
});

describe('buildCalendarDays', () => {
  test('scores each day against the targets and the block in force that day', () => {
    const days = [
      day({ date: '2026-11-01', cals: 2600, notes: 'Church' }),
      day({ date: '2026-11-02', cals: 2600, workout: '', cardio: true, cardioMinutes: 60, cardioNote: '60 mins Orange Theory' }),
    ];
    const out = buildCalendarDays(days, {
      calorieTargets: [{ from: '2026-07-20', cals: 2450 }, { from: '2026-11-02', cals: 2900 }],
      targets: [{ from: '2026-07-20', stepsMinimum: 10000, stepsGoal: 13500, proteinGoal: 200 }],
      phases: [phase({ end: '2026-11-01' }), phase({ type: 'bulk', label: 'Lean bulk', start: '2026-11-02' })],
      markers: [{ date: '2026-11-01', label: 'Jaguars game', icon: '🏈' }],
      noteMarks: [
        { match: 'church', icon: '✝️', label: 'Church' },
        { match: 'orange theory', icon: '🍊', label: 'Orange Theory', replaces: 'cardio' },
      ],
    });

    expect(out[0]).toMatchObject({ calTarget: 2450, phase: { type: 'cut' }, lights: { cals: 'close', protein: 'hit', steps: 'hit' } });
    expect(out[0].icons).toEqual(['🏈', '✝️']);
    expect(out[0].marker).toBe('Jaguars game');
    expect(out[1]).toMatchObject({ calTarget: 2900, phase: { label: 'Lean bulk' }, lights: { cals: 'miss' } });
    expect(out[1].cardioIcon).toBe('🍊');
    expect(out[1].icons).toEqual([]);
  });
});

describe('monthGrid', () => {
  test('lays a month out Monday first, padded to whole weeks', () => {
    const oct = monthGrid(2026, 10);
    expect(oct).toHaveLength(5);
    expect(oct[0].monday).toBe('2026-09-28');
    expect(oct[0].dates).toEqual([null, null, null, '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04']);
    expect(oct[4].dates).toEqual(['2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31', null]);
  });

  test('a month starting on a Monday has no leading blanks', () => {
    expect(monthGrid(2026, 6)[0].dates[0]).toBe('2026-06-01');
  });
});

describe('summaries', () => {
  const days = buildCalendarDays(
    [
      day({ date: '2026-10-19', weight: 201 }),
      day({ date: '2026-10-25', weight: 199, workout: '' }),
      day({ date: '2026-10-26', weight: 202, cardio: true, cardioMinutes: 30 }),
      day({ date: '2026-10-27', weight: null, cals: 3000 }),
      day({ date: '2026-11-01', weight: 203 }),
    ],
    { calorieTargets: [{ from: '2026-07-20', cals: 2450 }], targets: [{ from: '2026-07-20', stepsMinimum: 10000, stepsGoal: 13500, proteinGoal: 200 }], phases: [phase({})] },
  );

  test('a week: average weigh-in, the change on the week before, lifts and cardio', () => {
    expect(weekSummary(days, '2026-10-26')).toEqual({ dayCount: 3, avgWeight: 202.5, change: 2.5, lifts: 3, cardio: 1 });
    expect(weekSummary(days, '2026-10-12')).toBeNull();
  });

  test('a month: logged days, all-three days, averages and training', () => {
    expect(monthSummary(days, 2026, 10)).toEqual({
      daysLogged: 4, daysInMonth: 31, allThree: 3, avgWeight: (201 + 199 + 202) / 3,
      avgCals: (2400 * 3 + 3000) / 4, avgSteps: 14000, lifts: 3, cardio: 1,
    });
  });

  test('lists the months that hold data, oldest first', () => {
    expect(monthsWithData(days)).toEqual(['2026-10', '2026-11']);
  });
});
