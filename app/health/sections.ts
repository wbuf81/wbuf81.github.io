/** /health's sections, one page each, in menu order. `short` is the phone label (HealthNav). */
export type HealthSection = 'week' | 'calendar' | 'trends' | 'habits' | 'records';

export const SECTIONS: { id: HealthSection; href: string; icon: string; label: string; short: string; title: string }[] = [
  { id: 'week', href: '/health', icon: '⚖️', label: 'This week', short: 'Week', title: 'This week' },
  { id: 'calendar', href: '/health/calendar', icon: '📅', label: 'Calendar', short: 'Calendar', title: 'Calendar' },
  { id: 'trends', href: '/health/trends', icon: '📈', label: 'Trends', short: 'Trends', title: 'Trends' },
  { id: 'habits', href: '/health/habits', icon: '✅', label: 'Habits', short: 'Habits', title: 'Habits' },
  { id: 'records', href: '/health/records', icon: '🗂️', label: 'Records', short: 'Records', title: 'Records' },
];

export const section = (id: HealthSection) => SECTIONS.find((s) => s.id === id)!;
