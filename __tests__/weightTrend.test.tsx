import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, within } from '@testing-library/react';
import Trends from '@/app/health/components/Trends';
import WeightTrend from '@/app/health/components/WeightTrend';
import PaceChart, { paceTone } from '@/app/health/components/PaceChart';
import { trendRange, weekPoints, rangeKeys } from '@/app/health/components/trendRange';
import { buildPhases, buildWeeklyTrend, leadPhase } from '@/lib/health';
import type { HealthCalorieTarget, HealthDay, HealthPhase } from '@/types/health';

// The Trends shell, the weight chart and pounds per week (spec 2026-11-16, step 2). Wes alternates cuts and bulks,
// so the fixture is a cut that closed short of its goal and a lean bulk with a planned pace.

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

const NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const iso = (i: number) => new Date(Date.UTC(2026, 6, 20 + i)).toISOString().slice(0, 10);

/** Mon Jul 20 to Sun Nov 15, 2026: 119 days, a cut for the first 98, the lean bulk for the last 21. */
function makeDays(n = 119, patch: (d: HealthDay, i: number) => Partial<HealthDay> = () => ({})): HealthDay[] {
  return Array.from({ length: n }, (_, i) => {
    const date = iso(i);
    const bulk = i >= 98;
    const d: HealthDay = {
      date,
      day: NAMES[new Date(`${date}T12:00:00Z`).getUTCDay()],
      cals: bulk ? 2780 : 2300,
      protein: 205,
      carbs: 250,
      fat: 70,
      weight: Math.round((bulk ? 201.3 + (i - 98) * 0.07 : 210 - i * 0.09) * 10) / 10,
      steps: 14000,
      workout: 'Lift',
      cardio: false,
      cardioMinutes: null,
      cardioNote: '',
      notes: '',
    };
    return { ...d, ...patch(d, i) };
  });
}
const PHASES: HealthPhase[] = [
  { start: '2026-07-20', type: 'cut', label: 'Cut', goalWeight: 195 },
  { start: '2026-10-26', type: 'bulk', label: 'Lean bulk', goalWeight: 220, ratePerWeek: 0.5 },
];
const TARGETS: HealthCalorieTarget[] = [
  { from: '2026-07-20', cals: 2400 },
  { from: '2026-10-26', cals: 2700 },
];

function setup(days = makeDays(), phasesIn: HealthPhase[] = PHASES, calorieTargets = TARGETS) {
  const phases = buildPhases(days, phasesIn);
  return {
    days,
    phases,
    weeklyTrend: buildWeeklyTrend(days, calorieTargets, phases),
    lead: leadPhase(phases, days),
    calorieTargets,
  };
}

function renderTrends(s = setup()) {
  return render(
    <Trends
      eyebrow="Health · Lean bulk, week 3"
      title="Trends"
      days={s.days}
      weeklyTrend={s.weeklyTrend}
      phases={s.phases}
      leadPhase={s.lead}
      calorieTargets={s.calorieTargets}
      targets={[]}
      weightUnit="lb"
    />,
  );
}

const range = (name: string) => screen.getByRole('button', { name });
const wide = (c: HTMLElement, chart: string) => c.querySelector(`${chart}.is-wide`) as HTMLElement;
const pathCount = (el: Element | null) => (el?.getAttribute('d') ?? '').match(/M/g)?.length ?? 0;
const fit = (c: HTMLElement) => [...c.querySelectorAll('.h-fit b')].map((b) => b.textContent);

describe('the range switch', () => {
  it('offers 8 weeks, this block and everything, starting on 8 weeks, beside the title', () => {
    renderTrends();
    const header = screen.getByRole('heading', { level: 1, name: 'Trends' }).closest('header') as HTMLElement;
    const group = within(header).getByRole('group', { name: 'How far back' });
    expect(within(group).getAllByRole('button').map((b) => b.textContent)).toEqual(['8 weeks', 'This block', 'Everything']);
    expect(range('8 weeks')).toHaveAttribute('aria-pressed', 'true');
  });

  it('leaves out "This block" when the newest day is in no block', () => {
    const days = makeDays();
    expect(rangeKeys(days, [])).toEqual(['w8', 'all']);
    renderTrends(setup(days, []));
    expect(screen.queryByRole('button', { name: 'This block' })).toBeNull();
  });

  it('redraws weight and pounds per week for the range', () => {
    const { container } = renderTrends();
    const dots = () => pathCount(wide(container, '.h-wt').querySelector('.g-day'));
    const bars = () => ['to', 'away', 'flat'].reduce((n, t) => n + pathCount(wide(container, '.h-pace').querySelector(`.g-${t}`)), 0);
    expect(dots()).toBe(56);
    expect(bars()).toBe(8);
    fireEvent.click(range('This block'));
    expect(range('This block')).toHaveAttribute('aria-pressed', 'true');
    expect(dots()).toBe(21);
    expect(bars()).toBe(3);
    fireEvent.click(range('Everything'));
    expect(dots()).toBe(119);
    expect(bars()).toBe(16); // 17 weeks, the first with no week before it
  });

  it('counts a week in a range when at least four of its days are in it', () => {
    const days = makeDays(24); // Mon Jul 20 to Wed Aug 12: the fourth week has three days
    const r = trendRange(days, 'all', []);
    const s = setup(days, []);
    expect(weekPoints(r.days, s.weeklyTrend)).toHaveLength(3);
    expect(weekPoints(makeDays(25), setup(makeDays(25), []).weeklyTrend)).toHaveLength(4);
  });
});

describe('the weight chart', () => {
  it("names each block with its dates and net change, longest to shortest", () => {
    const { container } = renderTrends();
    fireEvent.click(range('Everything'));
    const words = fit(wide(container, '.h-wt'));
    const s = setup();
    const cut = s.phases[0].weightChange as number;
    const sign = (v: number) => (v < 0 ? '−' : '+') + Math.abs(v).toFixed(1);
    expect(words).toEqual(
      expect.arrayContaining([
        `CUT · Jul 20 – Oct 25 · ${sign(cut)} lb`,
        `CUT · ${sign(cut)} lb`,
        'CUT',
        expect.stringMatching(/^LEAN BULK · since Oct 26 · \+\d\.\d lb$/),
        expect.stringMatching(/^LEAN BULK · \+\d\.\d lb$/),
        'LEAN BULK',
      ]),
    );
  });

  it('labels a goal off the scale with an arrow, at the top of its block', () => {
    const { container } = renderTrends();
    fireEvent.click(range('Everything'));
    const words = fit(wide(container, '.h-wt'));
    // The cut ended near 201.3 against 195; the bulk is near 202.7 against 220.
    expect(words).toContainEqual(expect.stringMatching(/^goal 195 ↓ ended \d\.\d lb short$/));
    expect(words).toContainEqual('goal 195 ↓');
    expect(words).toContainEqual(expect.stringMatching(/^goal 220 ↑ 1\d\.\d lb to go$/));
    expect(words).toContainEqual('goal 220 ↑');
    expect(wide(container, '.h-wt').querySelector('.g-goal')).toBeNull();
  });

  it('draws a goal inside the scale as a dashed line over its block, named on the line', () => {
    const phases: HealthPhase[] = [PHASES[0], { ...PHASES[1], goalWeight: 202.5 }];
    const { container } = renderTrends(setup(makeDays(), phases));
    const goals = wide(container, '.h-wt').querySelectorAll('.g-goal');
    expect(goals).toHaveLength(1);
    expect(screen.getAllByText('Lean bulk goal 202.5')).toHaveLength(2); // both frames
    expect(fit(container).some((t) => t?.startsWith('goal 202.5'))).toBe(false);
    expect(screen.getAllByText('Goal').length).toBeGreaterThan(0); // the legend
  });

  it('draws the plan line only for a block with a planned pace', () => {
    const { container } = renderTrends();
    fireEvent.click(range('Everything'));
    expect(wide(container, '.h-wt').querySelectorAll('.g-plan')).toHaveLength(1);
    expect(within(wide(container, '.h-wt')).getByText('plan')).toBeInTheDocument();
    expect(screen.getAllByText('Plan').length).toBeGreaterThan(0);

    const none = render(
      <WeightTrend {...(() => {
        const s = setup(makeDays(), [PHASES[0], { ...PHASES[1], ratePerWeek: null }]);
        return { range: trendRange(s.days, 'all', s.phases), weeklyTrend: s.weeklyTrend, phases: s.phases, calorieTargets: TARGETS, lead: s.lead, weightUnit: 'lb' };
      })()} />,
    );
    expect(none.container.querySelector('.g-plan')).toBeNull();
    expect(within(none.container).queryByText('Plan')).toBeNull();
  });

  it('tints alternate blocks and rules where each block after the first begins', () => {
    const { container } = renderTrends();
    fireEvent.click(range('Everything'));
    expect(pathCount(wide(container, '.h-wt').querySelector('.g-band'))).toBe(1);
    expect(pathCount(wide(container, '.h-wt').querySelector('path.g-block'))).toBe(1);
  });

  it('draws a calorie bar a day up to 70 days, and a bar a week beyond', () => {
    const { container } = renderTrends();
    const bars = () => ['hit', 'close', 'miss'].reduce((n, l) => n + pathCount(wide(container, '.h-wt').querySelector(`.g-${l}`)), 0);
    expect(bars()).toBe(56);
    expect(screen.getAllByText('Calories against the day’s target')).toHaveLength(2);
    fireEvent.click(range('Everything'));
    expect(bars()).toBe(17);
    expect(screen.getByText('Calories against target, weekly average')).toBeInTheDocument();
    expect(screen.getByText('Calories against target, by week')).toBeInTheDocument();
  });

  it('colours each calorie bar on the rule of the block the day is in', () => {
    // 2,780 against 2,700 is 3% over: on target for a bulk. The same 3% over 2,400 on a cut is only close.
    const days = makeDays(119, (d, i) => (i >= 70 && i < 98 ? { cals: 2472 } : i >= 112 ? { cals: 3200 } : {}));
    const { container } = renderTrends(setup(days));
    const count = (l: string) => pathCount(wide(container, '.h-wt').querySelector(`.g-${l}`));
    // 8 weeks from Sep 21: 35 cut days (7 at 2,300, 28 at 2,472), then 21 bulk days (14 at 2,780, 7 at 3,200).
    expect(count('hit')).toBe(7 + 14);
    expect(count('close')).toBe(28);
    expect(count('miss')).toBe(7);
    expect(screen.getAllByText('Calories on target').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Off target').length).toBeGreaterThan(0);
  });

  it('labels the ruler with each calorie target, and says "target" on the first', () => {
    const { container } = renderTrends();
    const words = [...wide(container, '.h-wt').querySelectorAll('.h-fit.is-ruler b')].map((b) => b.textContent);
    expect(words).toEqual(['target 2,400', '2,400', '2,700']);
  });

  it('labels the newest weekly average, the first in range and the lowest', () => {
    const { container } = renderTrends();
    const values = [...wide(container, '.h-wt').querySelectorAll('.h-ax.is-val')].map((e) => e.textContent);
    const s = setup();
    const inRange = weekPoints(trendRange(s.days, 'w8', s.phases).days, s.weeklyTrend).map((p) => (p.row.avgWeight as number).toFixed(1));
    const low = [...inRange].sort()[0];
    expect(values).toEqual([inRange[inRange.length - 1], inRange[0], low]);
  });

  it('states the newest week, the change over the weeks shown, and the distance to the goal', () => {
    const { container } = renderTrends();
    const facts = wide(container, '.h-wt').parentElement!.querySelector('.h-facts') as HTMLElement;
    const s = setup();
    const last = s.weeklyTrend[s.weeklyTrend.length - 1];
    expect(within(facts).getByText('Week ending Nov 15').nextElementSibling).toHaveTextContent(`${(last.avgWeight as number).toFixed(1)} lb`);
    expect(within(facts).getByText(/lb on the week before$/)).toBeInTheDocument();
    const pts = weekPoints(trendRange(s.days, 'w8', s.phases).days, s.weeklyTrend);
    const a = (pts[0].row.avgWeight as number).toFixed(1);
    const b = (pts[pts.length - 1].row.avgWeight as number).toFixed(1);
    expect(within(facts).getByText('Over the 8 weeks shown')).toBeInTheDocument();
    expect(within(facts).getByText(`${a} to ${b} lb, weekly averages`)).toBeInTheDocument();
    expect(within(facts).getByText('To the goal').nextElementSibling).toHaveTextContent(`${(s.lead!.goalRemaining as number).toFixed(1)} lb`);
    expect(within(facts).getByText('220 lb, the lean bulk’s goal')).toBeInTheDocument();
  });

  it('reads the day under the pointer: phase, weights, calories against target toned by the block', () => {
    const { container } = renderTrends();
    const panel = wide(container, '.h-wt');
    panel.getBoundingClientRect = () => ({ left: 0, top: 0, width: 1000, height: 500, right: 1000, bottom: 500, x: 0, y: 0, toJSON: () => ({}) });
    // 56 days across 900 units from x 50: the last day is a bulk day, 2,780 against 2,700.
    fireEvent.pointerMove(panel, { clientX: 945, pointerType: 'mouse' });
    const tip = panel.querySelector('.h-tip') as HTMLElement;
    expect(within(tip).getByText('Sun Nov 15')).toBeInTheDocument();
    expect(within(tip).getByText('Phase').nextElementSibling).toHaveTextContent('Lean bulk');
    expect(within(tip).getByText('Against target').nextElementSibling).toHaveTextContent('+80');
    expect(within(tip).getByText('Against target').nextElementSibling).toHaveClass('is-good');
    // Its tip stays inside the panel at the right edge.
    expect(parseFloat(tip.style.left) + 230).toBeLessThanOrEqual(1000);
    fireEvent.pointerMove(panel, { clientX: 60, pointerType: 'mouse' });
    expect(within(panel.querySelector('.h-tip') as HTMLElement).getByText('Phase').nextElementSibling).toHaveTextContent('Cut');
    // A tap leaves its tip up.
    fireEvent.pointerLeave(panel, { pointerType: 'touch' });
    expect(panel.querySelector('.h-tip')).not.toBeNull();
  });

  it('is an image with a name, in both frames', () => {
    const { container } = renderTrends();
    for (const v of ['is-wide', 'is-compact']) {
      expect(container.querySelector(`.h-wt.${v} svg`)).toHaveAttribute('role', 'img');
      expect(container.querySelector(`.h-wt.${v} svg`)!.getAttribute('aria-label')).toMatch(/Weight by day/);
    }
  });
});

describe('pounds per week', () => {
  it('colours a bar toward the block’s goal, away from it, or neither', () => {
    expect(paceTone(0.4, 'bulk')).toBe('to');
    expect(paceTone(-0.4, 'bulk')).toBe('away');
    expect(paceTone(-0.4, 'cut')).toBe('to');
    expect(paceTone(0.4, 'cut')).toBe('away');
    expect(paceTone(0.4, 'maintain')).toBe('flat');
    expect(paceTone(0.4, null)).toBe('flat');
    expect(paceTone(0.03, 'bulk')).toBe('flat');
  });

  it('draws the plan band only over a block with a planned pace, and names the plan on the block', () => {
    const { container } = renderTrends();
    fireEvent.click(range('Everything'));
    const pace = wide(container, '.h-pace');
    expect(pathCount(pace.querySelector('.g-planband'))).toBe(1);
    expect(pathCount(pace.querySelector('.g-plan'))).toBe(1);
    expect(fit(pace)).toEqual(['CUT', 'LEAN BULK · plan +0.5 lb a week', 'LEAN BULK · plan +0.5', 'LEAN BULK']);
    expect(screen.getByText('Planned pace')).toBeInTheDocument();

    const none = renderTrends(setup(makeDays(), [PHASES[0], { ...PHASES[1], ratePerWeek: null }]));
    expect(none.container.querySelectorAll('.h-pace .g-planband')[0].getAttribute('d')).toBe('');
  });

  it('labels every bar when the weeks are wide enough, otherwise only the newest', () => {
    const { container } = renderTrends();
    expect(wide(container, '.h-pace').querySelectorAll('.h-ax.is-sm')).toHaveLength(8);
    fireEvent.click(range('Everything'));
    // 16 bars at 873px: a week is about 51px, still room.
    expect(wide(container, '.h-pace').querySelectorAll('.h-ax.is-sm')).toHaveLength(16);
    // The compact frame at 300px gives a week about 18px: the newest alone.
    expect(container.querySelectorAll('.h-pace.is-compact .h-ax.is-sm')).toHaveLength(1);
  });

  it('states last week, the block’s average week on week, the plan, and this week against the plan line', () => {
    const { container } = renderTrends();
    const facts = container.querySelector('.h-pace')!.parentElement!.querySelector('.h-facts') as HTMLElement;
    expect(within(facts).getByText('Last week')).toBeInTheDocument();
    expect(within(facts).getByText('week ending Nov 15')).toBeInTheDocument();
    expect(within(facts).getByText('This bulk, week on week')).toBeInTheDocument();
    // The bulk's first week is measured against the cut's last.
    expect(within(facts).getByText('a week on average, over 3 weeks; the first measured from the week before the block')).toBeInTheDocument();
    expect(within(facts).getByText('The plan').nextElementSibling).toHaveTextContent('+0.5 lb');
    expect(within(facts).getByText('Against the plan line')).toBeInTheDocument();
    expect(within(facts).getByText(/(above|below) it this week; the line starts at the block’s first weigh-in/)).toBeInTheDocument();
  });

  it('leaves out the plan facts for a block without a pace', () => {
    const { container } = renderTrends(setup(makeDays(), [PHASES[0], { ...PHASES[1], ratePerWeek: null }]));
    const facts = container.querySelector('.h-pace')!.parentElement!.querySelector('.h-facts') as HTMLElement;
    expect(within(facts).queryByText('The plan')).toBeNull();
    expect(within(facts).queryByText('Against the plan line')).toBeNull();
    expect(within(facts).getAllByText(/Last week|This bulk, week on week/)).toHaveLength(2);
  });

  it('reads the week under the pointer', () => {
    const s = setup();
    const { container } = render(
      <PaceChart range={trendRange(s.days, 'w8', s.phases)} weeklyTrend={s.weeklyTrend} phases={s.phases} lead={s.lead} weightUnit="lb" />,
    );
    const panel = wide(container as HTMLElement, '.h-pace');
    panel.getBoundingClientRect = () => ({ left: 0, top: 0, width: 1000, height: 300, right: 1000, bottom: 300, x: 0, y: 0, toJSON: () => ({}) });
    fireEvent.pointerMove(panel, { clientX: 930, pointerType: 'mouse' });
    const tip = panel.querySelector('.h-tip') as HTMLElement;
    expect(within(tip).getByText('Week ending Nov 15')).toBeInTheDocument();
    expect(within(tip).getByText('Planned').nextElementSibling).toHaveTextContent('+0.5 lb');
  });
});
