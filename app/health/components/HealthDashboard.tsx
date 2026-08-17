'use client';

import {
  HealthDay,
  HealthMarker,
  HealthCalorieTarget,
  HealthNoteMark,
  HealthSummary,
  HealthChangeEntry,
  HealthDatedTargets,
  PhaseSummary,
  WeeklyGoals,
  WeekSummary,
  WeeklyTrendRow,
  WeightPoint,
} from '@/types/health';
import { targetsFor } from '@/lib/targets';
import CaloriesChart from './CaloriesChart';
import ChangeLog from './ChangeLog';
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
  noteMarks: HealthNoteMark[];
  calorieTargets: HealthCalorieTarget[];
  targets: HealthDatedTargets[];
  weeklyGoals: WeeklyGoals[];
  changeLog: HealthChangeEntry[];
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
  noteMarks,
  calorieTargets,
  targets,
  weeklyGoals,
  changeLog,
  lastUpdated,
  weightUnit,
}: Props) {
  if (days.length === 0) {
    return <p className="health-empty">No data recorded yet.</p>;
  }

  const hasMultipleWeeks = weeks.length > 1;
  // The newest revision is what the notes should quote; the charts resolve the
  // rest per day themselves.
  const currentTargets = targetsFor(days[days.length - 1].date, targets);
  const stepsMinimum = currentTargets?.stepsMinimum ?? null;
  const stepsGoal = currentTargets?.stepsGoal ?? null;
  // The newest dated target is the one in force; earlier ones are history the
  // chart still draws.
  const sortedTargets = [...calorieTargets].sort((a, b) => a.from.localeCompare(b.from));
  const calorieGoal = sortedTargets.length ? sortedTargets[sortedTargets.length - 1].cals : null;
  const targetChanged = sortedTargets.length > 1;

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
      ? `The dashed rule is the daily target${targetChanged ? `, stepping to ${calorieGoal.toLocaleString('en-US')} on ${new Date(`${sortedTargets[sortedTargets.length - 1].from}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })}` : ` of ${calorieGoal.toLocaleString('en-US')}`}.`
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
        <StepsChart days={days} average={summary.avgSteps} targets={targets} />
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
        <ConsistencyGrid weeks={weeks} markers={markers} noteMarks={noteMarks} />
        {hasMultipleWeeks && <WeeklyConsistencyChart weeks={weeks} />}
        <ConsistencyNotes markers={markers} weeks={weeks} />
      </Section>

      <Section title="Macros" note="Grams per day, stacked.">
        <MacroChart days={days} />
      </Section>

      <Section title="Calories" note={caloriesNote}>
        <CaloriesChart days={days} average={summary.avgCals} calorieTargets={calorieTargets} />
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

      {changeLog.length > 0 && (
        <Section
          title="Changes"
          note="Every change to a goal or a block, oldest first. Derived from the data, so it always matches the numbers above."
        >
          <ChangeLog entries={changeLog} />
        </Section>
      )}

      <Section title="The data">
        <DayTable days={days} />
      </Section>

      <p className="health-updated">Last updated {lastUpdated}</p>
    </>
  );
}
