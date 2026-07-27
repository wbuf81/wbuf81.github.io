'use client';

import { WeekSummary } from '@/types/health';
import { SERIES } from './chartTheme';

interface Props {
  weeks: WeekSummary[];
}

const DAY_ORDER = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return date.toISOString().slice(0, 10);
}

/**
 * One row per week, one cell per day. A blue dot marks a lifting session and an
 * orange dot marks cardio, so a day that had both shows both. Identity is
 * carried by the legend and each cell's title text, never by color alone.
 */
export default function ConsistencyGrid({ weeks }: Props) {
  return (
    <div className="consistency">
      <div className="consistency-head" aria-hidden="true">
        <span className="consistency-week-label" />
        {DAY_ORDER.map((day) => (
          <span key={day} className="consistency-day-name">
            {day.charAt(0)}
          </span>
        ))}
      </div>

      {weeks.map((week) => {
        const byDate = new Map(week.days.map((day) => [day.date, day]));

        return (
          <div className="consistency-row" key={week.weekStart}>
            <span className="consistency-week-label">{week.label}</span>
            {DAY_ORDER.map((_, index) => {
              const date = addDays(week.weekStart, index);
              const day = byDate.get(date);

              if (!day) {
                return <span key={date} className="consistency-cell is-empty" title={`${date}: no data`} />;
              }

              const parts = [
                day.workout.trim() !== '' ? day.workout : null,
                day.cardio ? `cardio ${day.cardioMinutes ?? 0} min` : null,
              ].filter(Boolean);

              return (
                <span
                  key={date}
                  className="consistency-cell"
                  title={`${date} — ${parts.length ? parts.join(' + ') : 'rest'}`}
                >
                  {day.workout.trim() !== '' && (
                    <span className="consistency-dot" style={{ background: SERIES.blue }} />
                  )}
                  {day.cardio && (
                    <span className="consistency-dot" style={{ background: SERIES.orange }} />
                  )}
                  {parts.length === 0 && <span className="consistency-rest" />}
                </span>
              );
            })}
          </div>
        );
      })}

      <p className="consistency-legend">
        <span className="consistency-key">
          <span className="consistency-dot" style={{ background: SERIES.blue }} aria-hidden="true" /> Lift
        </span>
        <span className="consistency-key">
          <span className="consistency-dot" style={{ background: SERIES.orange }} aria-hidden="true" /> Cardio
        </span>
        <span className="consistency-key">
          <span className="consistency-rest" aria-hidden="true" /> Rest
        </span>
      </p>
    </div>
  );
}
