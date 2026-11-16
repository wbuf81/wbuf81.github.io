import { HealthSummary, PhaseSummary, PhaseType } from '@/types/health';
import { formatDelta, formatNumber, weightTone } from './format';

interface Props {
  summary: HealthSummary;
  /**
   * The block the newest data falls in (leadPhase). The tiles describe it, never a cut and a bulk blended: the
   * averages and the weeks tracked are its own, and the latest weigh-in is counted from its start.
   */
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

/** "this cut", "this bulk", "this block": how a tile names the block it covers. */
const THIS_BLOCK: Record<PhaseType, string> = { cut: 'this cut', bulk: 'this bulk', maintain: 'this block' };

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

function tone(tile: Tile): string {
  if (tile.delta === null || tile.delta === undefined || tile.tone !== 'down-good') return '';
  return weightTone(tile.delta, tile.block ?? null);
}

export default function StatTiles({ summary, phase = null, weightUnit }: Props) {
  // Counted from the start of the block in force, toned by it, so a bulk reads its own gain; with no block, from
  // the start of tracking, as the tracker began (a cut, down is good).
  const sinceBlock =
    phase && phase.startWeight !== null && summary.latestWeight !== null ? summary.latestWeight - phase.startWeight : null;
  // Both sides from the same trailing three weeks: intake taken over another span (all-time, say) would measure a
  // different diet against this one's maintenance.
  const balance =
    summary.estimatedMaintenance !== null && summary.recentAvgCals !== null
      ? summary.estimatedMaintenance - summary.recentAvgCals
      : null;
  // The averages cover the block; without one, every recorded day.
  const scope = phase ? THIS_BLOCK[phase.type] : null;
  const avgCals = phase ? phase.avgCals : summary.avgCals;
  const avgProtein = phase ? phase.avgProtein : summary.avgProtein;
  const avgSteps = phase ? phase.avgSteps : summary.avgSteps;
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
      value: avgCals !== null ? formatNumber(avgCals) : '—',
      detail: scope ? `per day, ${scope}` : 'per day, all recorded days',
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
      value: avgProtein !== null ? `${formatNumber(avgProtein)} g` : '—',
      detail: scope ? `per day, ${scope}` : 'per day',
    },
    {
      label: 'Avg steps',
      value: avgSteps !== null ? formatNumber(avgSteps) : '—',
      detail: scope ? `per day, ${scope}` : 'per day',
    },
    // "This week" (lifts · cardio) now lives in the WeekLead card, which shows
    // the newest — possibly partial — week; repeating it here said it twice.
    {
      // Named for its sign: under maintenance is a deficit, over it a surplus, so a bulk never reads "−158 deficit".
      label: balance !== null && balance < 0 ? 'Est. surplus' : 'Est. deficit',
      value: balance !== null ? `${formatNumber(Math.abs(balance))} kcal` : '—',
      detail: balance !== null ? 'per day, last 3 weeks' : 'needs two weighed weeks',
    },
    {
      label: 'Goal streak',
      value: summary.goalStreak === 1 ? '1 week' : `${summary.goalStreak} weeks`,
      detail:
        summary.goalStreak === 0
          ? 'no full week with all three goals met yet'
          : 'weeks in a row hitting all three goals',
    },
    phase && scope
      ? {
          label: 'Tracked',
          value: plural(phase.weekCount, 'week'),
          detail: `${scope} · ${plural(summary.dayCount, 'day')} in all`,
        }
      : {
          label: 'Tracked',
          value: `${summary.dayCount} days`,
          detail: plural(summary.weekCount, 'week'),
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
