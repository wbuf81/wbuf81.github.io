import type { Metadata } from 'next';
import {
  buildPhases,
  buildWeeklyTrend,
  buildWeightSeries,
  currentPhase,
  getHealthData,
  groupIntoWeeks,
  summarize,
} from '@/lib/health';
import HealthDashboard from './components/HealthDashboard';
import './health.css';

export const metadata: Metadata = {
  title: 'Health',
  // Unlinked from the site and kept out of the sitemap; this asks crawlers to
  // skip it too.
  robots: { index: false, follow: false },
};

export default function HealthPage() {
  const data = getHealthData();
  const weeks = groupIntoWeeks(data.days);
  const summary = summarize(data.days);
  const weightSeries = buildWeightSeries(data.days);
  const weeklyTrend = buildWeeklyTrend(data.days);
  const phases = buildPhases(data.days, data.phases);
  const markers = [...(data.markers ?? [])].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <main className="health-main">
      <header className="health-head">
        <h1>Health</h1>
        <p>
          Daily tracker — weight, intake, steps and training. Updated weekly.
        </p>
      </header>

      <HealthDashboard
        days={data.days}
        weeks={weeks}
        summary={summary}
        weightSeries={weightSeries}
        weeklyTrend={weeklyTrend}
        phases={phases}
        activePhase={currentPhase(phases)}
        markers={markers}
        lastUpdated={data.lastUpdated}
        weightUnit={data.units.weight}
      />
    </main>
  );
}
