import {
  HealthCalorieTarget,
  HealthChangeEntry,
  HealthDatedTargets,
  HealthDay,
  HealthMarker,
  HealthNoteMark,
  HealthSummary,
  PhaseSummary,
  StepStreaks,
  WeekSummary,
  WeeklyGoals,
  WeeklyTrendRow,
  WeightPoint,
} from '@/types/health';
import Consistency from './Consistency';
import MacrosCard from './MacrosCard';
import NextMorning from './NextMorning';
import Records from './Records';
import StatTiles from './StatTiles';
import StepsCard from './StepsCard';
import WeekByDay from './WeekByDay';
import WeekLead from './WeekLead';
import WeekLog from './WeekLog';
import WeightCalories from './WeightCalories';

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
  stepStreaks: StepStreaks;
  lastUpdated: string;
  weightUnit: string;
}

/**
 * /health, top to bottom: the week and the block, the tiles, weight and calories together, what a day's
 * calories do to the next morning, the week by day, steps and macros, consistency, the log, the records.
 * Spec: docs/superpowers/specs/2026-10-04-health-redesign-design.md.
 */
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
  stepStreaks,
  lastUpdated,
  weightUnit,
}: Props) {
  if (days.length === 0) {
    return <p className="h-note">No data recorded yet.</p>;
  }

  // Only a running block's goal stretches the weight scale; a closed block's goal is history.
  const goalWeight = activePhase?.isOngoing ? activePhase.goalWeight : null;

  return (
    <>
      <WeekLead rows={weeklyTrend} phase={activePhase} weightUnit={weightUnit} />
      <StatTiles summary={summary} weightUnit={weightUnit} />
      <WeightCalories
        days={days}
        series={weightSeries}
        calorieTargets={calorieTargets}
        goalWeight={goalWeight}
        showTrend={summary.showMovingAverage}
        weightUnit={weightUnit}
      />
      <NextMorning days={days} calorieTargets={calorieTargets} weightUnit={weightUnit} />
      <WeekByDay days={days} calorieTargets={calorieTargets} targets={targets} weightUnit={weightUnit} />
      <div className="h-pair">
        <StepsCard days={days} targets={targets} streaks={stepStreaks} />
        <MacrosCard days={days} targets={targets} />
      </div>
      <Consistency
        days={days}
        weeks={weeks}
        weeklyGoals={weeklyGoals}
        streak={summary.goalStreak}
        markers={markers}
        noteMarks={noteMarks}
        weightUnit={weightUnit}
      />
      <WeekLog
        weeks={weeks}
        trend={weeklyTrend}
        weeklyGoals={weeklyGoals}
        markers={markers}
        noteMarks={noteMarks}
        weightUnit={weightUnit}
      />
      <Records
        trend={weeklyTrend}
        markers={markers}
        changeLog={changeLog}
        days={days}
        phases={phases}
        weightUnit={weightUnit}
      />
      <p className="h-updated">Last updated {lastUpdated}</p>
    </>
  );
}
