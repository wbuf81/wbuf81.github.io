import type {
  HealthCalorieTarget,
  HealthDatedTargets,
  HealthDay,
  HealthMarker,
  HealthNoteMark,
  PhaseSummary,
  PhaseType,
} from '@/types/health';
import { calorieTargetFor } from './calorieTarget';
import { targetsFor } from './targets';
import { noteMarksFor, noteTextFor } from './noteMarks';

/**
 * /health/calendar: each day as three lights (calories, protein, steps) on a Monday-first month.
 * Pure and client-safe (no fs), like lib/calorieTarget.ts: the calendar is a client component.
 * Spec: docs/superpowers/specs/2026-11-04-health-sections-calendar-design.md.
 */

export type Light = 'hit' | 'close' | 'miss' | 'none';

/**
 * A day's calories against the target in force that day. A cut wants the number at or under the target
 * (up to 10% over is close). A bulk or maintenance wants it near the target: within 5% either way is a hit,
 * within 10% close, since eating well under is as off-plan as eating well over.
 */
export function calorieLight(cals: number | null, target: number | null, phase: PhaseType | null): Light {
  if (cals === null || target === null || target <= 0) return 'none';
  const ratio = cals / target;
  if (phase === 'cut' || phase === null) return ratio <= 1 ? 'hit' : ratio <= 1.1 ? 'close' : 'miss';
  const off = Math.abs(ratio - 1);
  return off <= 0.05 + 1e-9 ? 'hit' : off <= 0.1 + 1e-9 ? 'close' : 'miss';
}

/** Protein: the day's goal is a hit, within 10% of it close. */
export function proteinLight(protein: number | null, goal: number | null | undefined): Light {
  if (protein === null || goal == null) return 'none';
  return protein >= goal ? 'hit' : protein >= goal * 0.9 ? 'close' : 'miss';
}

/** Steps: the goal is a hit, the floor close. A day with no reading is unknown, not a miss. */
export function stepsLight(steps: number | null, floor: number | null | undefined, goal: number | null | undefined): Light {
  if (steps === null || goal == null) return 'none';
  return steps >= goal ? 'hit' : floor != null && steps >= floor ? 'close' : 'miss';
}

export interface CalendarDay {
  date: string;
  weight: number | null;
  cals: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  steps: number | null;
  /** The sheet's workout name; empty on a day with no lift. */
  workout: string;
  cardio: boolean;
  cardioMinutes: number | null;
  /** A note mark that stands in for the cardio chip (🍊 for Orange Theory). */
  cardioIcon: string | null;
  /** That mark's name, for the day's detail ("Orange Theory"). */
  cardioLabel: string | null;
  calTarget: number | null;
  proteinGoal: number | null;
  stepsMinimum: number | null;
  stepsGoal: number | null;
  phase: { label: string; type: PhaseType } | null;
  /** The day's marker icon first, then its other note marks (✝️). */
  icons: string[];
  /** The marker's label, for the day's detail. */
  marker: string | null;
  lights: { cals: Light; protein: Light; steps: Light };
}

interface Sources {
  calorieTargets?: HealthCalorieTarget[];
  targets?: HealthDatedTargets[];
  phases?: PhaseSummary[];
  markers?: HealthMarker[];
  noteMarks?: HealthNoteMark[];
}

/** Every day with its targets, block and marks resolved, scored by the rules above. Oldest first. */
export function buildCalendarDays(days: HealthDay[], src: Sources): CalendarDay[] {
  const markers = new Map((src.markers ?? []).map((m) => [m.date, m]));
  return [...days]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((d) => {
      const t = targetsFor(d.date, src.targets);
      const calTarget = calorieTargetFor(d.date, src.calorieTargets);
      const p = (src.phases ?? []).find((ph) => ph.start <= d.date && (ph.end === null || d.date <= ph.end)) ?? null;
      const marks = noteMarksFor(noteTextFor(d), src.noteMarks);
      const replacing = marks.find((m) => m.replaces === 'cardio');
      const marker = markers.get(d.date);
      const proteinGoal = t?.proteinGoal ?? null;
      const stepsMinimum = t?.stepsMinimum ?? null;
      const stepsGoal = t?.stepsGoal ?? null;
      return {
        date: d.date,
        weight: d.weight,
        cals: d.cals,
        protein: d.protein,
        carbs: d.carbs,
        fat: d.fat,
        steps: d.steps,
        workout: d.workout.trim(),
        cardio: d.cardio,
        cardioMinutes: d.cardioMinutes,
        cardioIcon: replacing ? replacing.icon : null,
        cardioLabel: replacing ? replacing.label : null,
        calTarget,
        proteinGoal,
        stepsMinimum,
        stepsGoal,
        phase: p ? { label: p.label, type: p.type } : null,
        icons: [marker?.icon, ...marks.filter((m) => m !== replacing).map((m) => m.icon)].filter(
          (i): i is string => !!i && i.trim() !== '',
        ),
        marker: marker?.label ?? null,
        lights: {
          cals: calorieLight(d.cals, calTarget, p?.type ?? null),
          protein: proteinLight(d.protein, proteinGoal),
          steps: stepsLight(d.steps, stepsMinimum, stepsGoal),
        },
      };
    });
}

const iso = (y: number, m: number, d: number) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

export function addDays(date: string, n: number): string {
  const t = new Date(`${date}T12:00:00Z`);
  t.setUTCDate(t.getUTCDate() + n);
  return t.toISOString().slice(0, 10);
}

/** A month (1–12) as Monday-first weeks; days outside the month are null. */
export function monthGrid(year: number, month: number): { monday: string; dates: (string | null)[] }[] {
  const first = iso(year, month, 1);
  const lead = (new Date(`${first}T12:00:00Z`).getUTCDay() + 6) % 7;
  const daysIn = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const weeks: { monday: string; dates: (string | null)[] }[] = [];
  for (let start = -lead; start < daysIn; start += 7) {
    const monday = addDays(first, start);
    const dates = Array.from({ length: 7 }, (_, i) => {
      const n = start + i + 1;
      return n >= 1 && n <= daysIn ? iso(year, month, n) : null;
    });
    weeks.push({ monday, dates });
  }
  return weeks;
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const nums = (xs: (number | null)[]) => xs.filter((x): x is number => x !== null);

function inRange(days: CalendarDay[], from: string, to: string) {
  return days.filter((d) => d.date >= from && d.date <= to);
}

/** The Monday–Sunday week from `monday`: average weigh-in, its change on the week before, lifts and cardio. */
export function weekSummary(days: CalendarDay[], monday: string) {
  const week = inRange(days, monday, addDays(monday, 6));
  if (week.length === 0) return null;
  const avgWeight = mean(nums(week.map((d) => d.weight)));
  const before = mean(nums(inRange(days, addDays(monday, -7), addDays(monday, -1)).map((d) => d.weight)));
  return {
    dayCount: week.length,
    avgWeight,
    change: avgWeight !== null && before !== null ? avgWeight - before : null,
    lifts: week.filter((d) => d.workout !== '').length,
    cardio: week.filter((d) => d.cardio).length,
  };
}

/** A month's totals for the strip above the grid. */
export function monthSummary(days: CalendarDay[], year: number, month: number) {
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const md = inRange(days, iso(year, month, 1), iso(year, month, daysInMonth));
  return {
    daysLogged: md.length,
    daysInMonth,
    allThree: md.filter((d) => d.lights.cals === 'hit' && d.lights.protein === 'hit' && d.lights.steps === 'hit').length,
    avgWeight: mean(nums(md.map((d) => d.weight))),
    avgCals: mean(nums(md.map((d) => d.cals))),
    avgSteps: mean(nums(md.map((d) => d.steps))),
    lifts: md.filter((d) => d.workout !== '').length,
    cardio: md.filter((d) => d.cardio).length,
  };
}

/** "YYYY-MM" for every month with at least one recorded day, oldest first. */
export function monthsWithData(days: CalendarDay[]): string[] {
  return [...new Set(days.map((d) => d.date.slice(0, 7)))].sort();
}
