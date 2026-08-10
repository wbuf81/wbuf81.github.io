import { HealthSummary } from '@/types/health';
import { formatDelta, formatNumber } from './chartTheme';

interface Props {
  summary: HealthSummary;
  weightUnit: string;
}

interface Tile {
  label: string;
  value: string;
  detail?: string;
  /** Lower is the goal for weight, so a fall is the good direction. */
  tone?: 'down-good' | 'neutral';
  delta?: number | null;
}

function tone(delta: number | null | undefined, kind: Tile['tone']): string {
  if (delta === null || delta === undefined || delta === 0 || kind !== 'down-good') return '';
  return delta < 0 ? ' is-good' : ' is-up';
}

export default function StatTiles({ summary, weightUnit }: Props) {
  const tiles: Tile[] = [
    {
      label: 'Current weight',
      value: summary.latestWeight !== null ? `${formatNumber(summary.latestWeight, 1)} ${weightUnit}` : '—',
      detail:
        summary.weightChangeTotal !== null
          ? `${formatDelta(summary.weightChangeTotal)} ${weightUnit} since start`
          : undefined,
      tone: 'down-good',
      delta: summary.weightChangeTotal,
    },
    {
      label: 'Week over week',
      value:
        summary.weightChangeWeek !== null
          ? `${formatDelta(summary.weightChangeWeek)} ${weightUnit}`
          : '—',
      detail: summary.weightChangeWeek !== null ? 'vs previous week average' : 'needs a second week',
      tone: 'down-good',
      delta: summary.weightChangeWeek,
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
          ? 'kcal/day implied by intake vs weight change'
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
    {
      label: 'This week',
      value: `${summary.workoutsThisWeek} lifts · ${summary.cardioSessionsThisWeek} cardio`,
      detail: `${formatNumber(summary.cardioMinutesThisWeek)} cardio minutes`,
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
    <div className="stat-tiles">
      {tiles.map((tile) => (
        <div className="stat-tile" key={tile.label}>
          <p className="stat-label">{tile.label}</p>
          <p className={`stat-value${tone(tile.delta, tile.tone)}`}>{tile.value}</p>
          {tile.detail && <p className="stat-detail">{tile.detail}</p>}
        </div>
      ))}
    </div>
  );
}
