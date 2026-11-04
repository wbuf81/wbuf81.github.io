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
import type { CalendarDay } from '@/lib/healthCalendar';
import type { HealthSection } from '../sections';
import Calendar from './Calendar';
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
  /** Which page: /health draws 'week', /health/calendar 'calendar', and so on (app/health/sections.ts). */
  section: HealthSection;
  calendarDays: CalendarDay[];
  days: HealthDay[];
  weeks: WeekSummary[];
  summary: HealthSummary;
  weightSeries: WeightPoint[];
  weeklyTrend: WeeklyTrendRow[];
  phases: PhaseSummary[];
  activePhase: PhaseSummary | null;
  /** The phase the newest recorded day falls in (lib/health › leadPhase): what the lead card tells. */
  leadPhase?: PhaseSummary | null;
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
 * One /health section, each its own page under the HealthNav menu:
 * - week: the week and the block, the tiles, the log's four newest weeks
 * - calendar: the month, each day as three lights
 * - trends: weight and calories together, the next morning, the week by day, steps and macros
 * - habits: consistency
 * - records: the records
 * Specs: docs/superpowers/specs/2026-10-04-health-redesign-design.md, 2026-11-04-health-sections-calendar-design.md.
 */
export default function HealthDashboard({
  section,
  calendarDays,
  days,
  weeks,
  summary,
  weightSeries,
  weeklyTrend,
  phases,
  activePhase,
  leadPhase = activePhase,
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

  if (section === 'week') {
    return (
      <>
        <WeekLead
          rows={weeklyTrend}
          phase={leadPhase}
          next={leadPhase && activePhase && leadPhase !== activePhase ? activePhase : null}
          weightUnit={weightUnit}
        />
        <StatTiles summary={summary} weightUnit={weightUnit} />
        <WeekLog
          weeks={weeks}
          trend={weeklyTrend}
          weeklyGoals={weeklyGoals}
          markers={markers}
          noteMarks={noteMarks}
          weightUnit={weightUnit}
        />
        <Updated on={lastUpdated} />
      </>
    );
  }

  if (section === 'calendar') {
    return (
      <>
        <Calendar days={calendarDays} weightUnit={weightUnit} />
        <Updated on={lastUpdated} />
      </>
    );
  }

  if (section === 'trends') {
    return (
      <>
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
        <Updated on={lastUpdated} />
      </>
    );
  }

  if (section === 'habits') {
    return (
      <>
        <Consistency
          days={days}
          weeks={weeks}
          weeklyGoals={weeklyGoals}
          streak={summary.goalStreak}
          markers={markers}
          noteMarks={noteMarks}
          weightUnit={weightUnit}
        />
        <Updated on={lastUpdated} />
      </>
    );
  }

  return (
    <>
      <Records
        trend={weeklyTrend}
        markers={markers}
        changeLog={changeLog}
        days={days}
        phases={phases}
        weightUnit={weightUnit}
      />
      <Updated on={lastUpdated} />
    </>
  );
}

function Updated({ on }: { on: string }) {
  return <p className="h-updated">Last updated {on}</p>;
}
