import { StepStreak, StepStreaks as Streaks } from '@/types/health';
import { formatNumber } from './chartTheme';

interface Props {
  streaks: Streaks;
}

function dayCount(value: number): string {
  return value === 1 ? '1 day' : `${formatNumber(value)} days`;
}

/**
 * How long the floor and the goal have each been held.
 *
 * `best` is often the current run, so saying both would print the same number
 * twice; when they match it reads as a record instead. A run of zero says which
 * day broke it is the chart's job, not this readout's — it just reports the
 * honest zero.
 */
function detail(streak: StepStreak): string {
  if (streak.current === 0) return `best run ${dayCount(streak.best)}`;
  if (streak.current === streak.best) return 'best run yet';
  return `best run ${dayCount(streak.best)}`;
}

export default function StepStreaks({ streaks }: Props) {
  const rows = [
    { key: 'min', threshold: streaks.minimum, label: 'floor', streak: streaks.aboveMinimum },
    { key: 'goal', threshold: streaks.goal, label: 'goal', streak: streaks.aboveGoal },
  ].filter((row) => row.threshold !== null);

  if (rows.length === 0) return null;

  return (
    <ul className="step-streaks">
      {rows.map((row) => (
        <li key={row.key}>
          <p className="stat-label">
            Above the {formatNumber(row.threshold as number)} {row.label}
          </p>
          <p className="streak-value">{dayCount(row.streak.current)}</p>
          <p className="stat-detail">{detail(row.streak)}</p>
        </li>
      ))}
    </ul>
  );
}
