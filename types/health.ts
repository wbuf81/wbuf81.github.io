export interface HealthDay {
  /** ISO date, YYYY-MM-DD */
  date: string;
  /** Mon, Tue, ... — as recorded in the sheet */
  day: string;
  cals: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  /** Pounds. null means no weigh-in that day, never 0. */
  weight: number | null;
  steps: number | null;
  /** Empty string means a rest day, not missing data. */
  workout: string;
  cardio: boolean;
  /** 30 when cardio is true, null when false. */
  cardioMinutes: number | null;
  /** Stored verbatim from the sheet. */
  notes: string;
}

export interface HealthData {
  lastUpdated: string;
  units: { weight: string };
  days: HealthDay[];
}

export interface WeekSummary {
  /** ISO date of the Monday starting this week */
  weekStart: string;
  /** ISO date of the Sunday ending this week */
  weekEnd: string;
  /** Short display label, e.g. "Jul 20" */
  label: string;
  days: HealthDay[];
  avgCals: number | null;
  avgProtein: number | null;
  avgCarbs: number | null;
  avgFat: number | null;
  avgSteps: number | null;
  avgWeight: number | null;
  workouts: number;
  cardioSessions: number;
  cardioMinutes: number;
}

export interface HealthSummary {
  latestWeight: number | null;
  /** Latest week's average weight minus the previous week's. Negative = down. */
  weightChangeWeek: number | null;
  /** Latest recorded weight minus the first recorded weight. */
  weightChangeTotal: number | null;
  avgCals: number | null;
  avgProtein: number | null;
  avgSteps: number | null;
  workoutsThisWeek: number;
  cardioSessionsThisWeek: number;
  cardioMinutesThisWeek: number;
  /** Consecutive active days ending at the most recent recorded day. */
  activeStreak: number;
  dayCount: number;
  weekCount: number;
  /** False until there are enough days for a 7-day average to mean anything. */
  showMovingAverage: boolean;
}

export interface WeightPoint {
  date: string;
  label: string;
  weight: number | null;
  /** 7-day trailing mean, null until the window is full. */
  trend: number | null;
}

export interface ParsedImport {
  days: HealthDay[];
  /** Blocking problems. Non-empty means the import must be refused. */
  errors: string[];
  /** Non-blocking anomalies worth a human look. */
  warnings: string[];
}
