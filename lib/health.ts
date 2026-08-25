import fs from 'fs';
import path from 'path';
import { dayTickLabel } from './dayLabel.ts';
import { calorieTargetFor } from './calorieTarget.ts';
import { targetsFor } from './targets.ts';
import {
  GoalLine,
  HealthCalorieTarget,
  HealthChangeEntry,
  HealthData,
  HealthDatedTargets,
  HealthDay,
  HealthPhase,
  HealthSummary,
  HealthTargets,
  ParsedImport,
  PhaseSummary,
  PhaseType,
  StepStreak,
  StepStreaks,
  HealthMarker,
  WeeklyGoals,
  WeekSummary,
  WeeklyTrendRow,
  WeightPoint,
} from '@/types/health';

const healthFilePath = path.join(process.cwd(), 'data/health.json');

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const MOVING_AVERAGE_WINDOW = 7;
/** A 7-day mean drawn from a single window is noise, so the trend line waits for two. */
const MOVING_AVERAGE_MIN_DAYS = 14;

/** What a cardio session is when the sheet's cardio note doesn't say. */
const DEFAULT_CARDIO_MINUTES = 30;

const CALS_PER_LB = 3500;
/** A maintenance estimate from a single week swings with water; two settle it. */
const MAINTENANCE_MIN_SPAN_DAYS = 14;
/**
 * "Recent" means the trailing three weeks. A cut front-loads its loss — the
 * first fortnight's water made the Aug 2026 cut look like 1.1 lb/wk when the
 * settled rate was half that — so the projection and the maintenance estimate
 * both read this window instead of the whole span once there is enough history.
 */
const RECENT_WINDOW_DAYS = 21;

/**
 * Least-squares slope of weight against time, in lb per day.
 *
 * The recent window is too short to take a rate from its two endpoint
 * weigh-ins — the first cut of this feature did, and one watery Sunday reading
 * swung the projection by months. A fitted slope over every weigh-in in the
 * window is the same idea as the chart's trend line: no single day decides it.
 */
function fittedDailyRate(weighed: HealthDay[]): number | null {
  if (weighed.length < 2) return null;

  const x = weighed.map((d) => daysBetween(weighed[0].date, d.date));
  const y = weighed.map((d) => d.weight!);
  const meanX = x.reduce((a, b) => a + b, 0) / x.length;
  const meanY = y.reduce((a, b) => a + b, 0) / y.length;

  let num = 0;
  let den = 0;
  for (let i = 0; i < x.length; i++) {
    num += (x[i] - meanX) * (y[i] - meanY);
    den += (x[i] - meanX) ** 2;
  }
  return den === 0 ? null : num / den;
}

// Date, Day, Cals, Protein, Carbs, Fat, Weight, Steps, Workout, Cardio,
// Cardio Notes, Notes. The cardio note got its own column in Aug 2026; before
// that the two notes shared one, which is why cardioMinutes used to be assumed.
const EXPECTED_COLUMNS = 12;

// Ranges outside which a value is worth a second look, but not worth refusing.
const PLAUSIBLE = {
  calsMin: 1000,
  calsMax: 5000,
  stepsMin: 0,
  stepsMax: 50000,
  maxWeightSwing: 5,
};

/* -------------------------------------------------------------------------- */
/* Date helpers — all UTC, so a local timezone can never shift a date         */
/* -------------------------------------------------------------------------- */

function toUtc(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function toIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(iso: string, days: number): string {
  const date = toUtc(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return toIso(date);
}

function daysBetween(fromIso: string, toIsoStr: string): number {
  return Math.round((toUtc(toIsoStr).getTime() - toUtc(fromIso).getTime()) / 86400000);
}

/** The Monday of the week containing this date. */
function mondayOf(iso: string): string {
  const date = toUtc(iso);
  // getUTCDay: 0 = Sunday. Shift so Monday is 0.
  const offset = (date.getUTCDay() + 6) % 7;
  return addDays(iso, -offset);
}

/** "2026-07-20" -> "Jul 20" */
function shortLabel(iso: string): string {
  const date = toUtc(iso);
  return `${MONTHS[date.getUTCMonth()]} ${date.getUTCDate()}`;
}

/* -------------------------------------------------------------------------- */
/* Aggregation                                                                */
/* -------------------------------------------------------------------------- */

/** Mean of the present values. Null when nothing is present — never 0. */
function mean(values: (number | null)[]): number | null {
  const present = values.filter((v): v is number => v !== null && v !== undefined);
  if (present.length === 0) return null;
  return present.reduce((sum, v) => sum + v, 0) / present.length;
}

function isActive(day: HealthDay): boolean {
  return day.workout.trim() !== '' || day.cardio;
}

function sortDays(days: HealthDay[]): HealthDay[] {
  return [...days].sort((a, b) => a.date.localeCompare(b.date));
}

export function groupIntoWeeks(days: HealthDay[]): WeekSummary[] {
  const buckets = new Map<string, HealthDay[]>();

  for (const day of sortDays(days)) {
    const start = mondayOf(day.date);
    const bucket = buckets.get(start);
    if (bucket) {
      bucket.push(day);
    } else {
      buckets.set(start, [day]);
    }
  }

  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([weekStart, weekDays]) => ({
      weekStart,
      weekEnd: addDays(weekStart, 6),
      label: shortLabel(weekStart),
      days: weekDays,
      avgCals: mean(weekDays.map((d) => d.cals)),
      avgProtein: mean(weekDays.map((d) => d.protein)),
      avgCarbs: mean(weekDays.map((d) => d.carbs)),
      avgFat: mean(weekDays.map((d) => d.fat)),
      avgSteps: mean(weekDays.map((d) => d.steps)),
      avgWeight: mean(weekDays.map((d) => d.weight)),
      workouts: weekDays.filter((d) => d.workout.trim() !== '').length,
      cardioSessions: weekDays.filter((d) => d.cardio).length,
      cardioMinutes: weekDays.reduce((sum, d) => sum + (d.cardioMinutes ?? 0), 0),
    }));
}

/** getUTCDay value for Sunday, which is a scheduled rest day. */
const SCHEDULED_REST_WEEKDAY = 0;

function isScheduledRest(day: HealthDay): boolean {
  // Derived from the date rather than the sheet's day column, so a mislabelled
  // row can't change the rule.
  return toUtc(day.date).getUTCDay() === SCHEDULED_REST_WEEKDAY;
}

/**
 * Consecutive active days counted backwards from the most recent record.
 *
 * Sunday is a planned rest day, so an inactive Sunday is passed over: it
 * neither ends the streak nor adds to it. An unplanned rest on any other
 * weekday does end it. A Sunday that *was* trained counts normally.
 */
function activeStreak(days: HealthDay[]): number {
  const sorted = sortDays(days);
  let streak = 0;

  for (let i = sorted.length - 1; i >= 0; i--) {
    const day = sorted[i];

    if (isActive(day)) {
      streak++;
      continue;
    }

    if (isScheduledRest(day)) continue;

    break;
  }

  return streak;
}

const DAYS_IN_WEEK = 7;

/**
 * Score each week against the three standing goals: measure every day, and hit
 * the weekly lift and cardio counts.
 *
 * Every goal is expressed per week, including the daily weigh-in, so one rule
 * covers all three and a week is either met or not. A goal left unset in
 * `targets` is simply not scored rather than counted as zero.
 */
export function buildWeeklyGoals(
  days: HealthDay[],
  revisions?: HealthDatedTargets[]
): WeeklyGoals[] {
  return groupIntoWeeks(days).map((week) => {
    // Scored by the revision in force on the week's last recorded day. A weekly
    // count cannot be part-scored against two different numbers, so a week that
    // straddles a change is judged by where it ended up — and, crucially, an
    // earlier week is never re-scored against a goal set after it.
    const lastRecorded = week.days[week.days.length - 1].date;
    const targets = targetsFor(lastRecorded, revisions);

    const weighInGoal = targets?.weighInsPerWeek ?? null;
    const liftGoal = targets?.liftsPerWeek ?? null;
    const cardioGoal = targets?.cardioPerWeek ?? null;

    const lines: GoalLine[] = [];

    const add = (
      key: GoalLine['key'],
      label: string,
      description: string,
      actual: number,
      goal: number | null
    ) => {
      if (goal === null || goal <= 0) return;
      lines.push({
        key,
        label,
        description,
        actual,
        goal,
        met: actual >= goal,
        remaining: Math.max(0, goal - actual),
      });
    };

    add(
      'measure',
      'Measure',
      weighInGoal === DAYS_IN_WEEK ? 'Weigh in every day' : `Weigh in ${weighInGoal}× a week`,
      week.days.filter((day) => day.weight !== null).length,
      weighInGoal
    );
    add('lifts', 'Lifts', `${liftGoal} sessions a week`, week.workouts, liftGoal);
    add('cardio', 'Cardio', `${cardioGoal} sessions a week`, week.cardioSessions, cardioGoal);

    return {
      weekStart: week.weekStart,
      weekEnd: week.weekEnd,
      label: week.label,
      dayCount: week.days.length,
      isComplete: week.days.length >= DAYS_IN_WEEK,
      lines,
      allMet: lines.every((line) => line.met),
    };
  });
}

/**
 * Consecutive weeks, counting back from the newest, in which every goal was met.
 *
 * The newest week is skipped rather than counted against when it is still
 * filling up — a Wednesday is not a failed week. Once it is complete, or once it
 * has already met every goal, it counts like any other.
 */
export function goalStreak(rows: WeeklyGoals[]): number {
  const newest = rows[rows.length - 1];
  if (!newest || newest.lines.length === 0) return 0;

  let streak = 0;

  for (let i = rows.length - 1; i >= 0; i--) {
    const row = rows[i];

    if (row.allMet) {
      streak++;
      continue;
    }

    if (i === rows.length - 1 && !row.isComplete) continue;

    break;
  }

  return streak;
}

export function summarize(days: HealthDay[], targets?: HealthDatedTargets[]): HealthSummary {
  const sorted = sortDays(days);
  const weeks = groupIntoWeeks(sorted);
  const weighed = sorted.filter((d) => d.weight !== null);

  const latestWeight = weighed.length ? weighed[weighed.length - 1].weight : null;
  const firstWeight = weighed.length ? weighed[0].weight : null;

  const thisWeek = weeks[weeks.length - 1];
  const lastWeek = weeks.length > 1 ? weeks[weeks.length - 2] : null;

  const weightChangeWeek =
    thisWeek?.avgWeight !== null && thisWeek?.avgWeight !== undefined &&
    lastWeek?.avgWeight !== null && lastWeek?.avgWeight !== undefined
      ? thisWeek.avgWeight - lastWeek.avgWeight
      : null;

  // Intake plus the daily deficit implied by the weight change: the calories
  // that would have held weight steady. The change happens across the
  // *intervals* between the first and last weigh-in, so the divisor is
  // exclusive, unlike the inclusive "days tracked" counts.
  // Measured over the trailing three weeks, not the whole span: maintenance
  // moves as the diet goes on, and the first fortnight's water loss otherwise
  // inflates the deficit for the rest of the block.
  let estimatedMaintenance: number | null = null;
  if (weighed.length > 1) {
    const windowStart = addDays(weighed[weighed.length - 1].date, -(RECENT_WINDOW_DAYS - 1));
    const windowed = weighed.filter((d) => d.date >= windowStart);
    const first = windowed[0];
    const last = windowed[windowed.length - 1];
    const spanDays = daysBetween(first.date, last.date);
    const spanCals = mean(
      sorted.filter((d) => d.date >= first.date && d.date <= last.date).map((d) => d.cals)
    );
    // Fitted, not endpoint-to-endpoint: a short window taken between two single
    // readings inherits all of their water noise.
    const dailyRate = fittedDailyRate(windowed);

    if (spanDays >= MAINTENANCE_MIN_SPAN_DAYS && spanCals !== null && dailyRate !== null) {
      estimatedMaintenance = spanCals - dailyRate * CALS_PER_LB;
    }
  }

  return {
    latestWeight,
    weightChangeWeek,
    weightChangeTotal:
      latestWeight !== null && firstWeight !== null ? latestWeight - firstWeight : null,
    avgCals: mean(sorted.map((d) => d.cals)),
    avgProtein: mean(sorted.map((d) => d.protein)),
    avgSteps: mean(sorted.map((d) => d.steps)),
    estimatedMaintenance,
    workoutsThisWeek: thisWeek?.workouts ?? 0,
    cardioSessionsThisWeek: thisWeek?.cardioSessions ?? 0,
    cardioMinutesThisWeek: thisWeek?.cardioMinutes ?? 0,
    activeStreak: activeStreak(sorted),
    goalStreak: goalStreak(buildWeeklyGoals(sorted, targets)),
    dayCount: sorted.length,
    weekCount: weeks.length,
    showMovingAverage: sorted.length >= MOVING_AVERAGE_MIN_DAYS,
  };
}

const PHASE_LABELS: Record<PhaseType, string> = {
  cut: 'Cut',
  bulk: 'Bulk',
  maintain: 'Maintenance',
};

/**
 * Resolve each phase's date range and measure what happened inside it.
 *
 * A phase runs until the next one starts, or indefinitely when it is the latest
 * — an explicit `end` is only needed to leave a deliberate gap. Progress is
 * signed against the goal, so the same arithmetic serves a cut and a bulk.
 */
/** Phases ordered by start, each with its end resolved against the next. */
function resolvePhaseRanges(
  phases?: HealthPhase[]
): { phase: HealthPhase; end: string | null }[] {
  if (!phases || phases.length === 0) return [];

  const ordered = [...phases].sort((a, b) => a.start.localeCompare(b.start));

  return ordered.map((phase, index) => {
    const next = ordered[index + 1];
    // An explicit end wins; otherwise the following phase closes this one.
    return { phase, end: phase.end ?? (next ? addDays(next.start, -1) : null) };
  });
}

export function buildPhases(days: HealthDay[], phases?: HealthPhase[]): PhaseSummary[] {
  const sorted = sortDays(days);

  return resolvePhaseRanges(phases).map(({ phase, end }) => {

    const inRange = sorted.filter(
      (day) => day.date >= phase.start && (end === null || day.date <= end)
    );
    const weighed = inRange.filter((day) => day.weight !== null);

    const startWeight = weighed.length ? weighed[0].weight : null;
    const currentWeight = weighed.length ? weighed[weighed.length - 1].weight : null;
    const goalWeight = phase.goalWeight ?? null;

    // Rate across the span that was actually weighed, counted inclusively so the
    // denominator matches the "14 days tracked" the banner already reports.
    let weightChangePerWeek: number | null = null;
    if (weighed.length > 1 && startWeight !== null && currentWeight !== null) {
      const spannedDays = daysBetween(weighed[0].date, weighed[weighed.length - 1].date) + 1;
      if (spannedDays >= DAYS_IN_WEEK) {
        weightChangePerWeek = (currentWeight - startWeight) / (spannedDays / DAYS_IN_WEEK);
      }
    }

    // The same rate measured over only the trailing window. Null while the
    // phase is no older than the window — until then "recent" and "all-time"
    // are the same measurement and reporting both would say nothing.
    let recentChangePerWeek: number | null = null;
    if (weighed.length > 1) {
      const lastDate = weighed[weighed.length - 1].date;
      if (daysBetween(weighed[0].date, lastDate) + 1 > RECENT_WINDOW_DAYS) {
        const windowStart = addDays(lastDate, -(RECENT_WINDOW_DAYS - 1));
        const windowed = weighed.filter((d) => d.date >= windowStart);
        if (windowed.length > 1) {
          const spannedDays = daysBetween(windowed[0].date, lastDate) + 1;
          // Fitted across every weigh-in in the window, unlike the whole-block
          // rate above: start-to-now is a fact of the block, but a three-week
          // rate taken between two single readings is water noise.
          const dailyRate = fittedDailyRate(windowed);
          if (spannedDays >= DAYS_IN_WEEK && dailyRate !== null) {
            recentChangePerWeek = dailyRate * DAYS_IN_WEEK;
          }
        }
      }
    }

    let goalRemaining: number | null = null;
    let goalPercent: number | null = null;

    if (goalWeight !== null && currentWeight !== null) {
      // A magnitude, not a signed delta: "7.9 lb to go" reads the same whether
      // the goal is above or below where you are.
      goalRemaining = Math.abs(goalWeight - currentWeight);

      if (startWeight !== null) {
        const total = goalWeight - startWeight;
        const done = currentWeight - startWeight;
        // A goal equal to the starting weight has no distance to measure.
        goalPercent = total === 0 ? null : Math.max(0, Math.min(100, (done / total) * 100));
      }
    }

    // Where the rate lands, counted from the last weigh-in — the *recent* rate
    // once the phase is old enough to have one, because the all-time rate is
    // front-loaded by the first fortnight's water and projects a date the
    // settled pace won't hit. Positive weeks-to-go means the rate points at
    // the goal; zero or negative means the goal is already reached or the
    // weight is moving the wrong way (or, recently, not at all), and there is
    // nothing honest to project.
    const projectionRate = recentChangePerWeek ?? weightChangePerWeek;
    let projectedGoalDate: string | null = null;
    if (goalWeight !== null && currentWeight !== null && projectionRate) {
      const weeksToGo = (goalWeight - currentWeight) / projectionRate;
      if (weeksToGo > 0) {
        projectedGoalDate = addDays(
          weighed[weighed.length - 1].date,
          Math.round(weeksToGo * DAYS_IN_WEEK)
        );
      }
    }

    return {
      type: phase.type,
      label: phase.label ?? PHASE_LABELS[phase.type],
      note: phase.note ?? '',
      start: phase.start,
      end,
      isOngoing: end === null,
      startLabel: shortLabel(phase.start),
      endLabel: end === null ? null : shortLabel(end),
      dayCount: inRange.length,
      weekCount: groupIntoWeeks(inRange).length,
      startWeight,
      currentWeight,
      weightChange:
        startWeight !== null && currentWeight !== null ? currentWeight - startWeight : null,
      weightChangePerWeek,
      recentChangePerWeek,
      goalWeight,
      goalRemaining,
      goalPercent,
      projectedGoalDate,
      projectedGoalLabel: projectedGoalDate === null ? null : shortLabel(projectedGoalDate),
      avgCals: mean(inRange.map((d) => d.cals)),
      avgProtein: mean(inRange.map((d) => d.protein)),
      avgSteps: mean(inRange.map((d) => d.steps)),
      workouts: inRange.filter((d) => d.workout.trim() !== '').length,
      cardioSessions: inRange.filter((d) => d.cardio).length,
      cardioMinutes: inRange.reduce((sum, d) => sum + (d.cardioMinutes ?? 0), 0),
    };
  });
}

/** The phase currently running, or null if the latest one has already closed. */
export function currentPhase(phases: PhaseSummary[]): PhaseSummary | null {
  const last = phases[phases.length - 1];
  return last && last.isOngoing ? last : null;
}

/**
 * Week-by-week summary, oldest first. Each row carries its own averages plus the
 * change in average weight against the week before, which is the number that
 * actually shows whether a week moved things.
 *
 * A week with fewer than seven recorded days is flagged: a short first or last
 * week has a legitimately different average, and reading it as a real swing
 * would be wrong.
 */
export function buildWeeklyTrend(
  days: HealthDay[],
  calorieTargets?: HealthCalorieTarget[]
): WeeklyTrendRow[] {
  const weeks = groupIntoWeeks(days);

  return weeks.map((week, index) => {
    const previous = index > 0 ? weeks[index - 1] : null;

    const weightChange =
      week.avgWeight !== null && previous?.avgWeight !== null && previous?.avgWeight !== undefined
        ? week.avgWeight - previous.avgWeight
        : null;

    // The target can change mid-week, so the week is scored against the mean of
    // the target each recorded day actually lived under rather than a single
    // number picked from one end of the week.
    const dayTargets = week.days
      .filter((day) => day.cals !== null)
      .map((day) => calorieTargetFor(day.date, calorieTargets));
    const goalCals = dayTargets.every((target) => target !== null)
      ? mean(dayTargets)
      : null;

    return {
      weekStart: week.weekStart,
      weekEnd: week.weekEnd,
      label: week.label,
      dayCount: week.days.length,
      isPartial: week.days.length < 7,
      avgWeight: week.avgWeight,
      weightChange,
      avgCals: week.avgCals,
      calsVsGoal:
        week.avgCals !== null && goalCals !== null ? week.avgCals - goalCals : null,
      avgProtein: week.avgProtein,
      avgCarbs: week.avgCarbs,
      avgFat: week.avgFat,
      avgSteps: week.avgSteps,
      workouts: week.workouts,
      cardioSessions: week.cardioSessions,
      cardioMinutes: week.cardioMinutes,
    };
  });
}

/**
 * Runs of days clearing the step floor and the step goal.
 *
 * Each day is judged against the threshold in force **that day**, so raising a
 * goal does not retroactively break a run earned under the old one — the same
 * rule the weekly goals and the chart's stepped rules follow.
 *
 * A day with no steps recorded is skipped rather than counted as a miss: no
 * reading is unknown, not a failure. `best` is the longest run so far, which is
 * often the current one — the UI says so rather than printing it twice.
 */
export function buildStepStreaks(
  days: HealthDay[],
  revisions?: HealthDatedTargets[]
): StepStreaks {
  const sorted = sortDays(days).filter((day) => day.steps !== null);

  const run = (key: 'stepsMinimum' | 'stepsGoal'): StepStreak => {
    let current = 0;
    let best = 0;

    for (const day of sorted) {
      const threshold = targetsFor(day.date, revisions)?.[key] ?? null;
      if (threshold === null) continue;

      if ((day.steps as number) >= threshold) {
        current++;
        best = Math.max(best, current);
      } else {
        current = 0;
      }
    }

    // The trailing run is the current streak: it survived to the last reading.
    return { current, best };
  };

  const latest = sorted[sorted.length - 1];
  const inForce = latest ? targetsFor(latest.date, revisions) : null;

  return {
    minimum: inForce?.stepsMinimum ?? null,
    goal: inForce?.stepsGoal ?? null,
    aboveMinimum: run('stepsMinimum'),
    aboveGoal: run('stepsGoal'),
  };
}

/* -------------------------------------------------------------------------- */
/* Change log                                                                 */
/* -------------------------------------------------------------------------- */

/** The goals in `targets`, in the order they should be reported. */
const GOAL_FIELDS: { key: keyof HealthTargets; label: string }[] = [
  { key: 'stepsMinimum', label: 'Steps floor' },
  { key: 'stepsGoal', label: 'Steps goal' },
  { key: 'weighInsPerWeek', label: 'Weigh-ins per week' },
  { key: 'liftsPerWeek', label: 'Lifts per week' },
  { key: 'cardioPerWeek', label: 'Cardio per week' },
  { key: 'proteinGoal', label: 'Protein target (g)' },
];

function formatValue(value: number): string {
  return value.toLocaleString('en-US');
}

/**
 * Every dated change to a goal or a block, oldest first.
 *
 * Derived from `phases`, `calorieTargets` and `targets` rather than kept as its
 * own hand-written list: a separate log would drift from the numbers the page
 * actually computes against, and then neither could be trusted. The cost is
 * that only config which carries a date can appear here — which is the reason
 * calorie and goal targets are dated in the first place.
 *
 * Markers are deliberately absent: they are events rather than changes to a
 * target, and `ConsistencyNotes` already lists them.
 */
export function buildChangeLog(
  data: Pick<HealthData, 'phases' | 'calorieTargets' | 'targets'>
): HealthChangeEntry[] {
  const entries: HealthChangeEntry[] = [];

  const add = (
    date: string,
    label: string,
    from: string | null,
    to: string,
    note?: string
  ) => {
    entries.push({ date, dateLabel: shortLabel(date), label, from, to, note: note ?? '' });
  };

  const phases = [...(data.phases ?? [])].sort((a, b) => a.start.localeCompare(b.start));
  phases.forEach((phase, index) => {
    const previous = index > 0 ? phases[index - 1] : null;
    const label = phase.label ?? PHASE_LABELS[phase.type];

    add(
      phase.start,
      'Phase',
      previous ? (previous.label ?? PHASE_LABELS[previous.type]) : null,
      label,
      phase.note
    );

    // Goal weight rides on the phase rather than carrying its own date, so it is
    // reported at the phase start and only when it differs from the last one.
    const goal = phase.goalWeight ?? null;
    const previousGoal = previous?.goalWeight ?? null;
    if (goal !== null && goal !== previousGoal) {
      add(
        phase.start,
        'Goal weight',
        previousGoal === null ? null : formatValue(previousGoal),
        formatValue(goal)
      );
    }
  });

  const calorieTargets = [...(data.calorieTargets ?? [])].sort((a, b) =>
    a.from.localeCompare(b.from)
  );
  calorieTargets.forEach((target, index) => {
    const previous = index > 0 ? calorieTargets[index - 1] : null;
    if (previous && previous.cals === target.cals) return;

    add(
      target.from,
      'Calorie target',
      previous ? formatValue(previous.cals) : null,
      formatValue(target.cals),
      target.note
    );
  });

  const revisions = [...(data.targets ?? [])].sort((a, b) => a.from.localeCompare(b.from));
  revisions.forEach((revision) => {
    // Compared against what was in force the day before, so a revision that
    // restates an unchanged number does not report a change.
    const previous = targetsFor(addDays(revision.from, -1), revisions);

    for (const { key, label } of GOAL_FIELDS) {
      const to = revision[key] ?? null;
      if (to === null) continue;

      const from = previous?.[key] ?? null;
      if (from === to) continue;

      add(
        revision.from,
        label,
        from === null ? null : formatValue(from),
        formatValue(to),
        revision.note
      );
    }
  });

  // Stable within a date: phases, then calories, then goals — the order they
  // were pushed, which reads as cause before consequence.
  return entries
    .map((entry, index) => ({ entry, index }))
    .sort((a, b) => a.entry.date.localeCompare(b.entry.date) || a.index - b.index)
    .map(({ entry }) => entry);
}

/**
 * Daily weights plus a trailing 7-day mean. The trend stays null until the
 * window is genuinely full, so a partial average is never drawn as fact.
 */
export function buildWeightSeries(days: HealthDay[]): WeightPoint[] {
  const sorted = sortDays(days);

  return sorted.map((day, i) => {
    let trend: number | null = null;

    if (i >= MOVING_AVERAGE_WINDOW - 1) {
      const window = sorted.slice(i - MOVING_AVERAGE_WINDOW + 1, i + 1).map((d) => d.weight);
      const complete = window.every((w) => w !== null);
      trend = complete ? mean(window) : null;
    }

    return {
      date: day.date,
      // Weekday, matching the steps/macros/calories axes so the four daily
      // charts read as one column of days down the page.
      label: dayTickLabel(day),
      weight: day.weight,
      trend,
    };
  });
}

/* -------------------------------------------------------------------------- */
/* TSV import                                                                 */
/* -------------------------------------------------------------------------- */

/** "Jul 20" -> month index and day number. */
function parseSheetDate(cell: string): { month: number; day: number } | null {
  const match = cell.trim().match(/^([A-Za-z]{3,})\s+(\d{1,2})$/);
  if (!match) return null;

  const month = MONTHS.findIndex((m) => m.toLowerCase() === match[1].slice(0, 3).toLowerCase());
  if (month === -1) return null;

  const day = Number(match[2]);
  if (day < 1 || day > 31) return null;

  return { month, day };
}

/** Numbers arrive with thousands separators from Sheets. Blank means null. */
function parseNumber(cell: string): { value: number | null; ok: boolean } {
  const cleaned = cell.replace(/,/g, '').trim();
  if (cleaned === '') return { value: null, ok: true };

  const value = Number(cleaned);
  if (!Number.isFinite(value)) return { value: null, ok: false };

  return { value, ok: true };
}

function parseCheckbox(cell: string): boolean {
  return /^(true|yes|1|x|✓|✔)$/i.test(cell.trim());
}

function isHeaderRow(cells: string[]): boolean {
  return cells[0]?.trim().toLowerCase() === 'date';
}

export function parseHealthTsv(
  tsv: string,
  opts: { year: number; existing?: HealthDay[] }
): ParsedImport {
  const errors: string[] = [];
  const warnings: string[] = [];
  const days: HealthDay[] = [];

  const existing = sortDays(opts.existing ?? []);
  const existingDates = new Set(existing.map((d) => d.date));

  const lines = tsv
    .split('\n')
    .map((line) => line.replace(/\r$/, ''))
    .filter((line) => line.trim() !== '');

  // Sheet dates carry no year. Walk forward and roll over when the month regresses.
  let year = opts.year;
  let previousMonth: number | null = null;

  for (const [index, line] of lines.entries()) {
    const cells = line.split('\t');
    const rowLabel = `row ${index + 1}`;

    if (isHeaderRow(cells)) continue;

    if (cells.length !== EXPECTED_COLUMNS) {
      errors.push(
        `${rowLabel}: expected ${EXPECTED_COLUMNS} columns, got ${cells.length}. ` +
          `Copy all columns from Date through Notes, including both note columns.`
      );
      continue;
    }

    const [
      dateCell, dayCell, calsCell, proteinCell, carbsCell,
      fatCell, weightCell, stepsCell, workoutCell, cardioCell, cardioNoteCell, notesCell,
    ] = cells;

    const parsedDate = parseSheetDate(dateCell);
    if (!parsedDate) {
      errors.push(`${rowLabel}: could not read the date "${dateCell}". Expected a form like "Jul 20".`);
      continue;
    }

    if (previousMonth !== null && parsedDate.month < previousMonth) year++;
    previousMonth = parsedDate.month;

    const date = `${year}-${String(parsedDate.month + 1).padStart(2, '0')}-${String(parsedDate.day).padStart(2, '0')}`;

    const numericCells: [string, string][] = [
      ['cals', calsCell],
      ['protein', proteinCell],
      ['carbs', carbsCell],
      ['fat', fatCell],
      ['weight', weightCell],
      ['steps', stepsCell],
    ];

    const numbers: Record<string, number | null> = {};
    let numbersOk = true;
    for (const [name, cell] of numericCells) {
      const { value, ok } = parseNumber(cell);
      if (!ok) {
        errors.push(`${rowLabel}: "${cell.trim()}" in the ${name} column is not a number.`);
        numbersOk = false;
        continue;
      }
      numbers[name] = value;
    }
    if (!numbersOk) continue;

    if (existingDates.has(date)) {
      errors.push(`${rowLabel}: duplicate date ${date} — it is already recorded.`);
      continue;
    }

    const cardio = parseCheckbox(cardioCell);
    const cardioNote = cardioNoteCell.trim();
    const notes = notesCell.trim();

    // The cardio note is the record of the session, so a stated duration is
    // taken as written rather than warned about — a 45-minute treadmill walk
    // used to import as 30 and need fixing by hand afterwards.
    const statedMinutes = cardioNote.match(/(\d+)\s*min/i);
    const cardioMinutes = cardio
      ? statedMinutes
        ? Number(statedMinutes[1])
        : DEFAULT_CARDIO_MINUTES
      : null;

    if (cardio && cardioNote !== '' && !statedMinutes) {
      warnings.push(
        `${rowLabel} (${date}): the cardio note "${cardioNote}" states no minutes, so ` +
          `${DEFAULT_CARDIO_MINUTES} was recorded. Adjust cardioMinutes by hand if the session differed.`
      );
    }

    if (!cardio && cardioNote !== '') {
      warnings.push(
        `${rowLabel} (${date}): a cardio note ("${cardioNote}") was written but the cardio box ` +
          `is unchecked, so the day counts as no cardio. Check the sheet.`
      );
    }

    if (numbers.cals !== null && (numbers.cals < PLAUSIBLE.calsMin || numbers.cals > PLAUSIBLE.calsMax)) {
      warnings.push(`${rowLabel} (${date}): ${numbers.cals} calories is outside the usual ${PLAUSIBLE.calsMin}–${PLAUSIBLE.calsMax} range.`);
    }

    if (numbers.steps !== null && (numbers.steps < PLAUSIBLE.stepsMin || numbers.steps > PLAUSIBLE.stepsMax)) {
      warnings.push(`${rowLabel} (${date}): ${numbers.steps} steps is outside the usual range.`);
    }

    days.push({
      date,
      day: dayCell.trim(),
      cals: numbers.cals,
      protein: numbers.protein,
      carbs: numbers.carbs,
      fat: numbers.fat,
      weight: numbers.weight,
      steps: numbers.steps,
      workout: workoutCell.trim(),
      cardio,
      cardioMinutes,
      cardioNote,
      notes,
    });
    existingDates.add(date);
  }

  if (errors.length > 0) {
    return { days: [], errors, warnings };
  }

  // Continuity and weight-swing checks read across the seam into existing data.
  const combined = [...existing, ...days];
  const lastExisting = existing[existing.length - 1];

  if (lastExisting && days.length > 0) {
    const gap = daysBetween(lastExisting.date, days[0].date);
    if (gap > 1) {
      warnings.push(
        `gap of ${gap - 1} day(s) between ${lastExisting.date} and ${days[0].date}. ` +
          `Imported as-is — add the missing days separately if they were simply not sent yet.`
      );
    }
  }

  for (let i = 1; i < combined.length; i++) {
    const prev = combined[i - 1];
    const curr = combined[i];
    if (prev.weight === null || curr.weight === null) continue;
    if (!days.includes(curr)) continue;

    const swing = Math.abs(curr.weight - prev.weight);
    if (swing > PLAUSIBLE.maxWeightSwing) {
      warnings.push(
        `${curr.date}: weight moved ${swing.toFixed(1)} lb from ${prev.date} (${prev.weight} → ${curr.weight}). ` +
          `Verify the entry.`
      );
    }
  }

  return { days, errors, warnings };
}

/* -------------------------------------------------------------------------- */
/* File access                                                                */
/* -------------------------------------------------------------------------- */

export function getHealthData(): HealthData {
  if (!fs.existsSync(healthFilePath)) {
    return { lastUpdated: '', units: { weight: 'lb' }, days: [] };
  }

  const fileContents = fs.readFileSync(healthFilePath, 'utf8');
  const data = JSON.parse(fileContents) as HealthData;
  return {
    ...data,
    days: sortDays(data.days ?? []),
    phases: data.phases ?? [],
    markers: data.markers ?? [],
  };
}

export function getPhases(): PhaseSummary[] {
  const data = getHealthData();
  return buildPhases(data.days, data.phases);
}

export function getMarkers(): HealthMarker[] {
  const markers = getHealthData().markers ?? [];
  return [...markers].sort((a, b) => a.date.localeCompare(b.date));
}

export function getWeeks(): WeekSummary[] {
  return groupIntoWeeks(getHealthData().days);
}

export function getSummary(): HealthSummary {
  return summarize(getHealthData().days);
}
