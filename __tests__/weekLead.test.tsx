import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import WeekLead from '@/app/health/components/WeekLead';
import { PhaseSummary, WeeklyTrendRow } from '@/types/health';

function row(overrides: Partial<WeeklyTrendRow> & { weekStart: string }): WeeklyTrendRow {
  return {
    weekEnd: '2026-08-23',
    label: 'Aug 17',
    dayCount: 7,
    isPartial: false,
    avgWeight: 203.5,
    weightChange: -0.4,
    avgCals: 2393,
    calsVsGoal: -57,
    avgProtein: 201,
    avgCarbs: 270,
    avgFat: 63,
    avgSteps: 14855,
    workouts: 5,
    cardioSessions: 4,
    cardioMinutes: 135,
    ...overrides,
  };
}

const PHASE: PhaseSummary = {
  type: 'cut',
  label: 'Cut',
  note: '',
  start: '2026-07-20',
  end: null,
  isOngoing: true,
  startLabel: 'Jul 20',
  endLabel: null,
  dayCount: 35,
  weekCount: 5,
  startWeight: 210.2,
  currentWeight: 204.6,
  weightChange: -5.6,
  weightChangePerWeek: -1.1,
  recentChangePerWeek: -0.5,
  goalWeight: 190,
  goalRemaining: 14.6,
  goalPercent: 28,
  projectedGoalDate: '2026-11-22',
  projectedGoalLabel: 'Nov 22',
  avgCals: 2400,
  avgProtein: 205,
  avgSteps: 15578,
  workouts: 25,
  cardioSessions: 18,
  cardioMinutes: 555,
};

const WEEKS = [
  row({ weekStart: '2026-08-10', label: 'Aug 10', avgWeight: 203.9, weightChange: -0.7 }),
  row({ weekStart: '2026-08-17' }),
];

describe('WeekLead', () => {
  it('leads with the newest week average, not the last reading', () => {
    render(<WeekLead rows={WEEKS} phase={PHASE} weightUnit="lb" />);

    expect(screen.getByText('203.5 lb')).toBeInTheDocument();
    expect(screen.getByText(/−0\.4 lb vs the week before|-0\.4 lb vs the week before/)).toBeInTheDocument();
  });

  it('reads a falling average as the good direction', () => {
    render(<WeekLead rows={WEEKS} phase={PHASE} weightUnit="lb" />);

    expect(screen.getByText('203.5 lb').className).toContain('is-good');
  });

  it('reads a rising average as the wrong direction on a cut', () => {
    render(<WeekLead rows={[row({ weekStart: '2026-08-17', weightChange: 0.6 })]} phase={PHASE} weightUnit="lb" />);

    expect(screen.getByText('203.5 lb').className).toContain('is-up');
  });

  it('says so when there is no earlier week to compare against', () => {
    render(<WeekLead rows={[row({ weekStart: '2026-08-17', weightChange: null })]} phase={PHASE} weightUnit="lb" />);

    expect(screen.getByText('no earlier week to compare')).toBeInTheDocument();
  });

  it('marks a week that is still filling up', () => {
    render(
      <WeekLead
        rows={[row({ weekStart: '2026-08-17', isPartial: true, dayCount: 3 })]}
        phase={PHASE}
        weightUnit="lb"
      />
    );

    expect(screen.getByText('This week so far')).toBeInTheDocument();
    expect(screen.getByText(/3 days recorded/)).toBeInTheDocument();
  });

  it('renders nothing with no weeks at all', () => {
    const { container } = render(<WeekLead rows={[]} phase={PHASE} weightUnit="lb" />);

    expect(container).toBeEmptyDOMElement();
  });

  it('tells the block story below the weekly headline', () => {
    render(<WeekLead rows={WEEKS} phase={PHASE} weightUnit="lb" />);

    expect(screen.getByText(/the cut so far/i)).toBeInTheDocument();
    expect(screen.getByText('210.2 lb')).toBeInTheDocument();
    expect(screen.getByText('14.6 lb to go')).toBeInTheDocument();
    expect(screen.getByText('on pace for Nov 22 at the recent pace')).toBeInTheDocument();
    expect(screen.getByText('−0.5 lb')).toBeInTheDocument();
    expect(screen.getByText('last 3 weeks')).toBeInTheDocument();
  });

  it('stands on its own with no phase running', () => {
    render(<WeekLead rows={WEEKS} phase={null} weightUnit="lb" />);

    expect(screen.getByText('203.5 lb')).toBeInTheDocument();
    expect(screen.queryByText(/so far/i)).not.toBeInTheDocument();
  });
});
