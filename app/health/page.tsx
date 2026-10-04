import type { Metadata } from 'next';
import { Nav } from '../components/Nav';
import Footer from '../components/Footer';
import {
  buildPhases,
  buildWeeklyGoals,
  buildChangeLog,
  buildStepStreaks,
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
  // Without these the page inherits the site-wide card from layout.tsx. noindex
  // does not affect link unfurling — messaging apps read these tags regardless.
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: 'https://wesleybard.com/health',
    siteName: 'Wesley Bard',
    locale: 'en_US',
    type: 'website',
    // Declaring openGraph here replaces the parent's images rather than merging
    // with them, so without this the page shipped with no preview image at all.
    // The card is drawn from data/health.json — rebuild it after importing a
    // week with `python3 scripts/og/build-og.py health`.
    images: [
      {
        url: '/og-health.png',
        width: 1200,
        height: 630,
        alt: "Wes's health tracker",
      },
    ],
  },
  twitter: {
    // summary is the small square layout; this card is 1200x630.
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: ['/og-health.png'],
  },
};

/** /health on the design system: the site's header and theme switch, then the tracker. */
export default function HealthPage() {
  const data = getHealthData();
  const weeks = groupIntoWeeks(data.days);
  const summary = summarize(data.days, data.targets);
  const phases = buildPhases(data.days, data.phases);
  const markers = [...(data.markers ?? [])].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <>
      <Nav theme />
      <main className="wb wb-page">
        <div className="h-wrap">
          <header className="h-top">
            <div className="eyebrow">Health · updated weekly</div>
            <h1 className="h-title">Health</h1>
            <p className="lede">Daily tracker — weight, intake, steps and training. Updated weekly.</p>
          </header>

          <HealthDashboard
            days={data.days}
            weeks={weeks}
            summary={summary}
            weightSeries={buildWeightSeries(data.days)}
            weeklyTrend={buildWeeklyTrend(data.days, data.calorieTargets)}
            phases={phases}
            activePhase={currentPhase(phases)}
            markers={markers}
            noteMarks={data.noteMarks ?? []}
            calorieTargets={data.calorieTargets ?? []}
            targets={data.targets ?? []}
            weeklyGoals={buildWeeklyGoals(data.days, data.targets)}
            changeLog={buildChangeLog(data)}
            stepStreaks={buildStepStreaks(data.days, data.targets)}
            lastUpdated={data.lastUpdated}
            weightUnit={data.units.weight}
          />
        </div>
      </main>
      <Footer />
    </>
  );
}
