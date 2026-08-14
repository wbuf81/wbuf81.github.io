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

export type PhaseType = 'cut' | 'bulk' | 'maintain';

/** A training/nutrition block, as recorded by hand in data/health.json. */
export interface HealthPhase {
  /** ISO date the phase began. */
  start: string;
  /**
   * ISO date it ended. Omit (or null) to let the next phase's start close it,
   * or to mark it as still running when it is the latest phase. Set explicitly
   * only to leave a deliberate gap with no phase.
   */
  end?: string | null;
  type: PhaseType;
  /** Display name. Falls back to the type when absent. */
  label?: string;
  /** Optional target weight for this phase. */
  goalWeight?: number | null;
  /** Optional daily calorie target for this phase. Drawn on the calories chart. */
  goalCals?: number | null;
  note?: string;
}

/** A single dated event worth marking on the timeline. */
export interface HealthMarker {
  date: string;
  label: string;
  /** Optional emoji shown in the consistency grid cell for this date. */
  icon?: string;
  note?: string;
}

/**
 * Something that happens the same weekday every week — drawn in that day's
 * consistency-grid cell. Unlike a marker, it is configured once rather than
 * recorded per date.
 */
export interface HealthObservance {
  /** 0 = Sunday, matching JavaScript's getUTCDay. */
  weekday: number;
  /** A single emoji. An empty string means nothing is drawn. */
  icon: string;
  /** Short name, used for the legend and the cell's accessible label. */
  label: string;
}

/**
 * Standing daily targets, independent of any phase. Phase-scoped targets live on
 * the phase itself — see `goalWeight` and `goalCals`.
 */
export interface HealthTargets {
  /** The floor to clear every day. */
  stepsMinimum?: number | null;
  /** The number being aimed at. */
  stepsGoal?: number | null;
  /** Weigh-ins per week. 7 is "measure every day". */
  weighInsPerWeek?: number | null;
  /** Lifting sessions per week. */
  liftsPerWeek?: number | null;
  /** Cardio sessions per week. */
  cardioPerWeek?: number | null;
}

/** One of the three weekly goals, measured against a single week. */
export interface GoalLine {
  key: 'measure' | 'lifts' | 'cardio';
  /** Short name, e.g. "Lifts". */
  label: string;
  /** What the goal asks for, in plain words. */
  description: string;
  actual: number;
  goal: number;
  met: boolean;
  /** How many more are needed. 0 once met. */
  remaining: number;
}

/** A week scored against every goal that is configured. */
export interface WeeklyGoals {
  weekStart: string;
  weekEnd: string;
  label: string;
  /** Recorded days in this week. */
  dayCount: number;
  /** False while the week is still filling up. */
  isComplete: boolean;
  lines: GoalLine[];
  /** True when every configured goal was hit. Vacuously true with no goals. */
  allMet: boolean;
}

export interface HealthData {
  lastUpdated: string;
  units: { weight: string };
  days: HealthDay[];
  phases?: HealthPhase[];
  markers?: HealthMarker[];
  targets?: HealthTargets;
  observances?: HealthObservance[];
}

/** A phase with its date range resolved and its outcome measured. */
export interface PhaseSummary {
  type: PhaseType;
  label: string;
  note: string;
  start: string;
  /** Resolved end: explicit, the day before the next phase, or null if running. */
  end: string | null;
  isOngoing: boolean;
  startLabel: string;
  endLabel: string | null;
  /** Recorded days falling inside the range. */
  dayCount: number;
  weekCount: number;
  /** First and last recorded weights inside the range. */
  startWeight: number | null;
  currentWeight: number | null;
  weightChange: number | null;
  /**
   * Average weight change per week across the weighed span, signed the same way
   * as `weightChange`. Null until a full week has been weighed — a rate drawn
   * from two days is noise.
   */
  weightChangePerWeek: number | null;
  goalWeight: number | null;
  /**
   * Weight still to go to reach the goal, as a magnitude — positive whether the
   * goal is above or below the current weight. Null without a goal.
   */
  goalRemaining: number | null;
  /** 0-100, clamped. Null without a goal, or when the goal equals the start. */
  goalPercent: number | null;
  /**
   * ISO date the goal is reached if the weighed rate holds. Null without a
   * goal, without a rate, once the goal is reached, or when the weight is
   * moving the wrong way.
   */
  projectedGoalDate: string | null;
  /** Short display form of `projectedGoalDate`, e.g. "Oct 17". */
  projectedGoalLabel: string | null;
  /** Daily calorie target for this phase, or null when none is set. */
  goalCals: number | null;
  avgCals: number | null;
  avgProtein: number | null;
  avgSteps: number | null;
  workouts: number;
  cardioSessions: number;
  cardioMinutes: number;
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
  /**
   * Daily calories that would have held weight steady, implied by intake vs
   * weight change across the weighed span. Null until two weeks are weighed.
   */
  estimatedMaintenance: number | null;
  workoutsThisWeek: number;
  cardioSessionsThisWeek: number;
  cardioMinutesThisWeek: number;
  /** Consecutive active days ending at the most recent recorded day. */
  activeStreak: number;
  /** Consecutive weeks, most recent first, where every goal was met. */
  goalStreak: number;
  dayCount: number;
  weekCount: number;
  /** False until there are enough days for a 7-day average to mean anything. */
  showMovingAverage: boolean;
}

/** One row of the week-by-week summary. */
export interface WeeklyTrendRow {
  weekStart: string;
  weekEnd: string;
  label: string;
  /** How many days of this week were actually recorded. */
  dayCount: number;
  /** True when the week has fewer than seven recorded days. */
  isPartial: boolean;
  avgWeight: number | null;
  /** Change in average weight against the previous week. Null for the first. */
  weightChange: number | null;
  avgCals: number | null;
  /**
   * Average calories minus the goal of the phase this week fell in. Null when
   * no phase with a calorie goal covers the week.
   */
  calsVsGoal: number | null;
  avgProtein: number | null;
  avgCarbs: number | null;
  avgFat: number | null;
  avgSteps: number | null;
  workouts: number;
  cardioSessions: number;
  cardioMinutes: number;
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
