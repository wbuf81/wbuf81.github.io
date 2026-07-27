import fs from 'fs';
import path from 'path';
import {
  HealthData,
  HealthDay,
  HealthPhase,
  HealthSummary,
  ParsedImport,
  PhaseSummary,
  PhaseType,
  HealthMarker,
  WeekSummary,
  WeeklyTrendRow,
  WeightPoint,
} from '@/types/health';

const healthFilePath = path.join(process.cwd(), 'data/health.json');

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const MOVING_AVERAGE_WINDOW = 7;
/** A 7-day mean drawn from a single window is noise, so the trend line waits for two. */
const MOVING_AVERAGE_MIN_DAYS = 14;

const DEFAULT_CARDIO_MINUTES = 30;

const EXPECTED_COLUMNS = 11;

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

export function summarize(days: HealthDay[]): HealthSummary {
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

  return {
    latestWeight,
    weightChangeWeek,
    weightChangeTotal:
      latestWeight !== null && firstWeight !== null ? latestWeight - firstWeight : null,
    avgCals: mean(sorted.map((d) => d.cals)),
    avgProtein: mean(sorted.map((d) => d.protein)),
    avgSteps: mean(sorted.map((d) => d.steps)),
    workoutsThisWeek: thisWeek?.workouts ?? 0,
    cardioSessionsThisWeek: thisWeek?.cardioSessions ?? 0,
    cardioMinutesThisWeek: thisWeek?.cardioMinutes ?? 0,
    activeStreak: activeStreak(sorted),
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
export function buildPhases(days: HealthDay[], phases?: HealthPhase[]): PhaseSummary[] {
  if (!phases || phases.length === 0) return [];

  const sorted = sortDays(days);
  const ordered = [...phases].sort((a, b) => a.start.localeCompare(b.start));

  return ordered.map((phase, index) => {
    const next = ordered[index + 1];

    // An explicit end wins; otherwise the following phase closes this one.
    const end = phase.end ?? (next ? addDays(next.start, -1) : null);

    const inRange = sorted.filter(
      (day) => day.date >= phase.start && (end === null || day.date <= end)
    );
    const weighed = inRange.filter((day) => day.weight !== null);

    const startWeight = weighed.length ? weighed[0].weight : null;
    const currentWeight = weighed.length ? weighed[weighed.length - 1].weight : null;
    const goalWeight = phase.goalWeight ?? null;

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
      goalWeight,
      goalRemaining,
      goalPercent,
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
export function buildWeeklyTrend(days: HealthDay[]): WeeklyTrendRow[] {
  const weeks = groupIntoWeeks(days);

  return weeks.map((week, index) => {
    const previous = index > 0 ? weeks[index - 1] : null;

    const weightChange =
      week.avgWeight !== null && previous?.avgWeight !== null && previous?.avgWeight !== undefined
        ? week.avgWeight - previous.avgWeight
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
      label: shortLabel(day.date),
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
          `Copy all columns from Date through Notes.`
      );
      continue;
    }

    const [
      dateCell, dayCell, calsCell, proteinCell, carbsCell,
      fatCell, weightCell, stepsCell, workoutCell, cardioCell, notesCell,
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
    const notes = notesCell.trim();

    const statedMinutes = notes.match(/(\d+)\s*min/i);
    if (cardio && statedMinutes && Number(statedMinutes[1]) !== DEFAULT_CARDIO_MINUTES) {
      warnings.push(
        `${rowLabel} (${date}): notes state ${statedMinutes[1]} minutes of cardio, but ` +
          `${DEFAULT_CARDIO_MINUTES} was recorded. Adjust cardioMinutes by hand if the session really differed.`
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
      cardioMinutes: cardio ? DEFAULT_CARDIO_MINUTES : null,
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
