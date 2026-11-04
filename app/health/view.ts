import type { Metadata } from 'next';
import {
  buildChangeLog,
  buildPhases,
  buildStepStreaks,
  buildWeeklyGoals,
  buildWeeklyTrend,
  buildWeightSeries,
  currentPhase,
  getHealthData,
  groupIntoWeeks,
  leadPhase,
  summarize,
} from '@/lib/health';
import { buildCalendarDays } from '@/lib/healthCalendar';
import { section, type HealthSection } from './sections';

/** Everything the /health pages draw, computed from data/health.json at build time. Server only. */
export function getHealthView() {
  const data = getHealthData();
  const phases = buildPhases(data.days, data.phases);
  return {
    days: data.days,
    weeks: groupIntoWeeks(data.days),
    summary: summarize(data.days, data.targets),
    weightSeries: buildWeightSeries(data.days),
    weeklyTrend: buildWeeklyTrend(data.days, data.calorieTargets),
    phases,
    activePhase: currentPhase(phases),
    leadPhase: leadPhase(phases, data.days),
    markers: [...(data.markers ?? [])].sort((a, b) => a.date.localeCompare(b.date)),
    noteMarks: data.noteMarks ?? [],
    calorieTargets: data.calorieTargets ?? [],
    targets: data.targets ?? [],
    weeklyGoals: buildWeeklyGoals(data.days, data.targets),
    changeLog: buildChangeLog(data),
    stepStreaks: buildStepStreaks(data.days, data.targets),
    calendarDays: buildCalendarDays(data.days, {
      calorieTargets: data.calorieTargets,
      targets: data.targets,
      phases,
      markers: data.markers,
      noteMarks: data.noteMarks,
    }),
    lastUpdated: data.lastUpdated,
    weightUnit: data.units.weight,
  };
}

export type HealthView = ReturnType<typeof getHealthView>;

const SITE_TITLE = "Wes's Health";
const DESCRIPTION = 'Weekly tracker — weight, training, and nutrition.';

/**
 * Every /health page's metadata: noindex, and its own link-preview card. Declaring openGraph on a route
 * replaces the parent's images rather than merging, so each page names the card itself, or it ships none.
 * The card is drawn from data/health.json (`python3 scripts/og/build-og.py health`).
 */
export function healthMetadata(id: HealthSection): Metadata {
  const s = section(id);
  const title = id === 'week' ? SITE_TITLE : `${s.title} · ${SITE_TITLE}`;
  return {
    title,
    description: DESCRIPTION,
    // Unlinked from the site and kept out of the sitemap; this asks crawlers to skip it too.
    robots: { index: false, follow: false },
    openGraph: {
      title,
      description: DESCRIPTION,
      url: `https://wesleybard.com${s.href}`,
      siteName: 'Wesley Bard',
      locale: 'en_US',
      type: 'website',
      images: [{ url: '/og-health.png', width: 1200, height: 630, alt: "Wes's health tracker" }],
    },
    // summary is the small square layout; this card is 1200x630.
    twitter: { card: 'summary_large_image', title, description: DESCRIPTION, images: ['/og-health.png'] },
  };
}
