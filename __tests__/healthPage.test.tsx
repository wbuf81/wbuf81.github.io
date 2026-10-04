import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, within } from '@testing-library/react';
import HealthDashboard from '@/app/health/components/HealthDashboard';
import {
  buildChangeLog,
  buildPhases,
  buildStepStreaks,
  buildWeeklyGoals,
  buildWeeklyTrend,
  buildWeightSeries,
  currentPhase,
  getHealthData,
  groupIntoWeeks,
  summarize,
} from '@/lib/health';
import { HealthData, HealthDay } from '@/types/health';

const NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// jsdom has no PointerEvent, so fireEvent.pointerMove would arrive without clientX or pointerType.
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

/** Three complete weeks from Mon Jul 20: weight drifting down, heavy Saturdays, cardio Tue/Thu. */
function fixture(): HealthData {
  const days: HealthDay[] = Array.from({ length: 21 }, (_, i) => {
    const date = new Date(Date.UTC(2026, 6, 20 + i));
    const name = NAMES[date.getUTCDay()];
    return {
      date: date.toISOString().slice(0, 10),
      day: name,
      cals: name === 'Sat' ? 3000 : 2300,
      protein: 205,
      carbs: 240,
      fat: 70,
      weight: Math.round((210 - i * 0.15 + (name === 'Sun' ? 1 : 0)) * 10) / 10,
      steps: 14000,
      workout: name === 'Sun' ? '' : 'Lift',
      cardio: name === 'Tue' || name === 'Thu',
      cardioMinutes: name === 'Tue' || name === 'Thu' ? 30 : null,
      cardioNote: '',
      notes: name === 'Sun' ? 'Church' : '',
    };
  });
  return {
    lastUpdated: '2026-08-09',
    units: { weight: 'lb' },
    days,
    phases: [{ start: '2026-07-20', type: 'cut', label: 'Cut', goalWeight: 195 }],
    markers: [{ date: '2026-08-08', label: 'A game', icon: '🐊', note: 'In the stands.' }],
    targets: [{ from: '2026-07-20', stepsMinimum: 10000, stepsGoal: 13500, weighInsPerWeek: 7, liftsPerWeek: 5, cardioPerWeek: 2, proteinGoal: 200 }],
    noteMarks: [{ match: 'church', icon: '✝️', label: 'Church' }],
    calorieTargets: [{ from: '2026-07-20', cals: 2400 }],
  };
}

function Dashboard({ data }: { data: HealthData }) {
  const phases = buildPhases(data.days, data.phases);
  return (
    <HealthDashboard
      days={data.days}
      weeks={groupIntoWeeks(data.days)}
      summary={summarize(data.days, data.targets)}
      weightSeries={buildWeightSeries(data.days)}
      weeklyTrend={buildWeeklyTrend(data.days, data.calorieTargets)}
      phases={phases}
      activePhase={currentPhase(phases)}
      markers={data.markers ?? []}
      noteMarks={data.noteMarks ?? []}
      calorieTargets={data.calorieTargets ?? []}
      targets={data.targets ?? []}
      weeklyGoals={buildWeeklyGoals(data.days, data.targets)}
      changeLog={buildChangeLog(data)}
      stepStreaks={buildStepStreaks(data.days, data.targets)}
      lastUpdated={data.lastUpdated}
      weightUnit={data.units.weight}
    />
  );
}

/** Pretend an element is laid out 1000px wide from the left edge, matching the charts' 1000-unit viewBox. */
function layOut(el: Element) {
  jest.spyOn(el, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, width: 1000, height: 400, right: 1000, bottom: 400, x: 0, y: 0, toJSON: () => ({}) });
}

describe('/health', () => {
  it('draws every section of the page, in order', () => {
    render(<Dashboard data={fixture()} />);
    const headings = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    expect(headings).toEqual([
      'Weight and calories',
      'What a day’s calories do to the next morning',
      'The week, by day',
      'Steps',
      'Macros',
      'Consistency',
      'The log',
      'Records',
    ]);
  });

  it('reads the day under the pointer on the weight-and-calories chart, and clears on leaving', () => {
    const { container } = render(<Dashboard data={fixture()} />);
    const panel = container.querySelector('.h-panel.is-hover') as Element;
    layOut(panel);
    // 21 bands across 1000 - 52 - 62 units; the middle of band 10 is Thu Jul 30.
    fireEvent.pointerMove(panel, { clientX: 52 + (886 / 21) * 10.5 });
    const tip = container.querySelector('.h-tip') as HTMLElement;
    expect(within(tip).getByText('Thu Jul 30')).toBeInTheDocument();
    expect(within(tip).getByText('Next morning')).toBeInTheDocument();
    fireEvent.pointerLeave(panel, { pointerType: 'mouse' });
    expect(container.querySelector('.h-tip')).toBeNull();
  });

  it('keeps the tip inside the chart at its right edge', () => {
    const { container } = render(<Dashboard data={fixture()} />);
    const panel = container.querySelector('.h-panel.is-hover') as Element;
    layOut(panel);
    fireEvent.pointerMove(panel, { clientX: 930 });
    const left = parseFloat((container.querySelector('.h-tip') as HTMLElement).style.left);
    expect(left + 230).toBeLessThanOrEqual(1000);
  });

  it('reads the weekday under the pointer on the week-by-day chart', () => {
    const { container } = render(<Dashboard data={fixture()} />);
    const wkd = container.querySelector('.h-wkd') as Element;
    layOut(wkd);
    // Seven bands across 1000 - 64 - 24 units; Saturday is the sixth.
    fireEvent.pointerMove(wkd, { clientX: 64 + (912 / 7) * 5.5 });
    const tip = wkd.querySelector('.h-tip') as HTMLElement;
    expect(within(tip).getByText('Saturday')).toBeInTheDocument();
    expect(within(tip).getByText('+600')).toBeInTheDocument();
  });

  it('states the weekend split from complete weeks', () => {
    render(<Dashboard data={fixture()} />);
    // Fri 2300 - 2400, Sat +600, Sun -100: +400 a week, every week.
    expect(screen.getByText('+400 kcal')).toBeInTheDocument();
    expect(screen.getByText(/over in 3 of 3 weeks/)).toBeInTheDocument();
  });

  it('tapes a marker onto its week in the log, and lists it in the By-week table', () => {
    render(<Dashboard data={fixture()} />);
    expect(screen.getByText('In the stands.', { exact: false })).toBeInTheDocument();
    expect(screen.getByRole('table', { name: /Weekly averages/ })).toHaveTextContent('🐊 A game');
  });

  it('switches the records between tables', () => {
    render(<Dashboard data={fixture()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Every day' }));
    expect(screen.getByRole('button', { name: 'Every day' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('All recorded days, newest first')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Changes' }));
    expect(screen.getByRole('table', { name: /Changes to goals/ })).toBeInTheDocument();
  });

  it('holds up with no targets, no phase and no markers', () => {
    const bare = { ...fixture(), phases: [], markers: [], targets: [], noteMarks: [], calorieTargets: [] };
    const { container } = render(<Dashboard data={bare} />);
    expect(container.textContent).not.toMatch(/NaN|undefined|Infinity/);
    expect(screen.queryByText('The week, by day')).not.toBeInTheDocument();
  });

  it('says so with no days at all', () => {
    render(<Dashboard data={{ ...fixture(), days: [] }} />);
    expect(screen.getByText('No data recorded yet.')).toBeInTheDocument();
  });

  it('renders the real data without a NaN anywhere', () => {
    const { container } = render(<Dashboard data={getHealthData()} />);
    expect(container.textContent).not.toMatch(/NaN|undefined|Infinity/);
    expect(container.querySelectorAll('svg[role="img"]').length).toBeGreaterThanOrEqual(7);
  });
});
