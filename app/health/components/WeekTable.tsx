import { WeeklyTrendRow } from '@/types/health';
import { formatDelta, formatNumber } from './chartTheme';

interface Props {
  rows: WeeklyTrendRow[];
  weightUnit: string;
}

function num(value: number | null, digits = 0): string {
  return value === null ? '—' : formatNumber(value, digits);
}

/** Losing weight is the goal, so a fall is the good direction. */
function changeClass(change: number | null): string {
  if (change === null || change === 0) return 'is-num';
  return change < 0 ? 'is-num is-good' : 'is-num is-up';
}

export default function WeekTable({ rows, weightUnit }: Props) {
  const newestFirst = [...rows].reverse();

  return (
    <div className="table-scroll">
      {/*
        No visible caption: the section heading and its note above already say
        what this table is, and two grey lines saying it twice read as a mistake.
        The label keeps the table named for screen readers.
      */}
      <table className="health-table" aria-label="Weekly averages, newest first">

        <thead>
          <tr>
            <th scope="col">Week of</th>
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
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
