import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, within } from '@testing-library/react';
import { calsTone, weightTone } from '@/app/health/components/format';
import StatTiles from '@/app/health/components/StatTiles';
import WeekTable from '@/app/health/components/WeekTable';
import type { HealthSummary, PhaseSummary, WeeklyTrendRow } from '@/types/health';

// Wes alternates cuts and bulks (Nov 2026), so every colour on /health reads the block its row belongs to.

test('a weight change is good in the direction its block wants', () => {
  expect(weightTone(-0.6, 'cut')).toBe('is-good');
  expect(weightTone(0.6, 'cut')).toBe('is-over');
  expect(weightTone(0.6, 'bulk')).toBe('is-good');
  expect(weightTone(-0.6, 'bulk')).toBe('is-over');
  expect(weightTone(0.6, 'maintain')).toBe('');
  // Outside any block it keeps the tracker's original reading: down is good.
  expect(weightTone(-0.6, null)).toBe('is-good');
  expect(weightTone(0.04, 'bulk')).toBe('');
});

test('calories: under the target is good on a cut; near it is good on a bulk', () => {
  expect(calsTone(-120, 2330, 'cut')).toBe('is-good');
  expect(calsTone(0, 2450, 'cut')).toBe('is-good'); // at the target is a hit on a cut
  // The calendar's rule on a cut: up to 10% over says nothing, so a week 3 kcal over is no longer red.
  expect(calsTone(3, 2453, 'cut')).toBe('');
  expect(calsTone(71, 2971, 'cut')).toBe('');
  expect(calsTone(300, 2750, 'cut')).toBe('is-over'); // 12% over: a miss
  // Outside any block, it reads as a cut.
  expect(calsTone(3, 2453, null)).toBe('');
  expect(calsTone(300, 2750, null)).toBe('is-over');
  expect(calsTone(-50, 2400, null)).toBe('is-good');
  // With no average to compare, the sign is all there is.
  expect(calsTone(3, null, 'cut')).toBe('is-over');
  expect(calsTone(-3, null, 'bulk')).toBe('is-good');
  // The bulk week of Nov 2: 2,971 against 2,900 is within 5%, a hit, as the calendar scores it.
  expect(calsTone(71, 2971, 'bulk')).toBe('is-good');
  expect(calsTone(220, 3120, 'bulk')).toBe(''); // 7.6% over: close
  expect(calsTone(-400, 2500, 'bulk')).toBe('is-over'); // 13.8% under: a miss on a bulk
  expect(calsTone(-100, 2800, 'maintain')).toBe('is-good');
  expect(calsTone(null, null, 'bulk')).toBe('');
});

const summary = {
  latestWeight: 203.7, weightChangeTotal: -6.5, avgCals: 2576, avgProtein: 202, avgSteps: 15398,
  estimatedMaintenance: 2700, recentAvgCals: 3187, goalStreak: 16, dayCount: 119, weekCount: 17,
} as unknown as HealthSummary;
const bulk = {
  type: 'bulk', label: 'Lean bulk', start: '2026-11-02', startLabel: 'Nov 2', startWeight: 202.8,
  avgCals: 2843, avgProtein: 211, avgSteps: 14120, weekCount: 3,
} as unknown as PhaseSummary;

/** A tile's figure and its detail line, found by its label. */
function tile(label: string) {
  const box = screen.getByText(label).parentElement as HTMLElement;
  return { value: box.querySelector('.n')?.textContent, detail: box.querySelector('.l')?.textContent };
}

test('the tiles describe the block the newest data falls in, never a cut and a bulk blended', () => {
  render(<StatTiles summary={summary} phase={bulk} weightUnit="lb" />);
  expect(tile('Avg calories')).toEqual({ value: '2,843', detail: 'per day, this bulk' });
  expect(tile('Avg protein')).toEqual({ value: '211 g', detail: 'per day, this bulk' });
  expect(tile('Avg steps')).toEqual({ value: '14,120', detail: 'per day, this bulk' });
  expect(tile('Tracked')).toEqual({ value: '3 weeks', detail: 'this bulk · 119 days in all' });
});

test('a cut says "this cut", maintenance "this block"', () => {
  const { unmount } = render(<StatTiles summary={summary} phase={{ ...bulk, type: 'cut' }} weightUnit="lb" />);
  expect(tile('Avg calories').detail).toBe('per day, this cut');
  unmount();
  render(<StatTiles summary={summary} phase={{ ...bulk, type: 'maintain' }} weightUnit="lb" />);
  expect(tile('Avg calories').detail).toBe('per day, this block');
  expect(tile('Tracked').detail).toBe('this block · 119 days in all');
});

test('with no block the tiles fall back to every recorded day', () => {
  render(<StatTiles summary={summary} phase={null} weightUnit="lb" />);
  expect(tile('Avg calories')).toEqual({ value: '2,576', detail: 'per day, all recorded days' });
  expect(tile('Avg protein')).toEqual({ value: '202 g', detail: 'per day' });
  expect(tile('Tracked')).toEqual({ value: '119 days', detail: '17 weeks' });
});

test('the surplus is maintenance against intake over the same three weeks, named by its sign', () => {
  render(<StatTiles summary={summary} phase={bulk} weightUnit="lb" />);
  // 3,187 eaten over the last three weeks against 2,700 maintenance, not the 2,576 all-time average.
  expect(screen.queryByText('Est. deficit')).toBeNull();
  expect(tile('Est. surplus')).toEqual({ value: '487 kcal', detail: 'per day, last 3 weeks' });
});

test('intake under maintenance reads as a deficit; no maintenance, no figure', () => {
  const { unmount } = render(<StatTiles summary={{ ...summary, recentAvgCals: 2487 }} phase={bulk} weightUnit="lb" />);
  expect(tile('Est. deficit')).toEqual({ value: '213 kcal', detail: 'per day, last 3 weeks' });
  unmount();
  render(<StatTiles summary={{ ...summary, estimatedMaintenance: null, recentAvgCals: null }} phase={bulk} weightUnit="lb" />);
  expect(tile('Est. deficit')).toEqual({ value: '—', detail: 'needs two weighed weeks' });
});

test('the latest weigh-in counts from the start of its block, toned by the block', () => {
  render(<StatTiles summary={summary} phase={bulk} weightUnit="lb" />);
  const note = screen.getByText(/since Nov 2/);
  expect(note).toHaveTextContent('one reading · +0.9 lb since Nov 2');
  expect(note).toHaveClass('is-good');
  expect(screen.queryByText(/since start/)).toBeNull();
});

test('without a block, the latest weigh-in still counts from the start of tracking', () => {
  render(<StatTiles summary={summary} phase={null} weightUnit="lb" />);
  expect(screen.getByText('one reading · −6.5 lb since start')).toBeInTheDocument();
});

function row(weekStart: string, label: string, weightChange: number, phase: WeeklyTrendRow['phase']): WeeklyTrendRow {
  return {
    weekStart, weekEnd: weekStart, label, dayCount: 7, isPartial: false, avgWeight: 202, weightChange,
    avgCals: 2900, calsVsGoal: 0, avgProtein: 200, avgCarbs: 300, avgFat: 80, avgSteps: 15000,
    workouts: 5, cardioSessions: 3, cardioMinutes: 90, phase,
  } as WeeklyTrendRow;
}

test('Records › By week labels each block where it begins, and tones each row by its own block', () => {
  const rows = [
    row('2026-10-19', 'Oct 25', -0.4, { type: 'cut', label: 'Cut', start: '2026-07-20' }),
    row('2026-10-26', 'Nov 1', 1.2, { type: 'cut', label: 'Cut', start: '2026-07-20' }),
    row('2026-11-02', 'Nov 8', 1.3, { type: 'bulk', label: 'Lean bulk', start: '2026-11-02' }),
  ];
  render(<WeekTable rows={rows} weightUnit="lb" />);
  const table = screen.getByRole('table');
  // Newest first: the bulk's heading, its week, then the cut's heading and its two weeks.
  const headings = within(table).getAllByRole('rowheader').filter((c) => c.classList.contains('is-block'));
  expect(headings.map((h) => h.textContent)).toEqual(['Lean bulk', 'Cut']);
  expect(within(table).getByText('+1.3 lb')).toHaveClass('is-good');
  expect(within(table).getByText('+1.2 lb')).toHaveClass('is-over');
});
