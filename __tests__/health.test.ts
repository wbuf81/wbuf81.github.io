import {
  groupIntoWeeks,
  summarize,
  buildWeightSeries,
  buildWeeklyTrend,
  buildPhases,
  buildWeeklyGoals,
  goalStreak,
  currentPhase,
  parseHealthTsv,
} from '@/lib/health';
import { HealthDay, HealthPhase } from '@/types/health';

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

  test('a Sunday rest day does not break the streak', () => {
    // Jul 26 is a Sunday with neither a workout nor cardio. Sunday is a
    // scheduled rest day, so it is passed over rather than ending the run.
    expect(summarize(WEEK_ONE).activeStreak).toBe(6);
  });

  test('a Sunday rest day does not count toward the streak either', () => {
    // Six active days Mon-Sat, plus a rest Sunday, is still six.
    const streak = summarize(WEEK_ONE).activeStreak;

    expect(streak).not.toBe(7);
    expect(streak).toBe(6);
  });

  test('an active Sunday does count toward the streak', () => {
    const days = [
      day({ date: '2026-07-24', day: 'Fri', workout: 'Lee - Legs B' }),
      day({ date: '2026-07-25', day: 'Sat', workout: 'Lee - Upper' }),
      day({ date: '2026-07-26', day: 'Sun', cardio: true, cardioMinutes: 30 }),
    ];

    expect(summarize(days).activeStreak).toBe(3);
  });

  test('a rest day on any other weekday still ends the streak', () => {
    const days = [
      day({ date: '2026-07-20', day: 'Mon', workout: 'Lee - Legs A' }),
      day({ date: '2026-07-21', day: 'Tue' }),
      day({ date: '2026-07-22', day: 'Wed', workout: 'Lee - Pull' }),
    ];

    // Tuesday was an unplanned rest, so only Wednesday survives.
    expect(summarize(days).activeStreak).toBe(1);
  });

  test('a streak of only rest Sundays is zero, not a running total', () => {
    const days = [
      day({ date: '2026-07-19', day: 'Sun' }),
      day({ date: '2026-07-26', day: 'Sun' }),
    ];

    expect(summarize(days).activeStreak).toBe(0);
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

describe('buildPhases', () => {
  const CUT: HealthPhase = { start: '2026-07-20', type: 'cut', label: 'Summer cut' };

  test('an open-ended latest phase is still running', () => {
    const [phase] = buildPhases(WEEK_ONE, [CUT]);

    expect(phase.isOngoing).toBe(true);
    expect(phase.end).toBeNull();
    expect(phase.label).toBe('Summer cut');
  });

  test('the next phase closes the one before it, the day before it starts', () => {
    const phases = buildPhases(WEEK_ONE, [
      CUT,
      { start: '2026-07-24', type: 'bulk' },
    ]);

    expect(phases[0].end).toBe('2026-07-23');
    expect(phases[0].isOngoing).toBe(false);
    expect(phases[1].isOngoing).toBe(true);
  });

  test('an explicit end is respected, leaving a gap with no phase', () => {
    const [phase] = buildPhases(WEEK_ONE, [
      { start: '2026-07-20', end: '2026-07-22', type: 'cut' },
    ]);

    expect(phase.end).toBe('2026-07-22');
    expect(phase.isOngoing).toBe(false);
    expect(phase.dayCount).toBe(3);
  });

  test('falls back to the type as a label when none is given', () => {
    const [phase] = buildPhases(WEEK_ONE, [{ start: '2026-07-20', type: 'bulk' }]);

    expect(phase.label.toLowerCase()).toContain('bulk');
  });

  test('measures change from the first to the last recorded weight inside the range', () => {
    const [phase] = buildPhases(WEEK_ONE, [CUT]);

    expect(phase.startWeight).toBe(210.2);
    expect(phase.currentWeight).toBe(207.9);
    expect(phase.weightChange).toBeCloseTo(-2.3, 5);
  });

  test('only counts days inside the range', () => {
    const phases = buildPhases(WEEK_ONE, [
      { start: '2026-07-20', end: '2026-07-22', type: 'cut' },
      { start: '2026-07-23', type: 'bulk' },
    ]);

    expect(phases[0].dayCount).toBe(3);
    expect(phases[1].dayCount).toBe(4);
    expect(phases[0].workouts).toBe(3);
  });

  test('reports goal progress for a cut', () => {
    const [phase] = buildPhases(WEEK_ONE, [{ ...CUT, goalWeight: 200 }]);

    // Started 210.2, now 207.9, goal 200: 2.3 of 10.2 lb done.
    expect(phase.goalRemaining).toBeCloseTo(7.9, 5);
    expect(phase.goalPercent).toBeCloseTo((2.3 / 10.2) * 100, 4);
  });

  test('reports goal progress for a bulk, where the target is above the start', () => {
    const gaining = [
      day({ date: '2026-07-20', day: 'Mon', weight: 200 }),
      day({ date: '2026-07-21', day: 'Tue', weight: 202 }),
    ];

    const [phase] = buildPhases(gaining, [
      { start: '2026-07-20', type: 'bulk', goalWeight: 210 },
    ]);

    expect(phase.goalRemaining).toBeCloseTo(8, 5);
    expect(phase.goalPercent).toBeCloseTo(20, 4);
  });

  test('clamps progress at 100 when the goal is passed', () => {
    const [phase] = buildPhases(WEEK_ONE, [{ ...CUT, goalWeight: 209 }]);

    expect(phase.goalPercent).toBe(100);
  });

  test('goal fields are null when no goal is set', () => {
    const [phase] = buildPhases(WEEK_ONE, [CUT]);

    expect(phase.goalWeight).toBeNull();
    expect(phase.goalRemaining).toBeNull();
    expect(phase.goalPercent).toBeNull();
  });

  test('a phase with no recorded days reports nulls rather than throwing', () => {
    const [phase] = buildPhases(WEEK_ONE, [{ start: '2027-01-01', type: 'cut' }]);

    expect(phase.dayCount).toBe(0);
    expect(phase.startWeight).toBeNull();
    expect(phase.weightChange).toBeNull();
    expect(phase.workouts).toBe(0);
  });

  test('orders phases by start date regardless of how they were written', () => {
    const phases = buildPhases(WEEK_ONE, [
      { start: '2026-07-24', type: 'bulk' },
      { start: '2026-07-20', type: 'cut' },
    ]);

    expect(phases.map((p) => p.start)).toEqual(['2026-07-20', '2026-07-24']);
  });

  test('returns nothing when no phases are defined', () => {
    expect(buildPhases(WEEK_ONE, [])).toEqual([]);
    expect(buildPhases(WEEK_ONE, undefined)).toEqual([]);
  });
});

describe('currentPhase', () => {
  test('is the ongoing phase when there is one', () => {
    const phases = buildPhases(WEEK_ONE, [{ start: '2026-07-20', type: 'cut' }]);

    expect(currentPhase(phases)?.isOngoing).toBe(true);
  });

  test('is null when the latest phase has already ended', () => {
    const phases = buildPhases(WEEK_ONE, [
      { start: '2026-07-20', end: '2026-07-22', type: 'cut' },
    ]);

    expect(currentPhase(phases)).toBeNull();
  });

  test('is null when there are no phases', () => {
    expect(currentPhase([])).toBeNull();
  });
});

describe('buildWeeklyTrend', () => {
  const weekTwo: HealthDay[] = [
    day({ date: '2026-07-27', day: 'Mon', weight: 207.4, cals: 2310, protein: 208, steps: 14010, workout: 'Lee - Legs A' }),
    day({ date: '2026-07-28', day: 'Tue', weight: 207.0, cals: 2410, protein: 220, steps: 15220, workout: 'Lee - Push', cardio: true, cardioMinutes: 30 }),
  ];

  test('reports one row per week, oldest first', () => {
    const rows = buildWeeklyTrend([...WEEK_ONE, ...weekTwo]);

    expect(rows).toHaveLength(2);
    expect(rows[0].weekStart).toBe('2026-07-20');
    expect(rows[1].weekStart).toBe('2026-07-27');
  });

  test('the first week has no change to report', () => {
    const rows = buildWeeklyTrend(WEEK_ONE);

    expect(rows[0].weightChange).toBeNull();
  });

  test('change compares this week average weight to the previous week', () => {
    const rows = buildWeeklyTrend([...WEEK_ONE, ...weekTwo]);
    const weekOneAvg = (210.2 + 208.8 + 208.1 + 207.7 + 208.3 + 208.3 + 207.9) / 7;
    const weekTwoAvg = (207.4 + 207.0) / 2;

    expect(rows[1].weightChange).toBeCloseTo(weekTwoAvg - weekOneAvg, 5);
  });

  test('carries the per-week aggregates through', () => {
    const rows = buildWeeklyTrend([...WEEK_ONE, ...weekTwo]);

    expect(rows[0].workouts).toBe(5);
    expect(rows[0].cardioSessions).toBe(3);
    expect(rows[0].cardioMinutes).toBe(90);
    expect(rows[0].dayCount).toBe(7);
    expect(rows[1].dayCount).toBe(2);
  });

  test('marks a partial week so a short first or last week is not read as a drop', () => {
    const rows = buildWeeklyTrend([...WEEK_ONE, ...weekTwo]);

    expect(rows[0].isPartial).toBe(false);
    expect(rows[1].isPartial).toBe(true);
  });

  test('change is null when a week has no weigh-ins at all', () => {
    const noWeights = [
      day({ date: '2026-07-27', day: 'Mon', weight: null }),
      day({ date: '2026-07-28', day: 'Tue', weight: null }),
    ];

    const rows = buildWeeklyTrend([...WEEK_ONE, ...noWeights]);

    expect(rows[1].avgWeight).toBeNull();
    expect(rows[1].weightChange).toBeNull();
  });

  test('returns nothing for an empty dataset', () => {
    expect(buildWeeklyTrend([])).toEqual([]);
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

const GOALS = [
  { from: '2026-01-01', weighInsPerWeek: 7, liftsPerWeek: 5, cardioPerWeek: 3 },
];

describe('buildWeeklyGoals', () => {
  test('scores a week that hits all three goals', () => {
    const [week] = buildWeeklyGoals(WEEK_ONE, GOALS);

    expect(week.allMet).toBe(true);
    expect(week.isComplete).toBe(true);
    expect(week.lines.map((line) => [line.key, line.actual, line.goal, line.met])).toEqual([
      ['measure', 7, 7, true],
      ['lifts', 5, 5, true],
      ['cardio', 3, 3, true],
    ]);
  });

  test('a missed weigh-in fails the measure goal and reports what is left', () => {
    const days = WEEK_ONE.map((d) => (d.date === '2026-07-22' ? { ...d, weight: null } : d));
    const [week] = buildWeeklyGoals(days, GOALS);

    const measure = week.lines.find((line) => line.key === 'measure');
    expect(measure).toMatchObject({ actual: 6, met: false, remaining: 1 });
    expect(week.allMet).toBe(false);
  });

  test('exceeding a goal still reads as met with nothing remaining', () => {
    const days = WEEK_ONE.map((d) =>
      d.date === '2026-07-26' ? { ...d, cardio: true, cardioMinutes: 30 } : d
    );
    const [week] = buildWeeklyGoals(days, GOALS);

    const cardio = week.lines.find((line) => line.key === 'cardio');
    expect(cardio).toMatchObject({ actual: 4, goal: 3, met: true, remaining: 0 });
  });

  test('a goal left unset is not scored rather than counted as zero', () => {
    const [week] = buildWeeklyGoals(WEEK_ONE, [{ from: '2026-01-01', liftsPerWeek: 5 }]);

    expect(week.lines.map((line) => line.key)).toEqual(['lifts']);
    expect(week.allMet).toBe(true);
  });

  test('marks a week still filling up as incomplete', () => {
    const [week] = buildWeeklyGoals(WEEK_ONE.slice(0, 3), GOALS);

    expect(week.isComplete).toBe(false);
    expect(week.dayCount).toBe(3);
  });
});

describe('weekly goals against dated revisions', () => {
  /** A second identical week starting Mon 2026-08-03. */
  const WEEK_TWO = WEEK_ONE.map((d, i) =>
    day({ ...d, date: `2026-08-${String(3 + i).padStart(2, '0')}`, day: d.day })
  );

  test('raising a goal does not re-score the weeks lived under the old one', () => {
    const rows = buildWeeklyGoals([...WEEK_ONE, ...WEEK_TWO], [
      { from: '2026-07-20', weighInsPerWeek: 7, liftsPerWeek: 5, cardioPerWeek: 3 },
      { from: '2026-08-03', liftsPerWeek: 6 },
    ]);

    const [first, second] = rows;
    expect(first.lines.find((l) => l.key === 'lifts')).toMatchObject({ goal: 5, met: true });
    expect(first.allMet).toBe(true);
    expect(second.lines.find((l) => l.key === 'lifts')).toMatchObject({ goal: 6, met: false });
  });

  test('a revision that names one goal leaves the others in force', () => {
    const rows = buildWeeklyGoals([...WEEK_ONE, ...WEEK_TWO], [
      { from: '2026-07-20', weighInsPerWeek: 7, liftsPerWeek: 5, cardioPerWeek: 3 },
      { from: '2026-08-03', liftsPerWeek: 6 },
    ]);

    expect(rows[1].lines.find((l) => l.key === 'cardio')).toMatchObject({ goal: 3, met: true });
    expect(rows[1].lines.find((l) => l.key === 'measure')).toMatchObject({ goal: 7, met: true });
  });

  test('a week is scored by the revision in effect on its last recorded day', () => {
    // The revision lands mid-week; a weekly count cannot be part-scored, so the
    // week is judged by where it ended up.
    const rows = buildWeeklyGoals(WEEK_ONE, [
      { from: '2026-07-20', liftsPerWeek: 5 },
      { from: '2026-07-24', liftsPerWeek: 6 },
    ]);

    expect(rows[0].lines.find((l) => l.key === 'lifts')).toMatchObject({ goal: 6 });
  });

  test('a week before the first revision is not scored at all', () => {
    const rows = buildWeeklyGoals(WEEK_ONE, [{ from: '2026-09-01', liftsPerWeek: 5 }]);

    expect(rows[0].lines).toEqual([]);
    expect(rows[0].allMet).toBe(true);
  });
});

describe('goalStreak', () => {
  test('counts consecutive complete weeks that met every goal', () => {
    // A second identical week on real August dates, Mon 2026-08-03 onward.
    const second = WEEK_ONE.map((d, i) =>
      day({ ...d, date: `2026-08-${String(3 + i).padStart(2, '0')}`, day: d.day })
    );
    const rows = buildWeeklyGoals([...WEEK_ONE, ...second], GOALS);

    expect(rows).toHaveLength(2);
    expect(goalStreak(rows)).toBe(2);
  });

  test('a missed goal in the newest complete week ends the streak', () => {
    const second = WEEK_ONE.map((d, i) =>
      day({ ...d, date: `2026-08-${String(3 + i).padStart(2, '0')}`, day: d.day, cardio: false, cardioMinutes: null })
    );
    const rows = buildWeeklyGoals([...WEEK_ONE, ...second], GOALS);

    expect(goalStreak(rows)).toBe(0);
  });

  test('a partial newest week is passed over rather than breaking the streak', () => {
    const partial = WEEK_ONE.slice(0, 2).map((d, i) =>
      day({ ...d, date: `2026-08-${String(3 + i).padStart(2, '0')}`, day: d.day })
    );
    const rows = buildWeeklyGoals([...WEEK_ONE, ...partial], GOALS);

    expect(rows[1].isComplete).toBe(false);
    expect(rows[1].allMet).toBe(false);
    expect(goalStreak(rows)).toBe(1);
  });

  test('is zero when no goals are configured', () => {
    expect(goalStreak(buildWeeklyGoals(WEEK_ONE, []))).toBe(0);
    expect(goalStreak([])).toBe(0);
  });
});

describe('phase weight change per week', () => {
  const phase: HealthPhase[] = [{ start: '2026-07-20', type: 'cut' }];

  test('divides the change by the weighed span in weeks', () => {
    // 210.2 on Jul 20 to 207.9 on Jul 26 is -2.3 lb across 7 days spanned.
    const [summary] = buildPhases(WEEK_ONE, phase);

    expect(summary.weightChange).toBeCloseTo(-2.3, 5);
    expect(summary.weightChangePerWeek).toBeCloseTo(-2.3, 5);
  });

  test('halves the rate when the same change takes two weeks', () => {
    const second = WEEK_ONE.map((d, i) =>
      day({ ...d, date: `2026-07-${String(27 + i)}`, day: d.day, weight: null })
    );
    // Move the final weigh-in to the end of week two, same value.
    second[second.length - 1] = day({ ...second[second.length - 1], weight: 207.9 });
    const [summary] = buildPhases([...WEEK_ONE, ...second], phase);

    expect(summary.weightChange).toBeCloseTo(-2.3, 5);
    expect(summary.weightChangePerWeek).toBeCloseTo(-1.15, 5);
  });

  test('is null until a full week has been weighed', () => {
    const [summary] = buildPhases(WEEK_ONE.slice(0, 3), phase);

    expect(summary.weightChange).not.toBeNull();
    expect(summary.weightChangePerWeek).toBeNull();
  });
});

describe('projected goal date', () => {
  test('extrapolates the weighed rate to the goal', () => {
    // 210.2 -> 207.9 over week one is -2.3 lb/week; 205.6 is exactly one more
    // week away from the last weigh-in on Jul 26.
    const [phase] = buildPhases(WEEK_ONE, [
      { start: '2026-07-20', type: 'cut', goalWeight: 205.6 },
    ]);

    expect(phase.projectedGoalDate).toBe('2026-08-02');
    expect(phase.projectedGoalLabel).toBe('Aug 2');
  });

  test('is null until there is a rate to extrapolate', () => {
    const [phase] = buildPhases(WEEK_ONE.slice(0, 3), [
      { start: '2026-07-20', type: 'cut', goalWeight: 200 },
    ]);

    expect(phase.projectedGoalDate).toBeNull();
  });

  test('is null when the weight is moving away from the goal', () => {
    const [phase] = buildPhases(WEEK_ONE, [
      { start: '2026-07-20', type: 'bulk', goalWeight: 215 },
    ]);

    expect(phase.projectedGoalDate).toBeNull();
  });

  test('is null once the goal has been reached', () => {
    const [phase] = buildPhases(WEEK_ONE, [
      { start: '2026-07-20', type: 'cut', goalWeight: 209 },
    ]);

    expect(phase.projectedGoalDate).toBeNull();
  });

  test('is null without a goal', () => {
    const [phase] = buildPhases(WEEK_ONE, [{ start: '2026-07-20', type: 'cut' }]);

    expect(phase.projectedGoalDate).toBeNull();
    expect(phase.projectedGoalLabel).toBeNull();
  });
});

describe('estimated maintenance', () => {
  /** Fifteen days, eating the same every day, losing 4 lb across the span. */
  function steadyLoss(): HealthDay[] {
    const dates = [
      '2026-07-20', '2026-07-21', '2026-07-22', '2026-07-23', '2026-07-24',
      '2026-07-25', '2026-07-26', '2026-07-27', '2026-07-28', '2026-07-29',
      '2026-07-30', '2026-07-31', '2026-08-01', '2026-08-02', '2026-08-03',
    ];
    return dates.map((date, i) =>
      day({ date, day: 'Mon', cals: 2500, weight: 210 - (4 / 14) * i })
    );
  }

  test('adds the daily deficit implied by the weight change to average intake', () => {
    // 2,500 in, 4 lb lost over 14 day-intervals: 1,000 kcal/day deficit.
    const summary = summarize(steadyLoss());

    expect(summary.estimatedMaintenance).toBeCloseTo(3500, 5);
  });

  test('is null until two weeks have been weighed', () => {
    const summary = summarize(WEEK_ONE);

    expect(summary.estimatedMaintenance).toBeNull();
  });

  test('is null with fewer than two weigh-ins', () => {
    const days = steadyLoss().map((d, i) => (i === 0 ? d : { ...d, weight: null }));
    const summary = summarize(days);

    expect(summary.estimatedMaintenance).toBeNull();
  });
});

describe('weekly calories vs target', () => {
  // Week one averages 2,333.71 kcal/day.
  const WEEK_ONE_AVG = 16336 / 7;

  test('reports the week against the target in effect', () => {
    const [row] = buildWeeklyTrend(WEEK_ONE, [{ from: '2026-07-20', cals: 2300 }]);

    expect(row.calsVsGoal).toBeCloseTo(WEEK_ONE_AVG - 2300, 4);
  });

  test('a target that changes mid-week is scored per day, not by the week', () => {
    // 2,300 for Mon-Wed, then 2,400 from Thu: the week is measured against the
    // blended target it actually lived under.
    const [row] = buildWeeklyTrend(WEEK_ONE, [
      { from: '2026-07-20', cals: 2300 },
      { from: '2026-07-23', cals: 2400 },
    ]);

    const blended = (2300 * 3 + 2400 * 4) / 7;
    expect(row.calsVsGoal).toBeCloseTo(WEEK_ONE_AVG - blended, 4);
  });

  test('only days with a recorded intake count toward the blend', () => {
    const days = [
      day({ date: '2026-07-20', day: 'Mon', cals: 2400 }),
      day({ date: '2026-07-21', day: 'Tue', cals: null }),
    ];

    const [row] = buildWeeklyTrend(days, [
      { from: '2026-07-20', cals: 2300 },
      { from: '2026-07-21', cals: 9000 },
    ]);

    expect(row.calsVsGoal).toBeCloseTo(100, 4);
  });

  test('is null without targets, or before the first one starts', () => {
    expect(buildWeeklyTrend(WEEK_ONE)[0].calsVsGoal).toBeNull();
    expect(buildWeeklyTrend(WEEK_ONE, [{ from: '2026-09-01', cals: 2300 }])[0].calsVsGoal).toBeNull();
  });
});

describe('daily chart labels', () => {
  test('the weight series labels by weekday, matching the other daily charts', () => {
    const series = buildWeightSeries(WEEK_ONE);

    expect(series.map((p) => p.label)).toEqual([
      'Mon 20', 'Tue 21', 'Wed 22', 'Thu 23', 'Fri 24', 'Sat 25', 'Sun 26',
    ]);
  });

  test('keeps the leading zero so every label is the same width', () => {
    const series = buildWeightSeries([day({ date: '2026-08-02', day: 'Sun' })]);

    expect(series[0].label).toBe('Sun 02');
  });
});
