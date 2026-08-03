'use client';

import { HealthMarker, WeekSummary } from '@/types/health';
import { SERIES } from './chartTheme';

interface Props {
  weeks: WeekSummary[];
  /** Dated one-off events. Any with an icon shows it in that day's cell. */
  markers?: HealthMarker[];
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
 *
 * A marker with an icon draws that glyph in its day's cell. The matching note
 * lives in ConsistencyNotes, rendered below the charts. The glyph replaces the
 * rest dash rather than sitting beside it: it explains the same fact more
 * specifically.
 */
export default function ConsistencyGrid({ weeks, markers = [] }: Props) {
  const iconByDate = new Map(
    markers.filter((marker) => marker.icon).map((marker) => [marker.date, marker])
  );

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

              const marker = iconByDate.get(date);
              const parts = [
                day.workout.trim() !== '' ? day.workout : null,
                day.cardio ? `cardio ${day.cardioMinutes ?? 0} min` : null,
              ].filter(Boolean);

              const summary = parts.length ? parts.join(' + ') : 'rest';
              const title = marker
                ? `${date} — ${summary} (${marker.label})`
                : `${date} — ${summary}`;

              return (
                <span key={date} className="consistency-cell" title={title}>
                  {day.workout.trim() !== '' && (
                    <span className="consistency-dot" style={{ background: SERIES.blue }} />
                  )}
                  {day.cardio && (
                    <span className="consistency-dot" style={{ background: SERIES.orange }} />
                  )}
                  {marker && (
                    <span className="consistency-icon" role="img" aria-label={marker.label}>
                      {marker.icon}
                    </span>
                  )}
                  {parts.length === 0 && !marker && <span className="consistency-rest" />}
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
