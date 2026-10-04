import { WeeklyGoals } from '@/types/health';

interface Props {
  /** Newest last, as built by buildWeeklyGoals. */
  rows: WeeklyGoals[];
}

/**
 * The three standing goals, scored against the newest week. Each is a meter, not a chart: one magnitude
 * against a known ceiling. Met state carries a check glyph and words as well as colour, and the count is
 * always spelled out, so the meter is never the only source of the number.
 */
export default function GoalTracker({ rows }: Props) {
  const week = rows[rows.length - 1];
  if (!week || week.lines.length === 0) return null;

  return (
    <div className="h-goals-wrap">
      <div className="eyebrow">
        Week ending {week.label}
        {!week.isComplete && ' · in progress'}
      </div>
      <ul className="h-goals">
        {week.lines.map((line) => (
          <li key={line.key} className={line.met ? 'is-met' : undefined}>
            <div className="h-goal-top">
              <span>{line.label}</span>
              <span className={line.met ? 'is-good' : undefined}>
                {line.met && <span aria-hidden="true">✓ </span>}
                {line.actual}/{line.goal}
              </span>
            </div>
            <div className="h-meter" role="img" aria-label={`${line.description}: ${line.actual} of ${line.goal}`}>
              <i style={{ width: `${Math.min(100, (line.actual / line.goal) * 100)}%` }} />
            </div>
            <div className="h-l">{line.met ? line.description : `${line.remaining} to go: ${line.description.toLowerCase()}`}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
