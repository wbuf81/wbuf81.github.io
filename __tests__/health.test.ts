import {
  groupIntoWeeks,
  summarize,
  buildWeightSeries,
  parseHealthTsv,
} from '@/lib/health';
import { HealthDay } from '@/types/health';

function day(overrides: Partial<HealthDay> & { date: string; day: string }): HealthDay {
  return {
    cals: 2000,
    protein: 200,
    carbs: 200,
    fat: 60,
    weight: 200,
    steps: 10000,
    workout: '',
    cardio: false,
    cardioMinutes: null,
    notes: '',
    ...overrides,
  };
}

/** Week 1 as recorded in the sheet: 2026-07-20 (Mon) through 2026-07-26 (Sun). */
const WEEK_ONE: HealthDay[] = [
  day({ date: '2026-07-20', day: 'Mon', cals: 2271, protein: 217, carbs: 216, fat: 65, weight: 210.2, steps: 12922, workout: 'Lee - Legs A' }),
  day({ date: '2026-07-21', day: 'Tue', cals: 2356, protein: 215, carbs: 234, fat: 68, weight: 208.8, steps: 14306, workout: 'Lee - Push', cardio: true, cardioMinutes: 30, notes: '30 mins 12.5 / 3.0' }),
  day({ date: '2026-07-22', day: 'Wed', cals: 2171, protein: 210, carbs: 212, fat: 59, weight: 208.1, steps: 13469, workout: 'Lee - Pull' }),
  day({ date: '2026-07-23', day: 'Thu', cals: 2325, protein: 167, carbs: 232, fat: 49, weight: 207.7, steps: 13284, cardio: true, cardioMinutes: 30, notes: '30 mins 12.5 / 3.0' }),
  day({ date: '2026-07-24', day: 'Fri', cals: 2000, protein: 199, carbs: 192, fat: 54, weight: 208.3, steps: 17645, workout: 'Lee - Legs B' }),
  day({ date: '2026-07-25', day: 'Sat', cals: 2725, protein: 202, carbs: 266, fat: 103, weight: 208.3, steps: 16202, workout: 'Lee - Upper', cardio: true, cardioMinutes: 30, notes: '30 mins 12.5 / 3.0' }),
  day({ date: '2026-07-26', day: 'Sun', cals: 2488, protein: 195, carbs: 154, fat: 125, weight: 207.9, steps: 17600 }),
];

describe('groupIntoWeeks', () => {
  test('groups seven consecutive days into one Mon-Sun week', () => {
    const weeks = groupIntoWeeks(WEEK_ONE);

    expect(weeks).toHaveLength(1);
    expect(weeks[0].weekStart).toBe('2026-07-20');
    expect(weeks[0].weekEnd).toBe('2026-07-26');
    expect(weeks[0].days).toHaveLength(7);
  });

  test('counts workouts, cardio sessions and cardio minutes per week', () => {
    const [week] = groupIntoWeeks(WEEK_ONE);

    expect(week.workouts).toBe(5);
    expect(week.cardioSessions).toBe(3);
    expect(week.cardioMinutes).toBe(90);
  });

  test('splits days that fall in different weeks', () => {
    const days = [
      ...WEEK_ONE,
      day({ date: '2026-07-27', day: 'Mon', workout: 'Lee - Push' }),
    ];

    const weeks = groupIntoWeeks(days);

    expect(weeks).toHaveLength(2);
    expect(weeks[1].weekStart).toBe('2026-07-27');
    expect(weeks[1].days).toHaveLength(1);
  });

  test('a partial week still reports the Monday it belongs to', () => {
    const weeks = groupIntoWeeks([day({ date: '2026-07-23', day: 'Thu' })]);

    expect(weeks[0].weekStart).toBe('2026-07-20');
    expect(weeks[0].weekEnd).toBe('2026-07-26');
  });

  test('averages ignore null values rather than treating them as zero', () => {
    const days = [
      day({ date: '2026-07-20', day: 'Mon', weight: 210 }),
      day({ date: '2026-07-21', day: 'Tue', weight: null }),
      day({ date: '2026-07-22', day: 'Wed', weight: 208 }),
    ];

    const [week] = groupIntoWeeks(days);

    expect(week.avgWeight).toBe(209);
  });

  test('average is null when every value in the week is missing', () => {
    const [week] = groupIntoWeeks([day({ date: '2026-07-20', day: 'Mon', weight: null })]);

    expect(week.avgWeight).toBeNull();
  });
});

describe('summarize', () => {
  test('reports the most recent weight and the total change from the first', () => {
    const summary = summarize(WEEK_ONE);

    expect(summary.latestWeight).toBe(207.9);
    expect(summary.weightChangeTotal).toBeCloseTo(-2.3, 5);
  });

  test('week-over-week change compares weekly averages', () => {
    const weekTwo = [
      day({ date: '2026-07-27', day: 'Mon', weight: 207 }),
      day({ date: '2026-07-28', day: 'Tue', weight: 206 }),
    ];

    const summary = summarize([...WEEK_ONE, ...weekTwo]);

    // Week one average weight is 208.47..., week two is 206.5
    expect(summary.weightChangeWeek).toBeCloseTo(206.5 - 208.4714285, 4);
  });

  test('week-over-week change is null with only one week of data', () => {
    expect(summarize(WEEK_ONE).weightChangeWeek).toBeNull();
  });

  test('a day with cardio but no workout still counts as active', () => {
    const throughSaturday = WEEK_ONE.slice(0, 6);

    // Jul 23 has cardio and no workout; the streak must survive it.
    expect(summarize(throughSaturday).activeStreak).toBe(6);
  });

  test('a full rest day ends the streak', () => {
    // Jul 26 has neither a workout nor cardio.
    expect(summarize(WEEK_ONE).activeStreak).toBe(0);
  });

  test('this week counts reflect the most recent week only', () => {
    const summary = summarize(WEEK_ONE);

    expect(summary.workoutsThisWeek).toBe(5);
    expect(summary.cardioSessionsThisWeek).toBe(3);
    expect(summary.cardioMinutesThisWeek).toBe(90);
  });

  test('suppresses the moving average until there are 14 days', () => {
    expect(summarize(WEEK_ONE).showMovingAverage).toBe(false);

    const weekTwoDates = [
      '2026-07-27', '2026-07-28', '2026-07-29', '2026-07-30',
      '2026-07-31', '2026-08-01', '2026-08-02',
    ];
    const fortnight = [
      ...WEEK_ONE,
      ...weekTwoDates.map((date) => day({ date, day: 'Mon' })),
    ];
    expect(summarize(fortnight).dayCount).toBe(14);
    expect(summarize(fortnight).showMovingAverage).toBe(true);
  });

  test('handles an empty dataset without throwing', () => {
    const summary = summarize([]);

    expect(summary.latestWeight).toBeNull();
    expect(summary.dayCount).toBe(0);
    expect(summary.weekCount).toBe(0);
    expect(summary.activeStreak).toBe(0);
  });
});

describe('buildWeightSeries', () => {
  test('leaves the trend null until a full seven-day window exists', () => {
    const series = buildWeightSeries(WEEK_ONE);

    expect(series).toHaveLength(7);
    expect(series.slice(0, 6).every((p) => p.trend === null)).toBe(true);
  });

  test('the seventh point is the mean of the first seven weights', () => {
    const series = buildWeightSeries(WEEK_ONE);
    const expected = (210.2 + 208.8 + 208.1 + 207.7 + 208.3 + 208.3 + 207.9) / 7;

    expect(series[6].trend).toBeCloseTo(expected, 5);
  });

  test('carries the raw weight through, nulls included', () => {
    const days = [day({ date: '2026-07-20', day: 'Mon', weight: null })];

    expect(buildWeightSeries(days)[0].weight).toBeNull();
  });
});

describe('parseHealthTsv', () => {
  const validTsv = [
    'Jul 20\tMon\t2,271\t217\t216\t65\t210.2\t12,922\tLee - Legs A\tFALSE\t',
    'Jul 21\tTue\t2,356\t215\t234\t68\t208.8\t14,306\tLee - Push\tTRUE\t30 mins 12.5 / 3.0',
  ].join('\n');

  test('parses tab-separated rows into day records', () => {
    const result = parseHealthTsv(validTsv, { year: 2026 });

    expect(result.errors).toEqual([]);
    expect(result.days).toHaveLength(2);
    expect(result.days[0]).toMatchObject({
      date: '2026-07-20',
      day: 'Mon',
      cals: 2271,
      weight: 210.2,
      steps: 12922,
      workout: 'Lee - Legs A',
      cardio: false,
      cardioMinutes: null,
    });
  });

  test('strips thousands separators from numbers', () => {
    const result = parseHealthTsv(validTsv, { year: 2026 });

    expect(result.days[0].steps).toBe(12922);
    expect(result.days[0].cals).toBe(2271);
  });

  test('sets cardioMinutes to 30 when the cardio box is checked', () => {
    const result = parseHealthTsv(validTsv, { year: 2026 });

    expect(result.days[1].cardio).toBe(true);
    expect(result.days[1].cardioMinutes).toBe(30);
  });

  test('a blank workout column parses as a rest day, not an error', () => {
    const tsv = 'Jul 23\tThu\t2325\t167\t232\t49\t207.7\t13284\t\tTRUE\t30 mins';

    const result = parseHealthTsv(tsv, { year: 2026 });

    expect(result.errors).toEqual([]);
    expect(result.days[0].workout).toBe('');
  });

  test('rejects a row with the wrong number of columns', () => {
    const result = parseHealthTsv('Jul 20\tMon\t2271', { year: 2026 });

    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toMatch(/column/i);
    expect(result.days).toHaveLength(0);
  });

  test('rejects an unparseable number', () => {
    const tsv = 'Jul 20\tMon\tabc\t217\t216\t65\t210.2\t12922\tLee - Legs A\tFALSE\t';

    const result = parseHealthTsv(tsv, { year: 2026 });

    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toMatch(/cals/i);
  });

  test('rejects a date that already exists in the data', () => {
    const result = parseHealthTsv(validTsv, { year: 2026, existing: WEEK_ONE });

    expect(result.errors.some((e) => /duplicate/i.test(e))).toBe(true);
  });

  test('treats an empty weight cell as null rather than zero', () => {
    const tsv = 'Jul 20\tMon\t2271\t217\t216\t65\t\t12922\tLee - Legs A\tFALSE\t';

    const result = parseHealthTsv(tsv, { year: 2026 });

    expect(result.errors).toEqual([]);
    expect(result.days[0].weight).toBeNull();
  });

  test('warns on a gap between the last recorded day and the first new one', () => {
    const tsv = 'Aug 10\tMon\t2271\t217\t216\t65\t210.2\t12922\tLee - Legs A\tFALSE\t';

    const result = parseHealthTsv(tsv, { year: 2026, existing: WEEK_ONE });

    expect(result.errors).toEqual([]);
    expect(result.warnings.some((w) => /gap/i.test(w))).toBe(true);
  });

  test('warns on an implausible day-over-day weight swing', () => {
    const tsv = 'Jul 27\tMon\t2271\t217\t216\t65\t199.0\t12922\tLee - Legs A\tFALSE\t';

    const result = parseHealthTsv(tsv, { year: 2026, existing: WEEK_ONE });

    expect(result.errors).toEqual([]);
    expect(result.warnings.some((w) => /weight/i.test(w))).toBe(true);
  });

  test('warns on out-of-range calories but still imports', () => {
    const tsv = 'Jul 27\tMon\t9999\t217\t216\t65\t207.8\t12922\tLee - Legs A\tFALSE\t';

    const result = parseHealthTsv(tsv, { year: 2026, existing: WEEK_ONE });

    expect(result.errors).toEqual([]);
    expect(result.days).toHaveLength(1);
    expect(result.warnings.some((w) => /cal/i.test(w))).toBe(true);
  });

  test('warns when notes state a cardio duration other than 30', () => {
    const tsv = 'Jul 27\tMon\t2271\t217\t216\t65\t207.8\t12922\tLee - Push\tTRUE\t45 mins 12.5 / 3.0';

    const result = parseHealthTsv(tsv, { year: 2026, existing: WEEK_ONE });

    expect(result.warnings.some((w) => /45/.test(w))).toBe(true);
    // The default is kept; the mismatch is surfaced, not silently applied.
    expect(result.days[0].cardioMinutes).toBe(30);
  });

  test('ignores a pasted header row', () => {
    const tsv = ['Date\tDay\tCals\tProtein (g)\tCarbs (g)\tFat (g)\tWeight\tSteps\tWorkout\tCardio\tNotes', validTsv].join('\n');

    const result = parseHealthTsv(tsv, { year: 2026 });

    expect(result.errors).toEqual([]);
    expect(result.days).toHaveLength(2);
  });

  test('ignores blank lines', () => {
    const result = parseHealthTsv(`${validTsv}\n\n`, { year: 2026 });

    expect(result.errors).toEqual([]);
    expect(result.days).toHaveLength(2);
  });

  test('rolls the year over when the sheet wraps from December to January', () => {
    const tsv = [
      'Dec 28\tMon\t2271\t217\t216\t65\t210.2\t12922\tLee - Legs A\tFALSE\t',
      'Jan 03\tSun\t2271\t217\t216\t65\t209.2\t12922\tLee - Push\tFALSE\t',
    ].join('\n');

    const result = parseHealthTsv(tsv, { year: 2026 });

    expect(result.days[0].date).toBe('2026-12-28');
    expect(result.days[1].date).toBe('2027-01-03');
  });
});
