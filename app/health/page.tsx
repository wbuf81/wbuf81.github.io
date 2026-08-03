import type { Metadata } from 'next';
import {
  buildPhases,
  buildWeeklyGoals,
  buildWeeklyTrend,
  buildWeightSeries,
  currentPhase,
  getHealthData,
  groupIntoWeeks,
  summarize,
} from '@/lib/health';
import HealthDashboard from './components/HealthDashboard';
import './health.css';

const TITLE = "Wes's Health";
const DESCRIPTION = 'Weekly tracker — weight, training, and nutrition.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  // Unlinked from the site and kept out of the sitemap; this asks crawlers to
  // skip it too.
  robots: { index: false, follow: false },
  // Without these the page inherits the site-wide card from layout.tsx, so
  // sharing the link showed "VP, Risk & Compliance". noindex does not affect
  // link unfurling — messaging apps read these tags regardless.
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: 'https://wesleybard.com/health',
    siteName: 'Wesley Bard',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: TITLE,
    description: DESCRIPTION,
  },
};

export default function HealthPage() {
  const data = getHealthData();
  const weeks = groupIntoWeeks(data.days);
  const summary = summarize(data.days, data.targets);
  const weightSeries = buildWeightSeries(data.days);
  const weeklyTrend = buildWeeklyTrend(data.days);
  const phases = buildPhases(data.days, data.phases);
  const markers = [...(data.markers ?? [])].sort((a, b) => a.date.localeCompare(b.date));
  const weeklyGoals = buildWeeklyGoals(data.days, data.targets);

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
        targets={data.targets ?? {}}
        weeklyGoals={weeklyGoals}
        lastUpdated={data.lastUpdated}
        weightUnit={data.units.weight}
      />
    </main>
  );
}
