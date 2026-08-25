/**
 * Print everything a weekly share card needs, as JSON, for the newest complete
 * week.
 *
 * Numbers come from lib/health.ts rather than being recomputed here: the card
 * and the page must never disagree, and that module is the tested one. Run it
 * through the npm script so the ts-node hook is registered:
 *
 *     npm run weekly:stats
 *     npm run weekly:stats -- --week 2026-08-10   # a specific week
 */
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const repoRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

require('ts-node/register');

let health;
let noteTextFor;
try {
  health = require(path.join(repoRoot, 'lib/health.ts'));
  // Joined by the same helper the page uses, so a card can't split the notes differently.
  ({ noteTextFor } = require(path.join(repoRoot, 'lib/noteMarks.ts')));
} catch (error) {
  console.error(
    'Could not load lib/health.ts. Run this through the npm script:\n' +
      '  npm run weekly:stats\n\n' +
      String(error?.message ?? error)
  );
  process.exit(1);
}

const {
  getHealthData,
  groupIntoWeeks,
  buildWeeklyTrend,
  buildPhases,
  buildWeeklyGoals,
  buildStepStreaks,
  currentPhase,
  summarize,
} = health;

const args = process.argv.slice(2);
const wantedWeek = args.includes('--week') ? args[args.indexOf('--week') + 1] : null;

const data = getHealthData();
const weeks = groupIntoWeeks(data.days);
const trend = buildWeeklyTrend(data.days, data.calorieTargets);
const goals = buildWeeklyGoals(data.days, data.targets);
const phases = buildPhases(data.days, data.phases);
const phase = currentPhase(phases) ?? phases[phases.length - 1] ?? null;

/** The newest week with all seven days, so a card never reports half a week. */
function pickIndex() {
  if (wantedWeek) {
    const found = weeks.findIndex((week) => week.weekStart === wantedWeek);
    if (found === -1) {
      console.error(`No week starts on ${wantedWeek}. Weeks: ${weeks.map((w) => w.weekStart).join(', ')}`);
      process.exit(1);
    }
    return found;
  }

  for (let i = weeks.length - 1; i >= 0; i--) {
    if (weeks[i].days.length >= 7) return i;
  }

  // Exit 3 means "nothing to draw yet", which callers treat as a skip rather
  // than a failure: a card must never report a half-finished week.
  const newest = weeks[weeks.length - 1];
  console.error(
    newest
      ? `No complete week yet — the newest has ${newest.days.length} of 7 days.`
      : 'No days recorded yet.'
  );
  process.exit(3);
}

const index = pickIndex();
const week = weeks[index];
const row = trend[index];
const scored = goals[index];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const parts = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  return { y, m: MONTHS[m - 1], d };
};
const shortDate = (iso) => {
  const { m, d } = parts(iso);
  return `${m} ${d}`;
};

/** "Aug 10 – 16", collapsing the month when the week doesn't cross one. */
function rangeLabel(startIso, endIso) {
  const a = parts(startIso);
  const b = parts(endIso);
  return a.m === b.m ? `${a.m} ${a.d} – ${b.d}` : `${a.m} ${a.d} – ${b.m} ${b.d}`;
}

const weighed = week.days.filter((d) => d.weight !== null);

const noteMarks = data.noteMarks ?? [];
const marksFor = (notes) => {
  const haystack = (notes ?? '').toLowerCase();
  return noteMarks
    .filter((mark) => mark.icon.trim() !== '' && haystack.includes(mark.match.trim().toLowerCase()))
    .map((mark) => ({ icon: mark.icon, label: mark.label, replaces: mark.replaces ?? null }));
};

console.log(
  JSON.stringify(
    {
      week: {
        number: index + 1,
        of: weeks.length,
        start: week.weekStart,
        end: week.weekEnd,
        rangeLabel: rangeLabel(week.weekStart, week.weekEnd),
        avgWeight: row.avgWeight,
        weightChange: row.weightChange,
        avgCals: row.avgCals,
        calsVsGoal: row.calsVsGoal,
        avgSteps: row.avgSteps,
        avgProtein: row.avgProtein,
        lifts: row.workouts,
        cardioSessions: row.cardioSessions,
        cardioMinutes: row.cardioMinutes,
        weighIns: weighed.length,
        firstWeight: weighed.length ? weighed[0].weight : null,
        lastWeight: weighed.length ? weighed[weighed.length - 1].weight : null,
        goals: (scored?.lines ?? []).map((line) => ({
          label: line.label,
          actual: line.actual,
          goal: line.goal,
          met: line.met,
        })),
        allMet: scored?.allMet ?? false,
        days: week.days.map((day) => ({
          date: day.date,
          weekday: day.day,
          initial: day.day.charAt(0),
          weight: day.weight,
          steps: day.steps,
          cals: day.cals,
          protein: day.protein,
          carbs: day.carbs,
          fat: day.fat,
          lifted: day.workout.trim() !== '',
          cardio: day.cardio,
          marks: marksFor(noteTextFor(day)),
        })),
      },
      // The card's week and the two before it, oldest first, so a strip can
      // show the trajectory rather than one point of it.
      recentWeeks: trend.slice(Math.max(0, index - 2), index + 1).map((r) => ({
        rangeLabel: rangeLabel(r.weekStart, r.weekEnd),
        avgWeight: r.avgWeight,
        weightChange: r.weightChange,
        avgCals: r.avgCals,
        avgProtein: r.avgProtein,
        avgSteps: r.avgSteps,
        lifts: r.workouts,
        cardioSessions: r.cardioSessions,
      })),
      phase: phase && {
        label: phase.label,
        type: phase.type,
        startLabel: phase.startLabel,
        weekCount: phase.weekCount,
        dayCount: phase.dayCount,
        startWeight: phase.startWeight,
        currentWeight: phase.currentWeight,
        weightChange: phase.weightChange,
        weightChangePerWeek: phase.weightChangePerWeek,
        recentChangePerWeek: phase.recentChangePerWeek,
        goalWeight: phase.goalWeight,
        goalRemaining: phase.goalRemaining,
        goalPercent: phase.goalPercent,
        projectedGoalLabel: phase.projectedGoalLabel,
      },
      streaks: buildStepStreaks(data.days, data.targets),
      goalStreak: summarize(data.days, data.targets).goalStreak,
      // The whole phase's weighed days, for a sparkline across the cut.
      series: data.days
        .filter((day) => day.weight !== null && (!phase || day.date >= phase.start))
        .map((day) => ({ date: day.date, label: shortDate(day.date), weight: day.weight })),
      units: data.units,
    },
    null,
    2
  )
);
