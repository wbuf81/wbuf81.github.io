'use client';

import {
  HealthDay,
  HealthMarker,
  HealthSummary,
  HealthTargets,
  PhaseSummary,
  WeeklyGoals,
  WeekSummary,
  WeeklyTrendRow,
  WeightPoint,
} from '@/types/health';
import CaloriesChart from './CaloriesChart';
import ConsistencyGrid from './ConsistencyGrid';
import ConsistencyNotes from './ConsistencyNotes';
import DayTable from './DayTable';
import GoalTracker from './GoalTracker';
import MacroChart from './MacroChart';
import PhaseBanner from './PhaseBanner';
import PhaseTable from './PhaseTable';
import StatTiles from './StatTiles';
import StepsChart from './StepsChart';
import WeeklyConsistencyChart from './WeeklyConsistencyChart';
import WeekTable from './WeekTable';
import WeightChart from './WeightChart';

interface Props {
  days: HealthDay[];
  weeks: WeekSummary[];
  summary: HealthSummary;
  weightSeries: WeightPoint[];
  weeklyTrend: WeeklyTrendRow[];
  phases: PhaseSummary[];
  activePhase: PhaseSummary | null;
  markers: HealthMarker[];
  targets: HealthTargets;
  weeklyGoals: WeeklyGoals[];
  lastUpdated: string;
  weightUnit: string;
}

function Section({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="health-section">
      <div className="health-section-head">
        <h2>{title}</h2>
        {note && <p className="health-note">{note}</p>}
      </div>
      {children}
    </section>
  );
}

export default function HealthDashboard({
  days,
  weeks,
  summary,
  weightSeries,
  weeklyTrend,
  phases,
  activePhase,
  markers,
  targets,
  weeklyGoals,
  lastUpdated,
  weightUnit,
}: Props) {
  if (days.length === 0) {
    return <p className="health-empty">No data recorded yet.</p>;
  }

  const hasMultipleWeeks = weeks.length > 1;
  const stepsMinimum = targets.stepsMinimum ?? null;
  const stepsGoal = targets.stepsGoal ?? null;
  const calorieGoal = activePhase?.goalCals ?? null;

  const stepsNote = [
    'Daily steps.',
    stepsMinimum !== null && stepsGoal !== null
      ? `Dashed rules mark the ${stepsMinimum.toLocaleString('en-US')} floor and the ${stepsGoal.toLocaleString('en-US')} goal.`
      : null,
    summary.avgSteps !== null
      ? `The solid rule is the all-time average of ${Math.round(summary.avgSteps).toLocaleString('en-US')}.`
      : null,
  ]
    .filter(Boolean)
    .join(' ');

  // With a goal set the chart drops its average rule, so the note must not
  // promise a solid line that isn't drawn.
  const caloriesNote = [
    'Daily intake.',
    calorieGoal !== null
      ? `The dashed rule is the ${calorieGoal.toLocaleString('en-US')} target for this ${activePhase?.label.toLowerCase()}.`
      : summary.avgCals !== null
        ? `The rule marks the all-time average of ${Math.round(summary.avgCals).toLocaleString('en-US')}.`
        : null,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <>
      {activePhase && <PhaseBanner phase={activePhase} weightUnit={weightUnit} />}

      <StatTiles summary={summary} weightUnit={weightUnit} />

      <Section
        title="Weight"
        note={
          summary.showMovingAverage
            ? 'Daily readings with a 7-day average. The scale is zoomed to the data range, not to zero.'
            : 'Daily readings. The 7-day average line appears once there are two weeks of data.'
        }
      >
        <WeightChart
          data={weightSeries}
          showTrend={summary.showMovingAverage}
          phases={phases}
        />
      </Section>

      <Section title="Steps" note={stepsNote}>
        <StepsChart
          days={days}
          average={summary.avgSteps}
          minimum={stepsMinimum}
          goal={stepsGoal}
        />
      </Section>

      <Section
        title="Consistency"
        note={
          hasMultipleWeeks
            ? 'Goals for the current week, lifts and cardio by day, and totals per week.'
            : 'Goals for the current week, and lifts and cardio by day. Weekly totals appear once there is more than one week.'
        }
      >
        <GoalTracker rows={weeklyGoals} streak={summary.goalStreak} />
        <ConsistencyGrid weeks={weeks} markers={markers} />
        {hasMultipleWeeks && <WeeklyConsistencyChart weeks={weeks} />}
        <ConsistencyNotes markers={markers} weeks={weeks} />
      </Section>

      <Section title="Macros" note="Grams per day, stacked.">
        <MacroChart days={days} />
      </Section>

      <Section title="Calories" note={caloriesNote}>
        <CaloriesChart days={days} average={summary.avgCals} goal={calorieGoal} />
      </Section>

      {hasMultipleWeeks && (
        <Section
          title="By week"
          note="Weekly averages, newest first. Change compares a week's average weight to the week before."
        >
          <WeekTable rows={weeklyTrend} weightUnit={weightUnit} />
        </Section>
      )}

      {phases.length > 1 && (
        <Section title="Phases" note="Every block, and what happened during it.">
          <PhaseTable phases={phases} weightUnit={weightUnit} />
        </Section>
      )}

      <Section title="The data">
        <DayTable days={days} />
      </Section>

      <p className="health-updated">Last updated {lastUpdated}</p>
    </>
  );
}
