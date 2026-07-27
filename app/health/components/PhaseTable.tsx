import { PhaseSummary } from '@/types/health';
import { formatDelta, formatNumber } from './chartTheme';

interface Props {
  phases: PhaseSummary[];
  weightUnit: string;
}

function num(value: number | null, digits = 0): string {
  return value === null ? '—' : formatNumber(value, digits);
}

/** For a cut, down is good; for a bulk, up is; maintenance has no direction. */
function changeClass(phase: PhaseSummary): string {
  const { weightChange, type } = phase;
  if (weightChange === null || weightChange === 0 || type === 'maintain') return 'is-num';

  const desired = type === 'cut' ? -1 : 1;
  return Math.sign(weightChange) === desired ? 'is-num is-good' : 'is-num is-up';
}

export default function PhaseTable({ phases, weightUnit }: Props) {
  const newestFirst = [...phases].reverse();

  return (
    <div className="table-scroll">
      <table className="health-table">
        <thead>
          <tr>
            <th scope="col">Phase</th>
            <th scope="col">Dates</th>
            <th scope="col" className="is-num">Weeks</th>
            <th scope="col" className="is-num">Start</th>
            <th scope="col" className="is-num">End</th>
            <th scope="col" className="is-num">Change</th>
            <th scope="col" className="is-num">Avg cals</th>
            <th scope="col" className="is-num">Avg steps</th>
            <th scope="col" className="is-num">Lifts</th>
            <th scope="col" className="is-num">Cardio</th>
          </tr>
        </thead>
        <tbody>
          {newestFirst.map((phase) => (
            <tr key={phase.start}>
              <th scope="row" className="is-week">
                <span className={`phase-chip is-${phase.type}`}>{phase.label}</span>
                {phase.isOngoing && <span className="is-partial">ongoing</span>}
              </th>
              <td>
                {phase.startLabel} – {phase.endLabel ?? 'now'}
              </td>
              <td className="is-num">{phase.weekCount}</td>
              <td className="is-num">{num(phase.startWeight, 1)}</td>
              <td className="is-num">{num(phase.currentWeight, 1)}</td>
              <td className={changeClass(phase)}>
                {phase.weightChange !== null
                  ? `${formatDelta(phase.weightChange)} ${weightUnit}`
                  : '—'}
              </td>
              <td className="is-num">{num(phase.avgCals)}</td>
              <td className="is-num">{num(phase.avgSteps)}</td>
              <td className="is-num">{phase.workouts}</td>
              <td className="is-num">{phase.cardioSessions}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
