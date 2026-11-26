import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { buildPhases, buildStepStreaks, buildWeeklyTrend, groupIntoWeeks, leadPhase } from '@/lib/health';
import { nextRound, proteinGoalDays, roadToGoal, soFar, weekOnWeek } from '@/lib/healthProgress';
import type { HealthDatedTargets, HealthDay, HealthPhase } from '@/types/health';
import RoadToGoal from '@/app/health/components/RoadToGoal';
import SoFar from '@/app/health/components/SoFar';
import DailyGoals from '@/app/health/components/DailyGoals';
import ConsistencyGrid from '@/app/health/components/ConsistencyGrid';

const NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** `n` days from Mon Jul 20 2026, each built from its index. */
function days(n: number, f: (i: number) => Partial<HealthDay> = () => ({})): HealthDay[] {
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
  return { ds, phases, rows: buildWeeklyTrend(ds, [], phases), lead: leadPhase(phases, ds) };
}

/** A cut of four weeks from 208 down to 200, then a bulk of five weeks climbing a pound a week. */
function cutThenBulk(bulk: Partial<HealthPhase> = {}, climb = (i: number) => 200 + (i - 28) / 7) {
  const ds = days(63, (i) => ({ weight: Math.round((i < 28 ? 208 - (i * 8) / 27 : climb(i)) * 10) / 10 }));
  return model(ds, [
    { start: '2026-07-20', type: 'cut', label: 'Cut', goalWeight: 195 },
    { start: '2026-08-17', type: 'bulk', label: 'Lean bulk', goalWeight: 210, ratePerWeek: 0.5, ...bulk },
  ]);
}

describe('the road to the goal', () => {
  it('runs a line to the goal at each pace, soonest first, the recent one landing on the lead card’s date', () => {
    const m = cutThenBulk();
    const road = roadToGoal(m.ds, m.rows, m.phases, m.lead)!;
    expect(road).not.toBeNull();
    expect(road.direction).toBe(1);
    expect(road.paces.map((p) => p.key)).toEqual(['recent', 'block', 'plan']);
    // The same sum as "On pace for": the newest weigh-in plus pounds to go over the recent rate.
    expect(road.paces[0].date).toBe(m.lead!.projectedGoalDate);
    expect(road.now).toBe(m.lead!.currentWeight);
    expect(road.nowDate).toBe('2026-09-20');
    expect(road.start).toEqual({ weight: 200, date: '2026-08-17' });
    // The cut's first weekly average, about 207, lies between now and the goal.
    expect(road.previous?.block.label).toBe('Cut');
    expect(road.previous?.weight).toBeCloseTo(207.0, 0);
    expect(road.paces.every((p) => p.passDate !== null && p.passDate < p.date)).toBe(true);
    expect(road.recentFrom).toBe('2026-08-31');
  });

  it('draws no line for a pace pointing away from the goal', () => {
    // The last three weeks fall back while the plan still climbs.
    const m = cutThenBulk({}, (i) => (i < 49 ? 200 + (i - 28) / 4 : 205 - (i - 49) / 7));
    const road = roadToGoal(m.ds, m.rows, m.phases, m.lead)!;
    expect(m.lead!.recentChangePerWeek).toBeLessThan(0);
    expect(road.paces.map((p) => p.key)).not.toContain('recent');
    expect(road.paces.map((p) => p.key)).toContain('plan');
  });

  it('is left out with no goal, with an ended block, or with no pace that reaches the goal', () => {
    const noGoal = cutThenBulk({ goalWeight: null });
    expect(roadToGoal(noGoal.ds, noGoal.rows, noGoal.phases, noGoal.lead)).toBeNull();

    const ended = cutThenBulk({ end: '2026-09-20' });
    expect(ended.lead!.isOngoing).toBe(false);
    expect(roadToGoal(ended.ds, ended.rows, ended.phases, ended.lead)).toBeNull();

    // Every pace points down while the goal is up.
    const away = cutThenBulk({ ratePerWeek: null }, (i) => 203 - (i - 28) / 7);
    expect(roadToGoal(away.ds, away.rows, away.phases, away.lead)).toBeNull();
    expect(render(<RoadToGoal days={away.ds} weeklyTrend={away.rows} phases={away.phases} lead={away.lead} weightUnit="lb" />).container.innerHTML).toBe('');
  });

  it('reads a cut: the lines run down to a lower goal', () => {
    const m = model(days(35, (i) => ({ weight: Math.round((210 - i / 7) * 10) / 10 })), [
      { start: '2026-07-20', type: 'cut', label: 'Cut', goalWeight: 195, ratePerWeek: -0.75 },
    ]);
    const road = roadToGoal(m.ds, m.rows, m.phases, m.lead)!;
    expect(road.direction).toBe(-1);
    expect(road.paces.every((p) => p.rate < 0)).toBe(true);
    expect(road.paces[0].date).toBe(m.lead!.projectedGoalDate);
    // No earlier block: nothing to pass on the way, and the first week has no week before it.
    expect(road.previous).toBeNull();
    expect(weekOnWeek(m.rows, m.lead)!.from).toBeNull();

    const { container } = render(<RoadToGoal days={m.ds} weeklyTrend={m.rows} phases={m.phases} lead={m.lead} weightUnit="lb" />);
    expect(screen.getByRole('heading', { level: 2, name: 'The road to 195' })).toBeInTheDocument();
    expect(screen.queryByText(/Back where/)).toBeNull();
    expect(container.querySelectorAll('.h-road.is-wide .h-ax.is-date')).toHaveLength(road.paces.length);
    expect(container.innerHTML).not.toMatch(/NaN|undefined|Infinity/);
    // The week-on-week sentence stops short of a week before the block.
    expect(container.querySelector('.h-road-note')).toHaveTextContent(/is the average of the weekly changes\.$/);
  });

  it('with fewer than three weeks, has no recent pace yet', () => {
    const m = model(days(14, (i) => ({ weight: 200 + i * 0.1 })), [
      { start: '2026-07-20', type: 'bulk', label: 'Bulk', goalWeight: 205 },
    ]);
    const road = roadToGoal(m.ds, m.rows, m.phases, m.lead)!;
    expect(road.paces.map((p) => p.key)).toEqual(['block']);
    expect(road.recentFrom).toBeNull();
    render(<RoadToGoal days={m.ds} weeklyTrend={m.rows} phases={m.phases} lead={m.lead} weightUnit="lb" />);
    expect(screen.getByText('A straight line from this week’s average to the goal: the pace of the whole block.')).toBeInTheDocument();
  });

  it('tells the per-week figures apart, from the block’s first weigh-in and from the week before it', () => {
    const m = cutThenBulk();
    const wow = weekOnWeek(m.rows, m.lead)!;
    expect(wow.from?.label).toBe('Aug 16');
    render(<RoadToGoal days={m.ds} weeklyTrend={m.rows} phases={m.phases} lead={m.lead} weightUnit="lb" />);
    const note = document.querySelector('.h-road-note') as HTMLElement;
    expect(note).toHaveTextContent(/^This block’s pace, \+[\d.]+ lb a week, counts from its first weigh-in: 200\.0 lb on Aug 17\./);
    expect(note).toHaveTextContent(/Week on week, \+[\d.]+ lb on Trends, is the average of the weekly changes and counts from the last weekly average before the block: [\d.]+ lb, the week ending Aug 16\.$/);
    expect(screen.getByText(/^Back where the cut began/)).toBeInTheDocument();
    expect(screen.getByText('At the plan, +0.5').parentElement).toHaveTextContent('the pace planned for the lean bulk');
  });
});

describe('so far', () => {
  it('names the next round number; one landed on exactly counts toward the following one', () => {
    expect(nextRound(1_999_999, 1_000_000)).toBe(2_000_000);
    expect(nextRound(2_000_000, 1_000_000)).toBe(3_000_000);
    expect(nextRound(25, 25)).toBe(50);
    expect(nextRound(0, 600)).toBe(600);
  });

  it('adds up the log and dates each milestone', () => {
    // Ten days of 100,000 steps: exactly a million. Lifts on weekdays, cardio of 60 minutes on Tuesdays.
    const ds = days(28, (i) => ({
      steps: 100_000 / 2.8,
      workout: i % 7 < 5 ? 'Lift' : '',
      cardio: i % 7 === 1,
      cardioMinutes: i % 7 === 1 ? 60 : null,
      protein: 226.796185,
    }));
    const t = soFar(ds, null)!;
    expect(t.steps.total).toBeCloseTo(1_000_000, 3);
    expect(t.recorded).toBe(28);
    // 20 lifts; the 25th falls on the fifth weekday after the last day, Sun Aug 16: Fri Aug 21.
    expect(t.lifts.total).toBe(20);
    expect(t.lifts.next).toBe(25);
    expect(t.lifts.weekdays).toEqual([1, 2, 3, 4, 5]);
    expect(t.lifts.due).toBe('2026-08-21');
    // 4 sessions, 240 minutes; 180 in the last three weeks is 60 a week, 360 to the next ten hours: six weeks.
    expect(t.cardio).toMatchObject({ sessions: 4, minutes: 240, prev: 0, next: 600, perWeek: 60 });
    expect(t.cardio.weeks).toBeCloseTo(6);
    expect(t.weighIns).toBe(28);
    expect(t.protein.grams / 453.59237).toBeCloseTo(14, 3);
  });

  it('dates nothing it has no pace for', () => {
    const t = soFar(days(7, () => ({ steps: null, workout: '', cardio: false })), null)!;
    expect(t.steps.total).toBe(0);
    expect(t.steps.due).toBeNull();
    expect(t.lifts.due).toBeNull();
    expect(t.cardio.weeks).toBeNull();
    expect(soFar([], null)).toBeNull();
  });

  it('reads protein in pounds with grams beneath, and names the miles’ assumption', () => {
    const ds = days(14, (i) => ({ steps: 15000, workout: i % 7 === 6 ? '' : 'Lift', protein: 200, cardio: i % 7 === 2, cardioMinutes: i % 7 === 2 ? 45 : null }));
    const m = model(ds, [{ start: '2026-07-20', type: 'bulk', label: 'Lean bulk' }]);
    const { container } = render(<SoFar days={ds} lead={m.lead} />);
    expect(screen.getByRole('img', { name: '210,000 steps' })).toBeInTheDocument();
    expect(screen.getByText('about 100 miles, at 2,100 steps a mile')).toBeInTheDocument();
    expect(screen.getByText('6.2 lb')).toBeInTheDocument();
    expect(screen.getByText('2,800 g, eaten over 14 days')).toBeInTheDocument();
    // 790,000 to go at this bulk's 15,000 a day: 53 days after Sun Aug 2.
    expect(container).toHaveTextContent('Next: 1,000,000, 790,000 to go, due about Thu, Sep 24 at this bulk’s 15,000 a day');
    // 12 lifts, Monday to Saturday: the 25th is the thirteenth lifting day after Aug 2.
    expect(container).toHaveTextContent('Next: the 25th, on Mon, Aug 17, lifting Mon, Tue, Wed, Thu, Fri, Sat');
    expect(container).toHaveTextContent('days, every one since Jul 20');
    expect(container.innerHTML).not.toMatch(/NaN|undefined|Infinity/);
  });
});

describe('daily goals', () => {
  const TARGETS: HealthDatedTargets[] = [
    { from: '2026-07-20', stepsMinimum: 10000, stepsGoal: 13500, proteinGoal: 200 },
    { from: '2026-08-03', proteinGoal: 210 },
  ];

  it('scores each day against the protein goal in force that day', () => {
    expect(proteinGoalDays(days(21, () => ({ protein: 205 })), TARGETS)).toEqual({ met: 14, scored: 21 });
    expect(proteinGoalDays(days(3, () => ({ protein: null })), TARGETS)).toEqual({ met: 0, scored: 0 });
  });

  it('holds the step runs and the protein days, for the block and in all', () => {
    const ds = days(21, (i) => ({ steps: i === 5 ? 12000 : 14000, protein: 205 }));
    const m = model(ds, [
      { start: '2026-07-20', type: 'cut', label: 'Cut' },
      { start: '2026-08-03', type: 'bulk', label: 'Lean bulk' },
    ]);
    render(<DailyGoals days={ds} targets={TARGETS} streaks={buildStepStreaks(ds, TARGETS)} lead={m.lead} />);
    const cell = (k: string) => screen.getByText(k).parentElement as HTMLElement;
    expect(cell('Above the 10k steps floor')).toHaveTextContent('21 days');
    expect(cell('Above the 10k steps floor')).toHaveTextContent('running, the best run yet');
    expect(cell('Above the 13.5k steps goal')).toHaveTextContent('15 days');
    expect(cell('Above the 13.5k steps goal')).toHaveTextContent('running, the best run yet');
    // The bulk began with the 210 g goal: 205 misses every day of it.
    expect(cell('Protein goal, this bulk')).toHaveTextContent('0 of 7 days');
    expect(cell('Protein goal, this bulk')).toHaveTextContent('at or over the 210 g goal since Aug 3');
    expect(cell('Protein goal, in all')).toHaveTextContent('14 of 21 days');
  });

  it('says a run is below on the latest day, and names the best', () => {
    const ds = days(10, (i) => ({ steps: i === 9 ? 9000 : 14000 }));
    render(<DailyGoals days={ds} targets={TARGETS} streaks={buildStepStreaks(ds, TARGETS)} lead={null} />);
    expect(screen.getByText('Above the 10k steps floor').parentElement).toHaveTextContent('0 days');
    expect(screen.getByText('Above the 10k steps floor').parentElement).toHaveTextContent('below it on the latest day (best run 9 days)');
    expect(screen.queryByText(/this /)).toBeNull();
  });

  it('draws nothing with no goals set', () => {
    const ds = days(7);
    const { container } = render(<DailyGoals days={ds} targets={[]} streaks={buildStepStreaks(ds, [])} lead={null} />);
    expect(container.innerHTML).toBe('');
  });
});

describe('the consistency grid', () => {
  it('opens on the twelve newest weeks, newest first, with the rest behind a button that hides them again', () => {
    const weeks = groupIntoWeeks(days(18 * 7, (i) => ({ workout: i % 2 ? 'Lift' : '' })));
    const { container } = render(<ConsistencyGrid weeks={weeks} />);
    const labels = () => Array.from(container.querySelectorAll('.h-wl')).filter((el) => !el.closest('[hidden]')).map((el) => el.textContent);
    expect(labels()).toHaveLength(12);
    expect(labels()[0]).toBe('Nov 22');
    expect(labels()[11]).toBe('Sep 6');

    const button = screen.getByRole('button', { name: 'Show all 18 weeks' });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(button);
    expect(labels()).toHaveLength(18);
    expect(labels().slice(11)).toEqual(['Sep 6', 'Aug 30', 'Aug 23', 'Aug 16', 'Aug 9', 'Aug 2', 'Jul 26']);
    expect(button).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Show the newest 12 only' }));
    expect(labels()).toHaveLength(12);
  });

  it('has no button with twelve weeks or fewer', () => {
    const { container } = render(<ConsistencyGrid weeks={groupIntoWeeks(days(12 * 7))} />);
    expect(screen.queryByRole('button')).toBeNull();
    const grid = container.querySelector('.h-grid7') as HTMLElement;
    expect(within(grid).getAllByText(/^(Jul|Aug|Sep|Oct) \d+$/)[0]).toHaveTextContent('Oct 11');
  });
});
