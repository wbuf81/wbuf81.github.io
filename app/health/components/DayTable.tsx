import { HealthDay } from '@/types/health';
import { formatNumber } from './chartTheme';

interface Props {
  days: HealthDay[];
}

function cell(value: number | null, digits = 0): string {
  return value === null ? '—' : formatNumber(value, digits);
}

/** The Monday of the week containing this date, used only to group rows. */
function weekKey(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  // getUTCDay: 0 = Sunday. Shift so Monday is 0.
  const offset = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - offset);
  return date.toISOString().slice(0, 10);
}

/**
 * Every plotted value in text form. This is also the relief for the aqua series
 * colour, which sits below 3:1 contrast against the page surface.
 *
 * Rows are newest-first, so a week boundary is where a row's Monday differs from
 * the row above it. Those rows get a heavier rule, which keeps the seven-day
 * blocks readable without banding every other row.
 */
export default function DayTable({ days }: Props) {
  const newestFirst = [...days].reverse();

  return (
    <div className="table-scroll">
      <table className="health-table">
        <caption className="health-table-caption">All recorded days, newest first</caption>
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Day</th>
            <th scope="col" className="is-num">Cals</th>
            <th scope="col" className="is-num">Protein</th>
            <th scope="col" className="is-num">Carbs</th>
            <th scope="col" className="is-num">Fat</th>
            <th scope="col" className="is-num">Weight</th>
            <th scope="col" className="is-num">Steps</th>
            <th scope="col">Workout</th>
            <th scope="col">Cardio</th>
            <th scope="col">Notes</th>
          </tr>
        </thead>
        <tbody>
          {newestFirst.map((day, index) => (
            <tr
              key={day.date}
              className={
                index > 0 && weekKey(day.date) !== weekKey(newestFirst[index - 1].date)
                  ? 'is-week-start'
                  : undefined
              }
            >
              <td>{day.date.slice(5)}</td>
              <td>{day.day}</td>
              <td className="is-num">{cell(day.cals)}</td>
              <td className="is-num">{cell(day.protein)}</td>
              <td className="is-num">{cell(day.carbs)}</td>
              <td className="is-num">{cell(day.fat)}</td>
              <td className="is-num">{cell(day.weight, 1)}</td>
              <td className="is-num">{cell(day.steps)}</td>
              <td>{day.workout || <span className="is-rest">rest</span>}</td>
              <td>{day.cardio ? `${day.cardioMinutes ?? 0} min` : '—'}</td>
              <td className="is-notes">{day.notes || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
