import { HealthDay, HealthMarker, HealthNoteMark, WeekSummary, WeeklyGoals } from '@/types/health';
import { CardioSide, cardioMornings } from '@/lib/healthInsights';
import ConsistencyGrid from './ConsistencyGrid';
import GoalTracker from './GoalTracker';
import { downIsGood, formatDelta, formatNumber } from './format';

interface Props {
  days: HealthDay[];
  weeks: WeekSummary[];
  weeklyGoals: WeeklyGoals[];
  streak: number;
  markers: HealthMarker[];
  noteMarks: HealthNoteMark[];
  weightUnit: string;
}

/** The goals for the newest week, the week-by-day grid, and what a cardio day does to the next morning. */
export default function Consistency({ days, weeks, weeklyGoals, streak, markers, noteMarks, weightUnit }: Props) {
  const cardio = cardioMornings(days);
  const newest = weeklyGoals[weeklyGoals.length - 1];
  const metCount = newest ? newest.lines.filter((l) => l.met).length : 0;

  return (
    <section className="h-card">
      <div className="h-card-h">
        <h2>Consistency</h2>
        {newest && newest.lines.length > 0 && (
          <span className="h-aside">
            {streak > 0 ? (
              <>
                <b>{streak === 1 ? '1 week' : `${streak} weeks`}</b> in a row, all {newest.lines.length} met
              </>
            ) : (
              <>
                <b>
                  {metCount} of {newest.lines.length}
                </b>{' '}
                met this week
              </>
            )}
          </span>
        )}
      </div>
      <GoalTracker rows={weeklyGoals} />
      <ConsistencyGrid weeks={weeks} markers={markers} noteMarks={noteMarks} />
      {cardio.withCardio.n > 0 && cardio.without.n > 0 && (
        <div className="h-facts">
          <CardioFact label="The morning after cardio" side={cardio.withCardio} weightUnit={weightUnit} />
          <CardioFact label="The morning after none" side={cardio.without} weightUnit={weightUnit} />
        </div>
      )}
    </section>
  );
}

function CardioFact({ label, side, weightUnit }: { label: string; side: CardioSide; weightUnit: string }) {
  return (
    <div>
      <div className="h-k">{label}</div>
      <div className={`h-n ${downIsGood(side.avg)}`}>{side.avg === null ? '—' : `${formatDelta(side.avg)} ${weightUnit}`}</div>
      <div className="h-l">
        Monday to Friday, average of {side.n} {side.n === 1 ? 'day' : 'days'}
        {side.avgCals !== null && `; ${formatNumber(side.avgCals)} kcal eaten on them`}
      </div>
    </div>
  );
}
