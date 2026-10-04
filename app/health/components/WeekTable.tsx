import { HealthMarker, WeeklyTrendRow } from '@/types/health';
import { formatDelta, formatNumber } from './format';

interface Props {
  rows: WeeklyTrendRow[];
  /** Dated events, listed against the week they fell in. */
  markers?: HealthMarker[];
  weightUnit: string;
}

function num(value: number | null, digits = 0): string {
  return value === null ? '—' : formatNumber(value, digits);
}

/** Losing weight is the goal, so a fall is the good direction. */
function changeClass(change: number | null): string {
  if (change === null || change === 0) return 'is-num';
  return change < 0 ? 'is-num is-good' : 'is-num is-over';
}

export default function WeekTable({ rows, markers = [], weightUnit }: Props) {
  const newestFirst = [...rows].reverse();

  return (
    <div className="h-scroll">
      {/* No visible caption: the tab and its note already say what this is; the label names it for screen readers. */}
      <table className="h-table" aria-label="Weekly averages, newest first">

        <thead>
          <tr>
            <th scope="col">Week ending</th>
            <th scope="col" className="is-num">Days</th>
            <th scope="col" className="is-num">Avg weight</th>
            <th scope="col" className="is-num">Change</th>
            <th scope="col" className="is-num">Avg cals</th>
            <th scope="col" className="is-num">vs goal</th>
            <th scope="col" className="is-num">Avg protein</th>
            <th scope="col" className="is-num">Avg steps</th>
            <th scope="col" className="is-num">Lifts</th>
            <th scope="col" className="is-num">Cardio</th>
            <th scope="col" className="is-num">Cardio min</th>
            <th scope="col">Notes</th>
          </tr>
        </thead>
        <tbody>
          {newestFirst.map((row) => (
            <tr key={row.weekStart}>
              <th scope="row" className="is-week">
                {row.label}
                {row.isPartial && (
                  <span className="is-partial" title={`Only ${row.dayCount} of 7 days recorded`}>
                    partial
                  </span>
                )}
              </th>
              <td className="is-num">{row.dayCount}</td>
              <td className="is-num">{num(row.avgWeight, 1)}</td>
              <td className={changeClass(row.weightChange)}>
                {row.weightChange === null ? '—' : `${formatDelta(row.weightChange)} ${weightUnit}`}
              </td>
              <td className="is-num">{num(row.avgCals)}</td>
              {/* Under the calorie goal is the good direction, like losing weight. */}
              <td className={changeClass(row.calsVsGoal)}>
                {row.calsVsGoal === null ? '—' : formatDelta(row.calsVsGoal, 0)}
              </td>
              <td className="is-num">{row.avgProtein === null ? '—' : `${num(row.avgProtein)} g`}</td>
              <td className="is-num">{num(row.avgSteps)}</td>
              <td className="is-num">{row.workouts}</td>
              <td className="is-num">{row.cardioSessions}</td>
              <td className="is-num">{formatNumber(row.cardioMinutes)}</td>
              <td className="is-notes">
                {markers
                  .filter((m) => m.date >= row.weekStart && m.date <= row.weekEnd)
                  .map((m) => `${m.icon ? `${m.icon} ` : ''}${m.label}`)
                  .join(' · ') || '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
