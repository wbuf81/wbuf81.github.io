import { HealthDay, HealthMarker, HealthNoteMark, WeekSummary } from '@/types/health';
import { noteMarksFor, noteTextFor } from '@/lib/noteMarks';

interface Props {
  weeks: WeekSummary[];
  /** Dated one-off events. Any with an icon shows it in that day's cell. */
  markers?: HealthMarker[];
  /** Glyphs drawn when a day's notes mention the configured phrase. */
  noteMarks?: HealthNoteMark[];
}

const DAY_ORDER = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** What a day's cell shows: lift and cardio dots, note marks, a marker's icon, or the rest dash. */
export function dayMarks(day: HealthDay, marker: HealthMarker | undefined, noteMarks: HealthNoteMark[]) {
  const matched = noteMarksFor(noteTextFor(day), noteMarks);
  const cardioMark = day.cardio ? (matched.find((mark) => mark.replaces === 'cardio') ?? null) : null;
  const extra = matched.filter((mark) => mark.replaces !== 'cardio');
  const lift = day.workout.trim() !== '';
  const parts = [
    lift ? day.workout : null,
    day.cardio ? `${cardioMark ? cardioMark.label : 'cardio'} ${day.cardioMinutes ?? 0} min` : null,
    ...extra.map((mark) => mark.label),
  ].filter(Boolean);
  const summary = parts.length ? parts.join(' + ') : 'rest';
  return {
    lift,
    cardio: day.cardio && !cardioMark,
    cardioMark,
    extra,
    marker: marker?.icon ? marker : undefined,
    rest: parts.length === 0 && !marker?.icon,
    title: marker ? `${day.date}: ${summary} (${marker.label})` : `${day.date}: ${summary}`,
  };
}

/** The marks as elements, shared by the grid and the log's day cells. */
export function Marks({ m }: { m: ReturnType<typeof dayMarks> }) {
  return (
    <>
      {m.lift && <i className="h-dot is-lift" />}
      {m.cardio && <i className="h-dot is-cardio" />}
      {m.cardioMark && (
        <span role="img" aria-label={m.cardioMark.label}>
          {m.cardioMark.icon}
        </span>
      )}
      {m.extra.map((mark) => (
        <span role="img" aria-label={mark.label} key={mark.label}>
          {mark.icon}
        </span>
      ))}
      {m.marker && (
        <span role="img" aria-label={m.marker.label}>
          {m.marker.icon}
        </span>
      )}
      {m.rest && <i className="h-rest" />}
    </>
  );
}

/**
 * One row per week, one cell per day: a lift dot, a cardio dot, both, or the rest dash. Identity is carried
 * by the legend and each cell's title, never by colour alone.
 *
 * A marker's icon replaces the rest dash: it explains the same fact more specifically. A note mark is
 * triggered by the day's own notes, so a cross means church was written down that day, not that it was a
 * Sunday; one flagged `replaces: 'cardio'` takes the cardio dot's place.
 */
export default function ConsistencyGrid({ weeks, markers = [], noteMarks = [] }: Props) {
  const markerByDate = new Map(markers.filter((m) => m.icon).map((m) => [m.date, m]));

  return (
    <>
      <div className="h-grid7">
        <span aria-hidden="true" />
        {DAY_ORDER.map((d, i) => (
          <span key={d + i} className="h-dh" aria-hidden="true">
            {d.charAt(0)}
          </span>
        ))}
        {weeks.map((week) => {
          const byDate = new Map(week.days.map((day) => [day.date, day]));
          return [
            <span key={`${week.weekStart}-label`} className="h-wl">
              {week.label}
            </span>,
            ...DAY_ORDER.map((_, i) => {
              const date = addDays(week.weekStart, i);
              const day = byDate.get(date);
              if (!day) return <span key={date} className="h-cell is-empty" title={`${date}: no data`} />;
              const m = dayMarks(day, markerByDate.get(date), noteMarks);
              return (
                <span key={date} className="h-cell" title={m.title}>
                  <Marks m={m} />
                </span>
              );
            }),
          ];
        })}
      </div>
      <div className="h-legend is-below">
        <span>
          <i className="h-dot is-lift" />
          Lift
        </span>
        <span>
          <i className="h-dot is-cardio" />
          Cardio
        </span>
        <span>
          <i className="h-rest" />
          Rest
        </span>
        {noteMarks
          .filter((mark) => mark.icon.trim() !== '')
          .map((mark) => (
            <span key={mark.label}>
              <span aria-hidden="true">{mark.icon}</span> {mark.label}
            </span>
          ))}
      </div>
    </>
  );
}
