'use client';

import { HealthMarker, WeekSummary } from '@/types/health';

interface Props {
  markers: HealthMarker[];
  /** Used only to keep notes in step with the range the charts above cover. */
  weeks: WeekSummary[];
}

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/** "2026-07-30" -> "Jul 30" */
function shortLabel(iso: string): string {
  const [, m, d] = iso.split('-').map(Number);
  return `${MONTHS[m - 1]} ${d}`;
}

/**
 * Why an off day was off. Sits below the consistency charts so the marks come
 * first and the explanation follows, rather than interrupting the two charts.
 *
 * Only markers inside the charted range are listed, so a marker dated outside
 * the recorded days never strands a note under a week that isn't shown.
 */
export default function ConsistencyNotes({ markers, weeks }: Props) {
  if (weeks.length === 0) return null;

  const first = weeks[0].weekStart;
  const last = weeks[weeks.length - 1].weekEnd;
  const notes = markers.filter((marker) => marker.date >= first && marker.date <= last);

  if (notes.length === 0) return null;

  return (
    <div className="consistency-notes">
      <h3 className="consistency-notes-title">Notes</h3>
      <ul className="consistency-notes-list">
        {notes.map((marker) => (
          <li key={`${marker.date}-${marker.label}`} className="consistency-note">
            <span className="consistency-note-date">{shortLabel(marker.date)}</span>
            {marker.icon && (
              <span className="consistency-note-icon" aria-hidden="true">
                {marker.icon}
              </span>
            )}
            <span className="consistency-note-label">
              {marker.label}
              {marker.note ? <span className="consistency-note-detail"> — {marker.note}</span> : null}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
