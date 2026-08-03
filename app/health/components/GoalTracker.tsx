'use client';

import { WeeklyGoals } from '@/types/health';

interface Props {
  /** Newest last, as built by buildWeeklyGoals. */
  rows: WeeklyGoals[];
  /** Consecutive weeks with every goal met. */
  streak: number;
}

/**
 * The three standing goals, scored against the newest week.
 *
 * Each goal gets a meter rather than a chart: the question is "how far into this
 * week's target am I", which is a single magnitude against a known ceiling. Met
 * state is carried by a check glyph and the words, never by color alone, and the
 * count is always spelled out so the meter is decoration rather than the only
 * source of the number.
 */
export default function GoalTracker({ rows, streak }: Props) {
  const week = rows[rows.length - 1];
  if (!week || week.lines.length === 0) return null;

  const metCount = week.lines.filter((line) => line.met).length;

  return (
    <div className="goals">
      <div className="goals-head">
        <p className="goals-week">
          Week of {week.label}
          {!week.isComplete && <span className="goals-partial">in progress</span>}
        </p>
        <p className="goals-streak">
          {streak > 0 ? (
            <>
              <strong>
                {streak} {streak === 1 ? 'week' : 'weeks'}
              </strong>{' '}
              in a row with all three met
            </>
          ) : (
            <>
              <strong>
                {metCount} of {week.lines.length}
              </strong>{' '}
              met this week
            </>
          )}
        </p>
      </div>

      <ul className="goals-list">
        {week.lines.map((line) => {
          const percent = Math.min(100, (line.actual / line.goal) * 100);

          return (
            <li key={line.key} className={`goal${line.met ? ' is-met' : ''}`}>
              <div className="goal-top">
                <span className="goal-label">{line.label}</span>
                <span className="goal-count">
                  {line.actual}
                  <span className="goal-of">/{line.goal}</span>
                </span>
              </div>

              <div
                className="goal-meter"
                role="img"
                aria-label={`${line.description}: ${line.actual} of ${line.goal}`}
              >
                <span className="goal-meter-fill" style={{ width: `${percent}%` }} />
              </div>

              <p className="goal-status">
                {line.met ? (
                  <>
                    <span aria-hidden="true">✓</span> {line.description}
                  </>
                ) : (
                  `${line.remaining} to go — ${line.description.toLowerCase()}`
                )}
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
