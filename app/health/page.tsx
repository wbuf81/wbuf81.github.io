import type { Metadata } from 'next';
import { buildWeightSeries, getHealthData, groupIntoWeeks, summarize } from '@/lib/health';
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
        lastUpdated={data.lastUpdated}
        weightUnit={data.units.weight}
      />
    </main>
  );
}
