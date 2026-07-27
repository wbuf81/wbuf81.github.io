'use client';

import { HealthDay, HealthSummary, WeekSummary, WeightPoint } from '@/types/health';
import CaloriesChart from './CaloriesChart';
import ConsistencyGrid from './ConsistencyGrid';
import DayTable from './DayTable';
import MacroChart from './MacroChart';
import StatTiles from './StatTiles';
import StepsChart from './StepsChart';
import WeeklyConsistencyChart from './WeeklyConsistencyChart';
import WeightChart from './WeightChart';

interface Props {
  days: HealthDay[];
  weeks: WeekSummary[];
  summary: HealthSummary;
  weightSeries: WeightPoint[];
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
  lastUpdated,
  weightUnit,
}: Props) {
  if (days.length === 0) {
    return <p className="health-empty">No data recorded yet.</p>;
  }

  const hasMultipleWeeks = weeks.length > 1;

  return (
    <>
      <StatTiles summary={summary} weightUnit={weightUnit} />

      <Section
        title="Weight"
        note={
          summary.showMovingAverage
            ? 'Daily readings with a 7-day average. The scale is zoomed to the data range, not to zero.'
            : 'Daily readings. The 7-day average line appears once there are two weeks of data.'
        }
      >
        <WeightChart data={weightSeries} showTrend={summary.showMovingAverage} />
      </Section>

      <Section
        title="Steps"
        note={
          summary.avgSteps !== null
            ? `Daily steps. The rule marks the all-time average of ${Math.round(summary.avgSteps).toLocaleString('en-US')}.`
            : 'Daily steps.'
        }
      >
        <StepsChart days={days} average={summary.avgSteps} />
      </Section>

      <Section
        title="Consistency"
        note={
          hasMultipleWeeks
            ? 'Lifts and cardio by day, and totals per week.'
            : 'Lifts and cardio by day. Weekly totals appear once there is more than one week.'
        }
      >
        <ConsistencyGrid weeks={weeks} />
        {hasMultipleWeeks && <WeeklyConsistencyChart weeks={weeks} />}
      </Section>

      <Section title="Macros" note="Grams per day, stacked.">
        <MacroChart days={days} />
      </Section>

      <Section
        title="Calories"
        note={
          summary.avgCals !== null
            ? `Daily intake. The rule marks the all-time average of ${Math.round(summary.avgCals).toLocaleString('en-US')}.`
            : 'Daily intake.'
        }
      >
        <CaloriesChart days={days} average={summary.avgCals} />
      </Section>

      <Section title="The data">
        <DayTable days={days} />
      </Section>

      <p className="health-updated">Last updated {lastUpdated}</p>
    </>
  );
}
