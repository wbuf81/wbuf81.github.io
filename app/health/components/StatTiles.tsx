import { HealthSummary, PhaseSummary } from '@/types/health';
import { formatDelta, formatNumber, weightTone } from './format';

interface Props {
  summary: HealthSummary;
  /** The block the newest data falls in (leadPhase): the latest weigh-in is counted from its start. */
  phase?: PhaseSummary | null;
  weightUnit: string;
}

interface Tile {
  label: string;
  value: string;
  detail?: string;
  /** A weight change, coloured by the block it's counted in (`block`); without one, a fall is the good direction. */
  tone?: 'down-good' | 'neutral';
  delta?: number | null;
  block?: PhaseSummary['type'] | null;
}

function tone(tile: Tile): string {
  if (tile.delta === null || tile.delta === undefined || tile.tone !== 'down-good') return '';
  return weightTone(tile.delta, tile.block ?? null);
}

export default function StatTiles({ summary, phase = null, weightUnit }: Props) {
  // Counted from the start of the block in force, toned by it, so a bulk reads its own gain; with no block, from
  // the start of tracking, as the tracker began (a cut, down is good).
  const sinceBlock =
    phase && phase.startWeight !== null && summary.latestWeight !== null ? summary.latestWeight - phase.startWeight : null;
  const balance =
    summary.estimatedMaintenance !== null && summary.avgCals !== null
      ? summary.estimatedMaintenance - summary.avgCals
      : null;
  const tiles: Tile[] = [
    // The week-over-week average leads the page in WeekLead, so this is only the
    // most recent number on the scale — labelled as the single reading it is,
    // and scored against the start of tracking rather than against last week.
    {
      label: 'Latest weigh-in',
      value: summary.latestWeight !== null ? `${formatNumber(summary.latestWeight, 1)} ${weightUnit}` : '—',
      detail:
        phase && sinceBlock !== null
          ? `one reading · ${formatDelta(sinceBlock)} ${weightUnit} since ${phase.startLabel}`
          : summary.weightChangeTotal !== null
            ? `one reading · ${formatDelta(summary.weightChangeTotal)} ${weightUnit} since start`
            : 'one reading',
      tone: 'down-good',
      delta: phase && sinceBlock !== null ? sinceBlock : summary.weightChangeTotal,
      block: phase && sinceBlock !== null ? phase.type : null,
    },
    {
      label: 'Avg calories',
      value: summary.avgCals !== null ? formatNumber(summary.avgCals) : '—',
      detail: 'per day, all recorded days',
    },
    {
      label: 'Est. maintenance',
      value:
        summary.estimatedMaintenance !== null ? formatNumber(summary.estimatedMaintenance) : '—',
      detail:
        summary.estimatedMaintenance !== null
          ? 'kcal/day implied by the last 3 weeks'
          : 'needs two weighed weeks',
    },
    {
      label: 'Avg protein',
      value: summary.avgProtein !== null ? `${formatNumber(summary.avgProtein)} g` : '—',
      detail: 'per day',
    },
    {
      label: 'Avg steps',
      value: summary.avgSteps !== null ? formatNumber(summary.avgSteps) : '—',
      detail: 'per day',
    },
    // "This week" (lifts · cardio) now lives in the WeekLead card, which shows
    // the newest — possibly partial — week; repeating it here said it twice.
    {
      // Named for its sign: under maintenance is a deficit, over it a surplus, so a bulk never reads "−158 deficit".
      label: balance !== null && balance < 0 ? 'Est. surplus' : 'Est. deficit',
      value: balance !== null ? `${formatNumber(Math.abs(balance))} kcal` : '—',
      detail:
        summary.estimatedMaintenance !== null && summary.avgCals !== null
          ? 'per day, last 3 weeks'
          : 'needs two weighed weeks',
    },
    {
      label: 'Goal streak',
      value: summary.goalStreak === 1 ? '1 week' : `${summary.goalStreak} weeks`,
      detail:
        summary.goalStreak === 0
          ? 'no full week with all three goals met yet'
          : 'weeks in a row hitting all three goals',
    },
    {
      label: 'Tracked',
      value: `${summary.dayCount} days`,
      detail: summary.weekCount === 1 ? '1 week' : `${summary.weekCount} weeks`,
    },
  ];

  return (
    <div className="stats h-tiles">
      {tiles.map((tile) => (
        <div key={tile.label}>
          <div className="k">{tile.label}</div>
          <div className="n">{tile.value}</div>
          {tile.detail && <div className={`l ${tone(tile)}`}>{tile.detail}</div>}
        </div>
      ))}
    </div>
  );
}
