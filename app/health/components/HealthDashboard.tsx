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
} from '@/types/health';
import type { CalendarDay } from '@/lib/healthCalendar';
import { section as sectionInfo, type HealthSection } from '../sections';
import Calendar from './Calendar';
import Consistency from './Consistency';
import Records from './Records';
import SectionHeader, { healthEyebrow } from './SectionHeader';
import StatTiles from './StatTiles';
import Trends from './Trends';
import WeekLead from './WeekLead';
import WeekLog from './WeekLog';

interface Props {
  /** Which page: /health draws 'week', /health/calendar 'calendar', and so on (app/health/sections.ts). */
  section: HealthSection;
  calendarDays: CalendarDay[];
  days: HealthDay[];
  weeks: WeekSummary[];
  summary: HealthSummary;
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
 * - trends: weight with calories under it, pounds per week, the next morning, the week by day, steps and macros
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
  // Every section opens on its own title, with the block the newest data falls in as the eyebrow.
  const header = <SectionHeader eyebrow={healthEyebrow(leadPhase)} title={sectionInfo(section).title} />;

  if (days.length === 0) {
    return (
      <>
        {header}
        <p className="h-note">No data recorded yet.</p>
      </>
    );
  }

  if (section === 'week') {
    return (
      <>
        {header}
        <WeekLead
          rows={weeklyTrend}
          phase={leadPhase}
          next={leadPhase && activePhase && leadPhase !== activePhase ? activePhase : null}
          weightUnit={weightUnit}
        />
        <StatTiles summary={summary} phase={leadPhase} weightUnit={weightUnit} />
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
        {header}
        <Calendar days={calendarDays} weightUnit={weightUnit} />
        <Updated on={lastUpdated} />
      </>
    );
  }

  if (section === 'trends') {
    // Trends draws its own header, with the range switch beside the title.
    return (
      <>
        <Trends
          eyebrow={healthEyebrow(leadPhase)}
          title={sectionInfo(section).title}
          days={days}
          weeklyTrend={weeklyTrend}
          phases={phases}
          leadPhase={leadPhase}
          calorieTargets={calorieTargets}
          targets={targets}
          stepStreaks={stepStreaks}
          weightUnit={weightUnit}
        />
        <Updated on={lastUpdated} />
      </>
    );
  }

  if (section === 'habits') {
    return (
      <>
        {header}
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
      {header}
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
