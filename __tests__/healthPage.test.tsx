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
  currentPhase,
  getHealthData,
  leadPhase,
  groupIntoWeeks,
  summarize,
} from '@/lib/health';
import { HealthData, HealthDay, WeeklyTrendRow } from '@/types/health';
import WeekTable from '@/app/health/components/WeekTable';
import HealthNav from '@/app/health/components/HealthNav';
import { SECTIONS, type HealthSection } from '@/app/health/sections';
import { buildCalendarDays } from '@/lib/healthCalendar';

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

/** Every section, in menu order (or just `only`): the five /health pages stacked. */
function Dashboard({ data, only }: { data: HealthData; only?: HealthSection }) {
  if (data.days.length === 0) return <p className="h-note">No data recorded yet.</p>;
  const phases = buildPhases(data.days, data.phases);
  const props = {
    calendarDays: buildCalendarDays(data.days, { ...data, phases }),
    days: data.days,
    weeks: groupIntoWeeks(data.days),
    summary: summarize(data.days, data.targets),
    weeklyTrend: buildWeeklyTrend(data.days, data.calorieTargets, phases),
    phases,
    activePhase: currentPhase(phases),
    leadPhase: leadPhase(phases, data.days),
    markers: data.markers ?? [],
    noteMarks: data.noteMarks ?? [],
    calorieTargets: data.calorieTargets ?? [],
    targets: data.targets ?? [],
    weeklyGoals: buildWeeklyGoals(data.days, data.targets),
    changeLog: buildChangeLog(data),
    stepStreaks: buildStepStreaks(data.days, data.targets),
    lastUpdated: data.lastUpdated,
    weightUnit: data.units.weight,
  };
  return (
    <>
      {SECTIONS.filter((s) => !only || s.id === only).map((s) => (
        <HealthDashboard key={s.id} section={s.id} {...props} />
      ))}
    </>
  );
}

/** Pretend an element is laid out 1000px wide from the left edge, matching the charts' 1000-unit viewBox. */
function layOut(el: Element) {
  jest.spyOn(el, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, width: 1000, height: 400, right: 1000, bottom: 400, x: 0, y: 0, toJSON: () => ({}) });
}

describe('/health', () => {
  it('draws each page’s own sections, in order', () => {
    const headings = (only: HealthSection) => {
      const { unmount } = render(<Dashboard data={fixture()} only={only} />);
      const out = screen.queryAllByRole('heading', { level: 2 }).map((h) => h.textContent);
      unmount();
      return out;
    };
    expect(headings('week')).toEqual(['The log']);
    expect(headings('calendar')).toEqual(['August 2026']);
    expect(headings('trends')).toEqual([
      'Weight',
      'Pounds per week',
      'What a day’s calories do to the next morning',
      'The week, by day',
      'Steps',
      'Protein, carbs and fat',
    ]);
    expect(headings('habits')).toEqual(['Consistency']);
    expect(headings('records')).toEqual(['Records']);
  });

  it('titles each page for its section, under one eyebrow naming the block and its week', () => {
    for (const s of SECTIONS) {
      const { unmount } = render(<Dashboard data={fixture()} only={s.id} />);
      const titles = screen.getAllByRole('heading', { level: 1 });
      expect(titles.map((h) => h.textContent)).toEqual([s.title]);
      expect(titles[0].closest('header')).toHaveTextContent('Health · Cut, week 3');
      expect(screen.queryByText(/Daily tracker/)).toBeNull();
      unmount();
    }
  });

  it('says "updated weekly" in the eyebrow with no block', () => {
    render(<Dashboard data={{ ...fixture(), phases: [] }} only="week" />);
    expect(screen.getByRole('heading', { level: 1, name: 'This week' }).closest('header')).toHaveTextContent('Health · updated weekly');
  });

  it('keys the log’s day dots beside its heading', () => {
    render(<Dashboard data={fixture()} only="week" />);
    const row = screen.getByRole('heading', { level: 2, name: 'The log' }).parentElement as HTMLElement;
    const key = row.querySelector('.h-legend') as HTMLElement;
    expect(key).not.toBeNull();
    for (const name of ['Lift', 'Cardio', 'Rest', 'Church']) expect(within(key).getByText(name, { exact: false })).toBeInTheDocument();
    expect(key.querySelector('.h-dot.is-lift')).not.toBeNull();
    expect(key.querySelector('.h-rest')).not.toBeNull();
  });

  it('keeps each week’s "Week ending" eyebrow on its own unbreakable line', () => {
    const { container } = render(<Dashboard data={fixture()} only="week" />);
    const eyebrows = [...container.querySelectorAll('.h-week .eyebrow')];
    expect(eyebrows).toHaveLength(3);
    for (const e of eyebrows) {
      expect(e).toHaveTextContent(/^Week ending/);
      expect(e).toHaveClass('h-wk-eyebrow'); // white-space: nowrap in health.css
    }
  });

  it('prints the cardio-morning figures in plain ink: a pattern, not a result', () => {
    render(<Dashboard data={fixture()} only="habits" />);
    for (const label of ['The morning after cardio', 'The morning after none']) {
      const figure = screen.getByText(label).nextElementSibling as HTMLElement;
      expect(figure).toHaveClass('h-n');
      expect(figure).not.toHaveClass('is-good');
      expect(figure).not.toHaveClass('is-over');
    }
  });

  it('calls a day 20% or more over its target a big day', () => {
    // The fixture's Saturdays eat 3,000 against 2,400: 1.25 times the target.
    render(<Dashboard data={fixture()} only="trends" />);
    expect(screen.getByText(/A big day, 20% or more over target/)).toBeInTheDocument();
    expect(screen.getByText('The mornings after a big day')).toBeInTheDocument();
    expect(screen.getByText('After a big day')).toBeInTheDocument();
    expect(screen.queryByText(/2,900/)).toBeNull();
  });

  it('marks the page it is on in the menu, and links every section', () => {
    render(<HealthNav current="calendar" />);
    const links = screen.getAllByRole('link');
    expect(links.map((a) => a.getAttribute('href'))).toEqual(['/health', '/health/calendar', '/health/trends', '/health/habits', '/health/records']);
    expect(screen.getByRole('link', { current: 'page' })).toHaveAttribute('href', '/health/calendar');
  });

  it('opens the calendar on the newest month and steps back a month', () => {
    render(<Dashboard data={fixture()} only="calendar" />);
    expect(screen.getByRole('heading', { name: 'August 2026' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next month' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Previous month' }));
    expect(screen.getByRole('heading', { name: 'July 2026' })).toBeInTheDocument();
    // Jul 20 opens the log: the 1st to the 19th are drawn but empty, so 12 days carry a reading.
    expect(screen.getAllByRole('button', { name: /^Jul \d+:/ })).toHaveLength(12);
  });

  it('names each day’s lights in words, and shows the picked day’s numbers', () => {
    render(<Dashboard data={fixture()} only="calendar" />);
    // Saturdays run 3,000 kcal against a 2,400 target: a miss on a cut, said in words, not by colour alone.
    const sat = screen.getByRole('button', { name: /^Aug 8:.*calories 3,000 missed/ });
    fireEvent.click(sat);
    expect(sat).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('heading', { level: 3, name: /Saturday, Aug 8/ })).toBeInTheDocument();
    expect(screen.getByText('+600 vs the 2,400 target')).toBeInTheDocument();
  });

  it('opens the calendar on the month the newest week began in, not a month holding one day', () => {
    const data = fixture(13); // Mon Jul 20 – Sat Aug 1: the newest week began Jul 27
    render(<Dashboard data={data} only="calendar" />);
    expect(screen.getByRole('heading', { name: 'July 2026' })).toBeInTheDocument();
  });

  it('switches the calendar between lights and numbers', () => {
    const { container } = render(<Dashboard data={fixture()} only="calendar" />);
    expect(container.querySelectorAll('.h-cal-dot').length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: 'Numbers' }));
    expect(container.querySelector('.h-cal-lights')).toBeNull();
    expect(container.querySelectorAll('.h-cal-wt').length).toBe(9);
  });

  it('reads the day under the pointer on the weight chart, and clears on leaving', () => {
    const { container } = render(<Dashboard data={fixture()} />);
    const panel = container.querySelector('.h-wt.is-wide') as Element;
    layOut(panel);
    // 21 bands across 1000 - 50 - 50 units; the middle of band 10 is Thu Jul 30.
    fireEvent.pointerMove(panel, { clientX: 50 + (900 / 21) * 10.5 });
    const tip = container.querySelector('.h-tip') as HTMLElement;
    expect(within(tip).getByText('Thu Jul 30')).toBeInTheDocument();
    expect(within(tip).getByText('Phase').nextElementSibling).toHaveTextContent('Cut');
    expect(within(tip).getByText('Week average')).toBeInTheDocument();
    // 2,300 against 2,400 on a cut: under the target, which the calendar calls a hit.
    expect(within(tip).getByText('Against target').nextElementSibling).toHaveTextContent('−100');
    expect(within(tip).getByText('Against target').nextElementSibling).toHaveClass('is-good');
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
    expect(screen.getByText('+400 kcal', { selector: '.h-n' })).toBeInTheDocument();
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

  it('keeps telling the closed block until the new one has a day', () => {
    // The fixture ends Sun Aug 9; a bulk starting the next Monday has no days yet.
    const data = fixture();
    data.phases = [...(data.phases ?? []), { start: '2026-08-10', type: 'bulk', label: 'Lean bulk', goalWeight: 220 }];
    render(<Dashboard data={data} />);
    expect(screen.getByText(/The cut · Jul 20 – Aug 9 · 3 weeks ·/)).toBeInTheDocument();
    expect(screen.getByText(/The lean bulk starts Aug 10\./)).toBeInTheDocument();
    expect(screen.getByText('Ended at')).toBeInTheDocument();
    expect(screen.queryByText(/week 0/)).not.toBeInTheDocument();
  });

  it('names the calorie balance a surplus when intake runs over maintenance', () => {
    render(<Dashboard data={fixture(21, (_, i) => ({ weight: 200 + i * 0.15 }))} />);
    expect(screen.getByText('Est. surplus')).toBeInTheDocument();
    expect(screen.queryByText('Est. deficit')).not.toBeInTheDocument();
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

  it('draws every Trends chart from the real data in each range, each named for screen readers', () => {
    const { container } = render(<Dashboard data={getHealthData()} only="trends" />);
    for (const name of ['8 weeks', 'Everything']) {
      fireEvent.click(screen.getByRole('button', { name }));
      expect(container.innerHTML).not.toMatch(/NaN|undefined|Infinity/);
      const charts = Array.from(container.querySelectorAll('svg[role="img"]'));
      // Weight, pounds per week, the scatter and the mornings after, two weekday charts, steps, macros: two frames each.
      expect(charts).toHaveLength(16);
      for (const svg of charts) expect(svg.getAttribute('aria-label')).toMatch(/\w/);
    }
  });

  it('thins the date labels as the log grows, so they never touch', () => {
    const { container } = render(<Dashboard data={fixture(280)} only="trends" />);
    fireEvent.click(screen.getByRole('button', { name: 'Everything' }));
    // Left positions in percent, newest last; at a panel's narrowest width a label and its gap need 44px.
    const gaps = (selector: string, px: number) => {
      const lefts = Array.from(container.querySelectorAll(selector)).map((el) => parseFloat((el as HTMLElement).style.left));
      return lefts.slice(1).map((l, i) => ((l - lefts[i]) / 100) * px);
    };
    for (const chart of ['.h-wt', '.h-pace']) {
      expect(container.querySelectorAll(`${chart}.is-wide .h-ax.is-x`).length).toBeGreaterThan(5);
      for (const g of gaps(`${chart}.is-compact .h-ax.is-x`, 300)) expect(g).toBeGreaterThanOrEqual(44);
      for (const g of gaps(`${chart}.is-wide .h-ax.is-x:not(.is-thin)`, 873)) expect(g).toBeGreaterThanOrEqual(44);
      for (const g of gaps(`${chart}.is-wide .h-ax.is-x`, 873 / 2 + 1)) expect(g).toBeGreaterThanOrEqual(44 / 2);
    }
  });

  it('counts the days over under each calorie column: the wording shortens with the chart, down to 3/3', () => {
    const { container } = render(<Dashboard data={fixture()} />);
    // Saturdays run 3,000 against 2,400 every week; every other day is under.
    const days = (sel: string) => Array.from(container.querySelectorAll(`${sel} .h-wkd-day`)).map((el) => el.textContent);
    // The wide frame carries every wording; container queries show one (jsdom shows them all).
    const wide = (sel: string) => Array.from(container.querySelectorAll(`.h-wkd.is-cal.is-wide .h-wkd-day ${sel}`)).map((el) => el.textContent);
    expect(wide('.h-wkd-long')).toEqual(['over on 0 of 3', 'over on 0 of 3', 'over on 0 of 3', 'over on 0 of 3', 'over on 0 of 3', 'over on 3 of 3', 'over on 0 of 3']);
    expect(wide('.h-wkd-short')).toEqual(['0/3', '0/3', '0/3', '0/3', '0/3', '3/3', '0/3']);
    expect(container.querySelector('.h-wkd.is-cal.is-wide .h-wkd-over')).toHaveTextContent('over on'); // dropped first
    expect(days('.h-wkd.is-cal.is-compact')).toEqual(['Mon0/3', 'Tue0/3', 'Wed0/3', 'Thu0/3', 'Fri0/3', 'Sat3/3', 'Sun0/3']);
    // The weigh-in chart names the days alone.
    expect(days('.h-wkd.is-wt.is-wide')).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
  });

  it('draws the two weekday charts as a pair, each in both frames', () => {
    const { container } = render(<Dashboard data={fixture()} only="trends" />);
    const pair = container.querySelector('.h-two.is-even') as HTMLElement;
    expect(pair.children).toHaveLength(2);
    for (const kind of ['cal', 'wt']) {
      for (const v of ['wide', 'compact']) expect(pair.querySelector(`.h-wkd.is-${kind}.is-${v} svg[role="img"]`)).not.toBeNull();
    }
  });

  it('prints the next-morning and weekday figures in plain ink: patterns, not results', () => {
    render(<Dashboard data={fixture()} only="trends" />);
    const labels = [
      'After a day over target',
      'After a day at or under',
      'After a big day',
      'Three days after one',
      'Friday to Sunday',
      'Monday to Thursday',
      'Sunday and Monday mornings',
    ];
    for (const label of labels) {
      const figure = screen.getByText(label).nextElementSibling as HTMLElement;
      expect(figure).toHaveClass('h-n');
      expect(figure.className).not.toMatch(/is-good|is-over/);
    }
  });

  it('names only the newest big day, "so far" while its mornings are still coming', () => {
    // The fixture ends Sun Aug 9: Saturday Aug 8 is big (3,000 against 2,400) and has one morning after it.
    const { container } = render(<Dashboard data={fixture()} only="trends" />);
    const named = Array.from(container.querySelectorAll('.h-after .is-named')).map((el) => el.textContent);
    expect(named).toEqual(['Aug 8 · so far', 'Aug 8 · so far']);
    // No other big day is labelled: the average and every day are named instead.
    expect(container.querySelector('.h-after')).not.toHaveTextContent(/Jul 25|Aug 1/);
    expect(container.querySelector('.h-after .h-panel.is-wide')).toHaveTextContent('big days');
    expect(container.querySelector('.h-after .h-panel.is-wide')).toHaveTextContent('every day');
    // One faint line per big day with a morning after it, the middle half as a band.
    const wide = container.querySelector('.h-after .h-panel.is-wide') as HTMLElement;
    expect(wide.querySelector('.g-one')?.getAttribute('d')?.match(/M/g)).toHaveLength(3);
    expect(wide.querySelector('.g-aband')?.getAttribute('d')).toMatch(/Z$/);
    expect(wide.querySelector('.g-every')?.getAttribute('d')).not.toBe('');
  });

  it('names the newest big day plainly once its three mornings are in', () => {
    // Out to Wed Aug 12: Aug 8 has Aug 9, 10 and 11 after it.
    const { container } = render(<Dashboard data={fixture(24)} only="trends" />);
    const named = Array.from(container.querySelectorAll('.h-after .is-named')).map((el) => el.textContent);
    expect(named).toEqual(['Aug 8, the newest', 'Aug 8, the newest']);
  });

  it('draws steps and macros over the range picked', () => {
    const { container } = render(<Dashboard data={fixture(280)} only="trends" />);
    const dots = () =>
      Array.from(container.querySelectorAll('.h-series.is-wide .g-day')).map((el) => (el.getAttribute('d')?.match(/M/g) ?? []).length);
    // 8 weeks: the last 56 days, a dot each, in the steps chart and the macros chart.
    expect(dots()).toEqual([56, 56]);
    expect(screen.getByText(/it met the 200 g goal on/)).toHaveTextContent(/ of 56 days shown\./);
    fireEvent.click(screen.getByRole('button', { name: 'Everything' }));
    expect(dots()).toEqual([280, 280]);
    expect(screen.getByText(/it met the 200 g goal on/)).toHaveTextContent(/ of 280 days shown\./);
  });

  it('names every steps and macros line at its right end', () => {
    const { container } = render(<Dashboard data={fixture()} only="trends" />);
    const [steps, macros] = Array.from(container.querySelectorAll('.h-series.is-wide')) as HTMLElement[];
    for (const name of ['14k', 'goal 13.5k', 'floor 10k']) expect(within(steps).getByText(name)).toBeInTheDocument();
    for (const name of ['Protein 205', 'Carbs 240', 'Fat 70', 'goal 200']) expect(within(macros).getByText(name)).toBeInTheDocument();
  });

  it('steps the steps goal and the protein goal where they were revised', () => {
    const data = fixture();
    data.targets = [...(data.targets ?? []), { from: '2026-08-03', stepsGoal: 15000, proteinGoal: 210 }];
    const { container } = render(<Dashboard data={data} only="trends" />);
    const [steps, macros] = Array.from(container.querySelectorAll('.h-series.is-wide')) as HTMLElement[];
    // One path each, flat, then a step up on Aug 3: H…V…H.
    expect(steps.querySelector('.g-line')?.getAttribute('d')).toMatch(/^M[\d. ]+H[\d.]+V[\d.]+H[\d.]+$/);
    expect(macros.querySelector('.g-line')?.getAttribute('d')).toMatch(/^M[\d. ]+H[\d.]+V[\d.]+H[\d.]+$/);
    expect(within(steps).getByText('goal 15k')).toBeInTheDocument();
    expect(within(macros).getByText('goal 210')).toBeInTheDocument();
    // Each day against the goal in force: 205 g met 200 before Aug 3, missed 210 after: 14 of 21.
    expect(screen.getByText(/it met the 210 g goal on/)).toHaveTextContent('it met the 210 g goal on 14 of 21 days shown.');
  });

  it('counts the protein days in the macros footer', () => {
    render(<Dashboard data={fixture(21, (_d, i) => ({ protein: i % 3 === 0 ? 190 : 205 }))} only="trends" />);
    expect(screen.getByText(/it met the 200 g goal on/)).toHaveTextContent('it met the 200 g goal on 14 of 21 days shown.');
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
    const labels = Array.from(container.querySelectorAll('.h-wt.is-wide .h-ax.is-w')).map((el) => el.textContent);
    expect(labels.length).toBeGreaterThan(1);
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

  it('draws no calorie bar for a day with no target in force', () => {
    // No target until Jul 27: the first week has nothing to measure against.
    const data = { ...fixture(), calorieTargets: [{ from: '2026-07-27', cals: 2400 }] };
    const { container } = render(<Dashboard data={data} only="trends" />);
    const d = ['hit', 'close', 'miss'].map((l) => container.querySelector(`.h-wt.is-wide .g-${l}`)?.getAttribute('d') ?? '').join('');
    expect(d.match(/M/g)).toHaveLength(14);
  });

  it('names each grid cell for screen readers, not by colour alone', () => {
    render(<Dashboard data={fixture()} />);
    expect(screen.getAllByRole('img', { name: /^2026-07-20: Lift/ }).length).toBeGreaterThan(0);
  });
});
