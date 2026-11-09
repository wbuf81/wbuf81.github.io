import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import WeightCalories from '@/app/health/components/WeightCalories';
import type { HealthDay, PhaseSummary, WeightPoint } from '@/types/health';

// Wes alternates cuts and bulks (Nov 2026): the chart draws each block's goal over that block's own days, in the
// weight line's colour so it reads as weight, apart from the dotted calorie target, and marks where each block starts.

// jsdom has no PointerEvent, so fireEvent.pointerMove would arrive without clientX or pointerType (as in healthPage.test).
if (typeof window.PointerEvent === 'undefined') {
  class PointerEventPolyfill extends MouseEvent {
    pointerType: string;
    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init);
      this.pointerType = init.pointerType ?? 'mouse';
    }
  }
  (window as unknown as { PointerEvent: typeof PointerEventPolyfill }).PointerEvent = PointerEventPolyfill;
}

function day(date: string, weight: number, cals: number): HealthDay {
  return { date, day: 'Mon', cals, protein: 200, carbs: 300, fat: 80, weight, steps: 15000, workout: '', cardio: false, cardioMinutes: null, cardioNote: '', notes: '' };
}
const dates = Array.from({ length: 14 }, (_, i) => new Date(Date.UTC(2026, 9, 26 + i)).toISOString().slice(0, 10));
const days = dates.map((d, i) => day(d, 201 + i * 0.2, i < 7 ? 2700 : 2950));
const series: WeightPoint[] = days.map((d) => ({ date: d.date, weight: d.weight, trend: null }) as WeightPoint);
const block = (o: Partial<PhaseSummary>) => o as PhaseSummary;
const blocks = [
  block({ type: 'cut', label: 'Cut', start: '2026-07-20', end: '2026-11-01', isOngoing: false, goalWeight: 195 }),
  block({ type: 'bulk', label: 'Lean bulk', start: '2026-11-02', end: null, isOngoing: true, goalWeight: 220 }),
];

function draw() {
  return render(
    <WeightCalories
      days={days}
      series={series}
      calorieTargets={[{ from: '2026-07-20', cals: 2450 }, { from: '2026-11-02', cals: 2900 }]}
      blocks={blocks}
      showTrend={false}
      weightUnit="lb"
    />,
  );
}

test("each block's goal is labelled and drawn only over that block's days", () => {
  const { container } = draw();
  // Both frames (wide and compact) carry the same labels.
  // The block's name rides on its goal line (Wes, 9 Nov 2026): "Cut goal 195.0" low, "Lean bulk goal 220.0" high.
  expect(screen.getAllByText('Cut goal 195.0')).toHaveLength(2);
  expect(screen.getAllByText('Lean bulk goal 220.0')).toHaveLength(2);
  const goal = container.querySelector('.is-wide path.g-goal')!.getAttribute('d')!;
  expect(goal.match(/M/g)).toHaveLength(2); // two separate segments, not one rule across the chart
});

test('where each block begins is marked; a block is named at its goal, or along the top when it has none', () => {
  const { container } = draw();
  // One boundary inside the chart: where the bulk began.
  expect(container.querySelector('.is-wide path.g-block')!.getAttribute('d')!.match(/M/g)).toHaveLength(1);
  // Both blocks have goals, so neither is named a second time along the top.
  expect(container.querySelectorAll('.h-ax.is-block')).toHaveLength(0);
});

test('a block without a goal is still named, along the top', () => {
  const { container } = render(
    <WeightCalories
      days={days}
      series={series}
      calorieTargets={[]}
      blocks={[block({ type: 'maintain', label: 'Maintenance', start: '2026-10-26', end: null, isOngoing: true, goalWeight: null })]}
      showTrend={false}
      weightUnit="lb"
    />,
  );
  expect([...container.querySelectorAll('.h-ax.is-block')].map((e) => e.textContent)).toEqual(['Maintenance', 'Maintenance']);
});

test('the hover tooltip names the phase of the day under the pointer', () => {
  const { container } = draw();
  const panel = container.querySelector('.h-v.is-wide') as HTMLElement;
  panel.getBoundingClientRect = () => ({ left: 0, top: 0, width: 1000, height: 400, right: 1000, bottom: 400, x: 0, y: 0, toJSON: () => ({}) });
  // The frame's plot runs from x 52 to 938 across 14 days; x 900 falls on the last day, a bulk day.
  fireEvent.pointerMove(panel, { clientX: 900, pointerType: 'mouse' });
  expect(screen.getAllByText('Phase')[0].nextElementSibling).toHaveTextContent('Lean bulk');
  fireEvent.pointerMove(panel, { clientX: 100, pointerType: 'mouse' });
  expect(screen.getAllByText('Phase')[0].nextElementSibling).toHaveTextContent('Cut');
});

test('the weight scale keeps every visible goal in view, a closed block included', () => {
  const { container } = draw();
  const ticks = [...container.querySelectorAll('.is-wide .h-ax.is-left')].map((e) => Number(e.textContent));
  expect(Math.min(...ticks)).toBeLessThanOrEqual(195); // the cut's goal, though the cut has closed
  expect(Math.max(...ticks)).toBeGreaterThanOrEqual(220); // the bulk's
});

test('the legend tells the goal from the calorie target', () => {
  draw();
  expect(screen.getByText('Goal weight · left')).toBeInTheDocument();
  expect(screen.getByText('Calorie target · right')).toBeInTheDocument();
});
