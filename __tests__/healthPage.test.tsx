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
import { HealthData, HealthDay, WeeklyTrendRow } from '@/types/health';
import WeekTable from '@/app/health/components/WeekTable';

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

/** Three complete weeks from Mon Jul 20 (or `n` days): weight drifting down, heavy Saturdays, cardio Tue/Thu. */
function fixture(n = 21, patch: (day: HealthDay, i: number) => Partial<HealthDay> = () => ({})): HealthData {
  const days: HealthDay[] = Array.from({ length: n }, (_, i) => {
    const date = new Date(Date.UTC(2026, 6, 20 + i));
    const name = NAMES[date.getUTCDay()];
    const day: HealthDay = {
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
    return { ...day, ...patch(day, i) };
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
    expect(container.innerHTML).not.toMatch(/NaN|undefined|Infinity/);
    expect(screen.queryByText('The week, by day')).not.toBeInTheDocument();
  });

  it('says so with no days at all', () => {
    render(<Dashboard data={{ ...fixture(), days: [] }} />);
    expect(screen.getByText('No data recorded yet.')).toBeInTheDocument();
  });

  it('renders the real data without a NaN anywhere', () => {
    const { container } = render(<Dashboard data={getHealthData()} />);
    expect(container.innerHTML).not.toMatch(/NaN|undefined|Infinity/);
    expect(container.querySelectorAll('svg[role="img"]').length).toBeGreaterThanOrEqual(7);
  });

  it('thins the date labels as the log grows, so they never touch', () => {
    const { container } = render(<Dashboard data={fixture(280)} />);
    // Left positions in percent, newest last; at a panel's narrowest width a label and its gap need 44px.
    const gaps = (selector: string, px: number) => {
      const lefts = Array.from(container.querySelectorAll(selector)).map((el) => parseFloat((el as HTMLElement).style.left));
      return lefts.slice(1).map((l, i) => ((l - lefts[i]) / 100) * px);
    };
    for (const g of gaps('.h-panel.is-hover.is-compact .h-ax.is-x', 300)) expect(g).toBeGreaterThanOrEqual(44);
    for (const g of gaps('.h-panel.is-hover.is-wide .h-ax.is-x:not(.is-thin)', 873)) expect(g).toBeGreaterThanOrEqual(44);
    for (const g of gaps('.h-panel.is-hover.is-wide .h-ax.is-x', 873 / 2 + 1)) expect(g).toBeGreaterThanOrEqual(44 / 2);
  });

  it('shortens the weekday labels: "over on" can drop on a tablet, and a phone shows the day alone', () => {
    const { container } = render(<Dashboard data={fixture()} />);
    expect(container.querySelector('.h-wkd.is-wide .h-wkd-over')).toHaveTextContent('over on');
    expect(container.querySelectorAll('.h-wkd.is-compact .h-wkd-day i')).toHaveLength(0);
  });

  it('places the hover line inside the plot of whichever frame is showing', () => {
    const { container } = render(<Dashboard data={fixture()} />);
    const panel = container.querySelector('.h-panel.is-hover.is-compact') as Element;
    layOut(panel);
    fireEvent.pointerMove(panel, { clientX: 500 });
    expect((panel.querySelector('.h-crosshair') as HTMLElement).style.top).not.toBe('');
  });

  it('only says "so far" of the newest week, and "first week" of the oldest', () => {
    // Wed Jul 29 missing: the middle week has six days, but it is neither the newest nor still filling up.
    const data = fixture();
    data.days = data.days.filter((d) => d.date !== '2026-07-29');
    render(<Dashboard data={data} />);
    const middle = screen.getByRole('article', { name: 'Week ending Aug 2' });
    expect(middle).toHaveTextContent('6 days recorded');
    expect(middle).not.toHaveTextContent('so far');
    expect(screen.getByRole('article', { name: 'Week ending Jul 26' })).toHaveTextContent('first week');
  });

  it('gives the weight axis a decimal when its step is under a pound', () => {
    const data = { ...fixture(3, (_d, i) => ({ weight: 200 + i * 0.1 })), phases: [] };
    const { container } = render(<Dashboard data={data} />);
    const labels = Array.from(container.querySelectorAll('.h-panel.is-hover.is-wide .h-ax.is-left')).map((el) => el.textContent);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it('does not colour a change that rounds to zero', () => {
    const row = { weekStart: '2026-07-20', weekEnd: '2026-07-26', label: 'Jul 26', dayCount: 7, isPartial: false, avgWeight: 200, weightChange: 0.03, avgCals: 2400, calsVsGoal: 0.2, avgProtein: 200, avgCarbs: 250, avgFat: 70, avgSteps: 14000, workouts: 5, cardioSessions: 3, cardioMinutes: 90 } as WeeklyTrendRow;
    render(<WeekTable rows={[row]} weightUnit="lb" />);
    const cell = screen.getByText('0.0 lb');
    expect(cell.className).not.toMatch(/is-good|is-over/);
  });

  it('says Sunday and Monday mornings are the same when the gap rounds to nothing', () => {
    render(<Dashboard data={fixture(21, () => ({ weight: 200 }))} />);
    expect(screen.getByText(/the same as Friday and Saturday mornings/)).toBeInTheDocument();
  });

  it('draws no empty facts box', () => {
    const bare = { ...fixture(21, () => ({ cals: 2300 })), calorieTargets: [] };
    const { container } = render(<Dashboard data={bare} />);
    for (const facts of Array.from(container.querySelectorAll('.h-facts'))) expect(facts.children.length).toBeGreaterThan(0);
  });

  it('draws a day with no calorie target in force as neither under nor over', () => {
    const data = { ...fixture(), calorieTargets: [{ from: '2026-07-27', cals: 2400 }] };
    const { container } = render(<Dashboard data={data} />);
    expect(container.querySelector('.h-panel.is-hover.is-wide .g-plain')?.getAttribute('d')).not.toBe('');
    expect(screen.getAllByText('No target · right').length).toBeGreaterThan(0);
  });

  it('names each grid cell for screen readers, not by colour alone', () => {
    render(<Dashboard data={fixture()} />);
    expect(screen.getAllByRole('img', { name: /^2026-07-20: Lift/ }).length).toBeGreaterThan(0);
  });
});
