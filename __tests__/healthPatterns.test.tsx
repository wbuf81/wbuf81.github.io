import { buildPhases, buildWeeklyTrend, leadPhase } from '@/lib/health';
import { binOf, caloriesAndScale, leastSquares, morningMoves, sameWeightTwice } from '@/lib/healthPatterns';
import type { HealthDay, HealthPhase } from '@/types/health';
import { render } from '@testing-library/react';
import SameWeight from '@/app/health/components/SameWeight';
import CaloriesScale from '@/app/health/components/CaloriesScale';
import MorningMoves from '@/app/health/components/MorningMoves';

const NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** `n` days from Mon Jul 20 2026, each built from its index. */
function days(n: number, f: (i: number) => Partial<HealthDay>): HealthDay[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(Date.UTC(2026, 6, 20 + i));
    return {
      date: d.toISOString().slice(0, 10),
      day: NAMES[d.getUTCDay()],
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
      ...f(i),
    };
  });
}

function model(ds: HealthDay[], raw: HealthPhase[]) {
  const phases = buildPhases(ds, raw);
  return { phases, rows: buildWeeklyTrend(ds, [], phases), lead: leadPhase(phases, ds) };
}

/** To a tenth: a week's average carries floating-point dust. */
const r1 = (v: number | null) => (v === null ? null : Math.round(v * 10) / 10);

/** A week's flat weight, by week index. */
const byWeek = (ws: number[]) => (i: number) => ({ weight: ws[Math.floor(i / 7)] });

describe('the same weight, twice', () => {
  const CUT_BULK: HealthPhase[] = [
    { start: '2026-07-20', type: 'cut', label: 'Cut' },
    { start: '2026-08-17', type: 'bulk', label: 'Lean bulk' },
  ];

  it('joins each complete week of the newer block to the nearest older week within half a pound, highest first', () => {
    // Cut: 208, 205, 203, 201; bulk: 201.2, 203.4, 204.9.
    const ds = days(49, (i) => ({ ...byWeek([208, 205, 203, 201, 201.2, 203.4, 204.9])(i), cals: i < 28 ? 2300 : 2800 }));
    const { phases, rows, lead } = model(ds, CUT_BULK);
    const m = sameWeightTwice(rows, phases, lead);
    expect(m).not.toBeNull();
    expect(m!.rungs.map((r) => [r1(r.newer.avgWeight), r1(r.older.avgWeight)])).toEqual([
      [204.9, 205],
      [203.4, 203],
      [201.2, 201],
    ]);
    expect(m!.rungs[0].dCals).toBe(500);
    expect(r1(m!.newest.newer.avgWeight)).toBe(204.9);
    expect(m!.direction).toBe(1);
    // Still ahead: the cut's weeks heavier than 204.9, nearest first; here only the week it began with.
    expect(m!.ahead.map((w) => w.avgWeight)).toEqual([208]);
    expect(m!.aheadBeganWith).toBe(true);
    expect(m!.macros).toEqual({ protein: 0, carbs: 0, fat: 0 });
  });

  it('uses an older week once, and leaves out a newer week with nothing within half a pound', () => {
    // Bulk weeks 203.1 and 202.9 both want the cut's 203; 202.9 is no closer, so 203.1 (first by date) takes it.
    const ds = days(42, byWeek([210, 203, 198, 196, 203.1, 202.9]));
    const { phases, rows, lead } = model(ds, [
      { start: '2026-07-20', type: 'cut', label: 'Cut' },
      { start: '2026-08-17', type: 'bulk', label: 'Bulk' },
    ]);
    const m = sameWeightTwice(rows, phases, lead)!;
    expect(m.rungs).toHaveLength(1);
    expect(m.rungs[0].older.avgWeight).toBe(203);
  });

  it('swaps the direction for a bulk then a cut', () => {
    const ds = days(42, byWeek([196, 199, 202, 201.9, 199.2, 197]));
    const { phases, rows, lead } = model(ds, [
      { start: '2026-07-20', type: 'bulk', label: 'Bulk' },
      { start: '2026-08-10', type: 'cut', label: 'Cut' },
    ]);
    const m = sameWeightTwice(rows, phases, lead)!;
    expect(m.direction).toBe(-1);
    expect(m.ahead.map((w) => w.avgWeight)).toEqual([196]);
  });

  it('needs two blocks and a rung', () => {
    const one = model(days(28, byWeek([200, 199, 198, 197])), [{ start: '2026-07-20', type: 'cut' }]);
    expect(sameWeightTwice(one.rows, one.phases, one.lead)).toBeNull();
    const apart = model(days(28, byWeek([210, 208, 200, 201])), CUT_BULK.map((p, i) => (i ? { ...p, start: '2026-08-03' } : p)));
    expect(sameWeightTwice(apart.rows, apart.phases, apart.lead)).toBeNull();
  });

  it('leaves out a newer week still filling up', () => {
    const ds = days(45, byWeek([208, 205, 203, 201, 201.2, 203.4, 205]));
    const { phases, rows, lead } = model(ds, CUT_BULK);
    expect(sameWeightTwice(rows, phases, lead)!.rungs.map((r) => r1(r.newer.avgWeight))).toEqual([203.4, 201.2]);
  });
});

describe("a week's calories and what the scale did", () => {
  /** Ten weeks where each week's change is (cals − 2500) / 250: +0.4 lb a week for every 100 kcal. */
  function steady(nWeeks = 10) {
    let w = 200;
    const ws: number[] = [];
    const cs: number[] = [];
    for (let k = 0; k < nWeeks; k++) {
      const c = 2200 + ((k * 7) % 10) * 100;
      if (k) w += (c - 2500) / 250;
      ws.push(Math.round(w * 100) / 100);
      cs.push(c);
    }
    return days(nWeeks * 7, (i) => ({ weight: ws[Math.floor(i / 7)], cals: cs[Math.floor(i / 7)] }));
  }

  it('fits the weeks and finds where the scale holds and where the plan falls', () => {
    const ds = steady();
    const { phases, rows, lead } = model(ds, [{ start: '2026-07-20', type: 'bulk', label: 'Bulk', ratePerWeek: 0.5 }]);
    const m = caloriesAndScale(rows, lead, [{ from: '2026-07-20', cals: 2700 }], ds[ds.length - 1].date)!;
    expect(m.weeks).toHaveLength(9);
    expect(m.per100).toBeCloseTo(0.4, 2);
    expect(m.holdsAt).toBeCloseTo(2500, 0);
    expect(m.planAt).toBeCloseTo(2625, 0);
    expect(m.target).toBe(2700);
    expect(m.weeks.every((w) => w.inLead)).toBe(true);
  });

  it('waits for eight weeks', () => {
    const ds = steady(8);
    const { rows, lead } = model(ds, []);
    expect(caloriesAndScale(rows, lead, [], ds[ds.length - 1].date)).toBeNull();
  });

  it('never pairs a week with one across a gap', () => {
    const ds = steady(12).filter((d) => d.date < '2026-08-10' || d.date > '2026-08-16');
    const { rows, lead } = model(ds, []);
    const m = caloriesAndScale(rows, lead, [], ds[ds.length - 1].date)!;
    // Twelve weeks less the missing one and the two firsts (the very first, and the one after the gap).
    expect(m.weeks).toHaveLength(9);
    expect(m.weeks.map((w) => w.row.weekStart)).not.toContain('2026-08-17');
  });

  it('marks no crossing when more food goes with less weight', () => {
    const ds = steady().map((d) => ({ ...d, weight: 400 - (d.weight as number) }));
    const { rows, lead } = model(ds, [{ start: '2026-07-20', type: 'bulk', ratePerWeek: 0.5 }]);
    const m = caloriesAndScale(rows, lead, [], ds[ds.length - 1].date)!;
    expect(m.fit.slope).toBeLessThan(0);
    expect(m.holdsAt).toBeNull();
    expect(m.planAt).toBeNull();
  });
});

describe('how far one morning moves', () => {
  it('bins to 0.2, halves away from zero, the same both ways', () => {
    expect([0.1, -0.1, 0.3, -0.3, 0.7, 1.5, -1.5, 0].map(binOf)).toEqual([0.2, -0.2, 0.4, -0.4, 0.8, 1.6, -1.6, 0]);
  });

  /** Twenty mornings of ±0.4, with jumps of +2 every fourth day after the first week, ending on a +3 morning. */
  function wobbly() {
    const w: number[] = [200];
    for (let i = 1; i < 30; i++) w.push(Math.round((w[i - 1] + (i % 4 === 0 && i > 4 ? 2 : i % 2 ? -0.4 : 0.4) - (i % 4 === 1 && i > 5 ? 1.6 : 0)) * 10) / 10);
    w.push(Math.round((w[29] + 3) * 10) / 10);
    return days(31, (i) => ({ weight: w[i] }));
  }

  it('finds the middle, nine in ten, the newest morning’s rank and what is left after a jump', () => {
    const m = morningMoves(wobbly())!;
    expect(m.mornings).toHaveLength(30);
    expect(m.newest.change).toBe(3);
    expect(m.rank).toEqual(expect.objectContaining({ n: 1, dir: 'rise' }));
    expect(m.withinCount / m.mornings.length).toBeGreaterThanOrEqual(0.9);
    expect(m.mornings.filter((x) => Math.abs(x.change) <= m.within - 0.1 + 1e-9).length / 30).toBeLessThan(0.9);
    expect(m.jumps).not.toBeNull();
    expect(m.jumps!.n).toBeGreaterThanOrEqual(5);
    expect(m.bins.reduce((s, b) => s + b.mornings.length, 0)).toBe(30);
    expect(m.maxBin).toBe(Math.max(...m.bins.map((b) => b.mornings.length)));
  });

  it('never bridges a gap, and waits for fourteen mornings', () => {
    const ds = days(20, (i) => ({ weight: 200 + (i % 2) * 0.4 }));
    const gappy = ds.filter((_, i) => i % 3 !== 0);
    expect(morningMoves(gappy)).toBeNull();
    expect(morningMoves(ds)!.mornings).toHaveLength(19);
  });

  it('waits for five jumps, and names no rank outside the top five', () => {
    const ds = days(20, (i) => ({ weight: 200 + (i % 2) * 0.4 }));
    const m = morningMoves(ds)!;
    expect(m.jumps).toBeNull();
    // Every rise is +0.4, so the newest ties them all for the biggest.
    expect(m.rank).toEqual(expect.objectContaining({ n: 1, tied: true }));
    // Up 0.1 a morning, then a drop of 0.5 four mornings before the end: the newest rise of 0.1 is one of 15 alike.
    const flat = morningMoves(days(20, (i) => ({ weight: 200 + i * 0.1 - (i >= 16 ? 0.6 : 0) })))!;
    expect(flat.newest.change).toBe(0.1);
    expect(flat.rank).toEqual(expect.objectContaining({ n: 1, tied: true }));
    // Six bigger rises before it: seventh, so no rank.
    const seventh = morningMoves(days(20, (i) => ({ weight: 200 + (i > 0 && i <= 6 ? i * 1 : 6) + (i === 19 ? 0.5 : 0) })))!;
    expect(seventh.newest.change).toBe(0.5);
    expect(seventh.rank).toBeNull();
    // A drop ranked among drops: third biggest after two of −2.
    const drop = morningMoves(days(20, (i) => ({ weight: 210 - (i >= 3 ? 2 : 0) - (i >= 7 ? 2 : 0) - (i === 19 ? 1 : 0) })))!;
    expect(drop.rank).toEqual(expect.objectContaining({ n: 3, dir: 'drop', tied: false }));
    expect(drop.rank!.bigger.map((m) => [m.date, m.change])).toEqual([
      ['2026-07-23', -2],
      ['2026-07-27', -2],
    ]);
  });
});

describe('least squares', () => {
  it('fits a line and refuses no spread', () => {
    expect(leastSquares([1, 2, 3], [2, 4, 6])).toEqual({ slope: 2, intercept: 0 });
    expect(leastSquares([1, 1, 1], [1, 2, 3])).toBeNull();
    expect(leastSquares([1, 2], [1, 2])).toBeNull();
  });
});

describe('the Patterns cards', () => {
  it('names the columns by the way the blocks ran, never by "cut" or "bulk" of its own', () => {
    const ds = days(42, byWeek([196, 199, 202, 201.9, 199.2, 197]));
    const { phases, rows, lead } = model(ds, [
      { start: '2026-07-20', type: 'bulk', label: 'Gain' },
      { start: '2026-08-10', type: 'cut', label: 'Lean-out' },
    ]);
    const { container } = render(<SameWeight days={ds} weeklyTrend={rows} phases={phases} lead={lead} weightUnit="lb" />);
    const heads = Array.from(container.querySelectorAll('thead th')).map((th) => (th as HTMLElement).textContent);
    expect(heads).toEqual(['Weight, lb', 'On the way up', 'On the way down', 'Difference']);
    expect(container.textContent).not.toMatch(/\b(cut|bulk)\b/i);
    expect(container.innerHTML).not.toMatch(/NaN|undefined|Infinity/);
    expect(container.querySelectorAll('svg[role="img"]')).toHaveLength(2);
  });

  it('draws nothing without the data each needs', () => {
    const ds = days(10, () => ({}));
    const { phases, rows, lead } = model(ds, []);
    const { container } = render(
      <>
        <SameWeight days={ds} weeklyTrend={rows} phases={phases} lead={lead} weightUnit="lb" />
        <CaloriesScale weeklyTrend={rows} lead={lead} calorieTargets={[]} newestDate={ds[9].date} weightUnit="lb" />
        <MorningMoves days={ds.slice(0, 5)} weightUnit="lb" />
      </>,
    );
    expect(container.innerHTML).toBe('');
  });
});
