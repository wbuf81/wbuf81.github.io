import {
  BIG_DAY_RATIO,
  afterBigDays,
  cardioMornings,
  isBigDay,
  nextMorningFacts,
  nextMorningPairs,
  weekdayProfile,
} from '@/lib/healthInsights';
import { HealthCalorieTarget, HealthDay } from '@/types/health';

const NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function day(date: string, overrides: Partial<HealthDay> = {}): HealthDay {
  const [y, m, d] = date.split('-').map(Number);
  return {
    date,
    day: NAMES[new Date(Date.UTC(y, m - 1, d)).getUTCDay()],
    cals: 2400,
    protein: 200,
    carbs: 250,
    fat: 70,
    weight: 200,
    steps: 12000,
    workout: '',
    cardio: false,
    cardioMinutes: null,
    cardioNote: '',
    notes: '',
    ...overrides,
  };
}

/** Consecutive days from `start`, one per entry, each entry patching the default day. */
function run(start: string, patches: Partial<HealthDay>[]): HealthDay[] {
  const [y, m, d] = start.split('-').map(Number);
  return patches.map((patch, i) => day(new Date(Date.UTC(y, m - 1, d + i)).toISOString().slice(0, 10), patch));
}

const TARGET: HealthCalorieTarget[] = [{ from: '2026-07-20', cals: 2400 }];

describe('nextMorningPairs', () => {
  test('pairs each day with the change in weight by the next morning', () => {
    const days = run('2026-07-20', [{ weight: 200, cals: 2600 }, { weight: 201, cals: 2300 }, { weight: 200.5 }]);
    expect(nextMorningPairs(days, TARGET)).toEqual([
      { date: '2026-07-20', cals: 2600, change: 1, over: true, target: 2400, vsTarget: 200, big: false },
      { date: '2026-07-21', cals: 2300, change: -0.5, over: false, target: 2400, vsTarget: -100, big: false },
    ]);
  });

  test('a missing date is not a next morning: no pair across a gap', () => {
    const days = [day('2026-07-20', { weight: 200 }), day('2026-07-22', { weight: 199 })];
    expect(nextMorningPairs(days, TARGET)).toEqual([]);
  });

  test('skips a day with no calories, or either morning unweighed', () => {
    const days = run('2026-07-20', [{ cals: null }, { weight: null }, { weight: 199 }, { weight: 198 }]);
    expect(nextMorningPairs(days, TARGET).map((p) => p.date)).toEqual(['2026-07-22']);
  });

  test('scores each day against the target in force that day', () => {
    const targets = [
      { from: '2026-07-20', cals: 2350 },
      { from: '2026-07-21', cals: 2450 },
    ];
    const days = run('2026-07-20', [{ cals: 2400 }, { cals: 2400 }, {}]);
    expect(nextMorningPairs(days, targets).map((p) => p.over)).toEqual([true, false]);
  });

  test('with no target nothing is over', () => {
    const days = run('2026-07-20', [{ cals: 4000 }, {}]);
    expect(nextMorningPairs(days)[0]).toMatchObject({ over: false, target: null, vsTarget: null, big: false });
  });

  test('a big day is 20% or more over the target in force that day', () => {
    const targets = [
      { from: '2026-07-20', cals: 2450 },
      { from: '2026-07-22', cals: 2900 },
    ];
    // 2,940 is exactly 1.2 × 2,450: big on a cut target. 3,400 is under 1.2 × 2,900 = 3,480: not big on a bulk one.
    const days = run('2026-07-20', [{ cals: 2940 }, { cals: 2939 }, { cals: 3400 }, { cals: 3480 }, {}]);
    expect(nextMorningPairs(days, targets).map((p) => p.big)).toEqual([true, false, false, true]);
    expect(nextMorningPairs(days, targets).map((p) => p.vsTarget)).toEqual([490, 489, 500, 580]);
  });

  test('rounds away floating-point noise in the change', () => {
    const days = run('2026-07-20', [{ weight: 203.3 }, { weight: 200.6 }]);
    expect(nextMorningPairs(days, TARGET)[0].change).toBe(-2.7);
  });
});

describe('isBigDay', () => {
  test('is a ratio of the target, and never true without one', () => {
    expect(BIG_DAY_RATIO).toBe(1.2);
    expect(isBigDay(2880, 2400)).toBe(true);
    expect(isBigDay(2879, 2400)).toBe(false);
    expect(isBigDay(5000, null)).toBe(false);
    expect(isBigDay(null, 2400)).toBe(false);
  });
});

describe('nextMorningFacts', () => {
  const pair = (date: string, cals: number, change: number, target: number | null = 2400) => ({
    date,
    cals,
    change,
    over: target !== null && cals > target,
    target,
    vsTarget: target === null ? null : cals - target,
    big: target !== null && cals >= target * 1.2,
  });
  const pairs = [pair('a', 2000, -1), pair('b', 2500, 0), pair('c', 3000, 1), pair('d', 3500, 2)];

  test('a day with no target in force is neither over nor at-or-under', () => {
    const facts = nextMorningFacts([...pairs, pair('e', 2000, -3, null)]);
    expect(facts.atOrUnder).toEqual({ avg: -1, n: 1 });
  });

  test('averages the next morning after over, at-or-under and big days', () => {
    const facts = nextMorningFacts(pairs);
    expect(facts.over).toEqual({ avg: 1, n: 3 });
    expect(facts.atOrUnder).toEqual({ avg: -1, n: 1 });
    expect(facts.big).toEqual({ avg: 1.5, n: 2 });
  });

  test('fits a least-squares line against calories over or under the target', () => {
    const { fit } = nextMorningFacts(pairs);
    expect(fit?.slope).toBeCloseTo(0.002);
    // change = 0.002 × vsTarget − 0.2: at the target, the next morning reads 0.2 lighter.
    expect(fit?.intercept).toBeCloseTo(-0.2);
  });

  test('the fit leaves out pairs with no target, and lines up days with different targets', () => {
    // The same change at the same distance from two different targets lies on one line.
    const mixed = [pair('a', 2350, -0.5, 2450), pair('b', 2800, -0.5, 2900), pair('c', 3150, 0.5, 2900), pair('d', 9000, 5, null)];
    const { fit } = nextMorningFacts(mixed);
    expect(fit?.slope).toBeCloseTo(1 / 350);
    expect(fit?.intercept).toBeCloseTo(-0.5 + 100 / 350);
  });

  test('empty groups and too few points give nulls, not NaN', () => {
    const facts = nextMorningFacts(pairs.slice(0, 2));
    expect(facts.big).toEqual({ avg: null, n: 0 });
    expect(facts.fit).toBeNull();
    expect(nextMorningFacts([]).over).toEqual({ avg: null, n: 0 });
  });

  test('no spread in calories gives no fit', () => {
    const flat = pairs.map((p) => ({ ...p, cals: 2500, vsTarget: 100 }));
    expect(nextMorningFacts(flat).fit).toBeNull();
  });
});

describe('afterBigDays', () => {
  test('traces each big day for three mornings, from that morning', () => {
    const days = run('2026-07-20', [
      { weight: 200, cals: 3000 },
      { weight: 201.2 },
      { weight: 200.8 },
      { weight: 199.5 },
      { weight: 199 },
    ]);
    const result = afterBigDays(days, TARGET, 3);
    expect(result.traces).toEqual([{ date: '2026-07-20', cals: 3000, target: 2400, changes: [0, 1.2, 0.8, -0.5], open: false }]);
    expect(result.atHorizon).toEqual({ avg: -0.5, n: 1, below: 1 });
  });

  test('a trace stops at the first morning that was not weighed or not recorded', () => {
    const days = [
      day('2026-07-20', { weight: 200, cals: 3000 }),
      day('2026-07-21', { weight: 201 }),
      day('2026-07-23', { weight: 199 }),
    ];
    expect(afterBigDays(days, TARGET, 3).traces[0]).toMatchObject({ changes: [0, 1], open: false });
  });

  test('a trace cut short by the end of the data is still open', () => {
    const days = run('2026-07-20', [{ cals: 3000 }, { weight: 201 }]);
    expect(afterBigDays(days, TARGET, 3).traces[0]).toMatchObject({ changes: [0, 1], open: true });
  });

  test('only traces that reach the horizon count toward the summary', () => {
    const days = run('2026-07-20', [{ cals: 3000 }, {}, {}, {}, { cals: 3100 }, { weight: 202 }]);
    const result = afterBigDays(days, TARGET, 3);
    expect(result.traces).toHaveLength(2);
    expect(result.atHorizon.n).toBe(1);
  });

  test('every day averaged at each offset, for comparison', () => {
    const days = run('2026-07-20', [{ weight: 203 }, { weight: 202 }, { weight: 201 }, { weight: 200 }]);
    expect(afterBigDays(days, TARGET, 3).typical).toEqual([0, -1, -2, -3]);
  });

  test('every day is traced like a big day: it stops at the first morning not weighed', () => {
    // Jul 22 not weighed: Jul 20 reaches one morning, Jul 21 none (left out), Jul 23 is the last day.
    const days = run('2026-07-20', [{ weight: 200 }, { weight: 201 }, { weight: null }, { weight: 199 }]);
    const result = afterBigDays(days, TARGET, 3);
    expect(result.typical).toEqual([0, 1, null, null]);
    expect(result.everyDay[1]).toEqual({ mean: 1, q1: 1, q3: 1, n: 1 });
    expect(result.everyDay[2]).toBeNull();
  });

  test('every day, big or not, counts toward the comparison', () => {
    const days = run('2026-07-20', [{ weight: 200, cals: 3000 }, { weight: 202 }, { weight: 201 }]);
    const result = afterBigDays(days, TARGET, 3);
    // Jul 20: +2 then +1; Jul 21: −1. Offset 1 averages +2 and −1.
    expect(result.everyDay[1]).toMatchObject({ mean: 0.5, n: 2 });
    expect(result.everyDay[2]).toMatchObject({ mean: 1, n: 1 });
  });

  test('no big days: no traces and an empty summary', () => {
    const result = afterBigDays(run('2026-07-20', [{}, {}]), TARGET, 3);
    expect(result.traces).toEqual([]);
    expect(result.atHorizon).toEqual({ avg: null, n: 0, below: 0 });
    expect(result.offsets).toEqual([null, null, null, null]);
  });

  test('big days are chosen by ratio to the target in force that day, and none without a target', () => {
    const targets = [
      { from: '2026-07-20', cals: 2450 },
      { from: '2026-07-23', cals: 2900 },
    ];
    // 3,000 is big against 2,450 (1.22×) and not against 2,900 (1.03×).
    const days = run('2026-07-20', [{ cals: 3000 }, {}, {}, { cals: 3000 }, {}]);
    expect(afterBigDays(days, targets, 3).traces.map((t) => t.date)).toEqual(['2026-07-20']);
    expect(afterBigDays(days, undefined, 3).traces).toEqual([]);
  });

  test('per offset: the average and the quartiles over the traces that reach it', () => {
    // Four big days, each traced from its morning; quartiles interpolate linearly, as the mockup's colStats.
    const big = (w0: number, w1: number, w2: number, w3: number): Partial<HealthDay>[] => [
      { cals: 3000, weight: w0 },
      { weight: w1 },
      { weight: w2 },
      { weight: w3 },
    ];
    const days = run('2026-07-20', [...big(200, 201, 200.5, 200), ...big(200, 202, 201, 199), ...big(200, 200, 200, 200), ...big(200, 203, 202, 201)]);
    // Days after each big day are not big, and the last trace runs to the end of the data.
    const result = afterBigDays(days, TARGET, 3);
    expect(result.traces).toHaveLength(4);
    // Offset 1: changes 1, 2, 0, 3 → sorted 0, 1, 2, 3: mean 1.5, q1 at 0.75 → 0.75, q3 at 2.25 → 2.25.
    expect(result.offsets[1]).toEqual({ mean: 1.5, q1: 0.75, q3: 2.25, n: 4 });
    expect(result.offsets[0]).toEqual({ mean: 0, q1: 0, q3: 0, n: 4 });
    // Offset 3: −0, −1, 0, 1 → sorted −1, 0, 0, 1.
    expect(result.offsets[3]).toEqual({ mean: 0, q1: -0.25, q3: 0.25, n: 4 });
  });

  test('an offset counts only the traces that reach it', () => {
    const days = run('2026-07-20', [{ cals: 3000, weight: 200 }, { weight: 201 }]);
    const result = afterBigDays(days, TARGET, 3);
    expect(result.offsets[1]).toEqual({ mean: 1, q1: 1, q3: 1, n: 1 });
    expect(result.offsets[2]).toBeNull();
  });
});

describe('weekdayProfile', () => {
  // Two complete weeks, Mon Jul 20 – Sun Aug 2, then a partial third week.
  const week = (sat: number, sun: number): Partial<HealthDay>[] => [
    { cals: 2300 }, { cals: 2300 }, { cals: 2300 }, { cals: 2300 }, { cals: 2400 }, { cals: sat }, { cals: sun },
  ];
  const days = run('2026-07-20', [...week(2900, 2600), ...week(2800, 2400), { cals: 2000 }, { cals: 2000 }]);

  test('one row per weekday, Monday first, by the date rather than the typed day', () => {
    const profile = weekdayProfile(days, TARGET, 200);
    expect(profile.rows.map((r) => r.day)).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
    expect(profile.rows[0].days).toBe(3);
    expect(profile.rows[5]).toMatchObject({ days: 2, avgCals: 2850, avgVsTarget: 450, overTarget: 2, targeted: 2 });
  });

  test('Friday to Sunday against Monday to Thursday, over complete weeks only', () => {
    const profile = weekdayProfile(days, TARGET, 200);
    expect(profile.weeks).toBe(2);
    // Week 1: Fri 0, Sat +500, Sun +200 = +700; week 2: 0 + 400 + 0 = +400.
    expect(profile.weekendVsTarget).toBe(550);
    expect(profile.weekendOverWeeks).toBe(2);
    expect(profile.midweekVsTarget).toBe(-400);
    expect(profile.midweekUnderWeeks).toBe(2);
  });

  test('counts days at the protein goal, or null with no goal', () => {
    const withLow = days.map((d) => (d.date === '2026-07-20' ? { ...d, protein: 150 } : d));
    expect(weekdayProfile(withLow, TARGET, 200).rows[0].atProteinGoal).toBe(2);
    expect(weekdayProfile(withLow, TARGET, null).rows[0].atProteinGoal).toBeNull();
  });

  test('scores protein against the goal in force each day, so raising it does not rescore the past', () => {
    // 200 g until Aug 2, 250 g after: Mon Aug 3 at 200 g misses, the two earlier Mondays meet theirs.
    const goalOn = (date: string) => (date < '2026-08-03' ? 200 : 250);
    expect(weekdayProfile(days, TARGET, goalOn).rows[0]).toMatchObject({ atProteinGoal: 2, proteinScored: 3 });
  });

  test('weigh-in against the 7-day average centred on it, where all seven were weighed', () => {
    // Flat 200 except Sunday Jul 26 at 203.5: that Sunday reads +3 against its centred week, and each
    // day whose window holds it reads -0.5. Fri Jul 24 (-0.5) and Fri Jul 31 (0) average -0.25; Sun Aug 2
    // has no Aug 5 in its window, so Sunday is Jul 26 alone.
    const bumped = days.map((d) => (d.date === '2026-07-26' ? { ...d, weight: 203.5 } : d));
    const profile = weekdayProfile(bumped, TARGET, 200);
    expect(profile.rows[6].weighInVsTrend).toBeCloseTo(3);
    expect(profile.rows[4].weighInVsTrend).toBeCloseTo(-0.25);
    // Sun 3 and Mon -0.5 average 1.25; Fri and Sat both -0.25.
    expect(profile.sunMonVsFriSat).toBeCloseTo(1.5);
  });

  test('a missing weigh-in leaves its neighbours without a centred average', () => {
    const holed = days.map((d) => (d.date === '2026-07-28' ? { ...d, weight: null } : d));
    const profile = weekdayProfile(holed, TARGET, 200);
    // Mon Jul 20 has no three days before it, Mon Jul 27 lost Tue Jul 28 from its window, and Mon Aug 3
    // runs past the last recorded day.
    expect(profile.rows[0].weighInVsTrend).toBeNull();
  });

  test('no target: nothing scored against one', () => {
    const profile = weekdayProfile(days, [], 200);
    expect(profile.rows[5].avgVsTarget).toBeNull();
    expect(profile.weeks).toBe(0);
    expect(profile.weekendVsTarget).toBeNull();
  });
});

describe('cardioMornings', () => {
  test('Monday to Friday, with and without cardio, against the next morning', () => {
    const days = run('2026-07-20', [
      { cardio: true, weight: 200, cals: 2500 }, // Mon -> -1
      { weight: 199, cals: 2300 }, // Tue -> +0.5
      { cardio: true, weight: 199.5, cals: 2400 }, // Wed -> -0.5
      { weight: 199 },
      { weight: 199 }, // Fri -> Sat 0
      { cardio: true, weight: 199 }, // Sat: ignored
      { weight: 202 }, // Sun: ignored
    ]);
    const result = cardioMornings(days);
    expect(result.withCardio).toEqual({ avg: -0.75, n: 2, avgCals: 2450 });
    expect(result.without).toEqual({ avg: 0.17, n: 3, avgCals: 2367 });
  });

  test('nothing to compare gives nulls', () => {
    expect(cardioMornings([]).withCardio).toEqual({ avg: null, n: 0, avgCals: null });
  });
});
