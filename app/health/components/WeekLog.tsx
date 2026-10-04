import { HealthMarker, HealthNoteMark, WeekSummary, WeeklyGoals, WeeklyTrendRow } from '@/types/health';
import { Marks, dayMarks } from './ConsistencyGrid';
import { downIsGood, formatDelta, formatNumber, shortDate } from './format';

interface Props {
  weeks: WeekSummary[];
  trend: WeeklyTrendRow[];
  weeklyGoals: WeeklyGoals[];
  markers: HealthMarker[];
  noteMarks: HealthNoteMark[];
  weightUnit: string;
}

/** How many weeks the log shows; the rest are in Records › By week. */
const SHOWN = 4;
const DAY_ORDER = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/**
 * The newest weeks as entries in a logbook: the week's averages, its goals, a cell per day, and anything
 * that happened taped on as a note. Wes wants the page to read as a running log of his life, not just
 * training data, so a marker's note belongs with its week.
 */
export default function WeekLog({ weeks, trend, weeklyGoals, markers, noteMarks, weightUnit }: Props) {
  const newest = [...weeks].reverse().slice(0, SHOWN);
  if (newest.length === 0) return null;
  const trendBy = new Map(trend.map((r) => [r.weekStart, r]));
  const goalsBy = new Map(weeklyGoals.map((g) => [g.weekStart, g]));
  const markerByDate = new Map(markers.filter((m) => m.icon).map((m) => [m.date, m]));

  return (
    <>
      <div className="sec-h h-sec">
        <h2>The log</h2>
        <p>
          The last {newest.length === 1 ? 'week' : `${newest.length} weeks`}, newest first. Notes are taped to the week
          they happened.
        </p>
      </div>
      {newest.map((week) => {
        const row = trendBy.get(week.weekStart);
        const isNewest = week === weeks[weeks.length - 1];
        const isOldest = week === weeks[0];
        const goals = goalsBy.get(week.weekStart);
        const byDate = new Map(week.days.map((d) => [d.date, d]));
        const notes = markers.filter((m) => m.date >= week.weekStart && m.date <= week.weekEnd);
        return (
          <article className="h-card h-week" key={week.weekStart} aria-label={`Week ending ${week.label}`}>
            <div className="h-wk-head">
              <div>
                <div className="eyebrow">Week ending</div>
                <h3>{week.label}</h3>
                <div className="h-l">
                  {week.days.length === 1 ? '1 day' : `${week.days.length} days`} recorded
                  {isNewest && row?.isPartial && ' so far'}
                </div>
              </div>
              <div>
                <div className="h-k">Avg weight</div>
                <div className="h-n is-accent">
                  {row?.avgWeight != null ? `${formatNumber(row.avgWeight, 1)} ${weightUnit}` : '—'}
                </div>
                <div className={`h-l ${downIsGood(row?.weightChange ?? null)}`}>
                  {row?.weightChange != null ? `${formatDelta(row.weightChange)} ${weightUnit}` : isOldest ? 'first week' : '—'}
                </div>
              </div>
              {row && (
                <div className="chips h-chips">
                  <span className="chip">
                    {row.avgCals !== null ? formatNumber(row.avgCals) : '—'} kcal
                    {row.calsVsGoal !== null && (
                      <>
                        {' · '}
                        <span className={downIsGood(row.calsVsGoal, 0)}>{formatDelta(row.calsVsGoal, 0)}</span>
                      </>
                    )}
                  </span>
                  {row.avgProtein !== null && <span className="chip">{formatNumber(row.avgProtein)} g protein</span>}
                  {row.avgSteps !== null && <span className="chip">{formatNumber(row.avgSteps)} steps</span>}
                  <span className="chip">
                    {row.workouts} lifts · {row.cardioSessions} cardio · {formatNumber(row.cardioMinutes)} min
                  </span>
                </div>
              )}
              {goals && goals.lines.length > 0 && (
                <ul className="h-ticks" aria-label="Goals this week">
                  {goals.lines.map((l) => (
                    <li key={l.key} className={l.met ? 'is-good' : undefined}>
                      {l.met ? `✓ ${l.label}` : `${l.label} ${l.actual} of ${l.goal}`}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="h-days7">
              {DAY_ORDER.map((name, i) => {
                const date = addDays(week.weekStart, i);
                const day = byDate.get(date);
                if (!day)
                  return (
                    <div className="h-day is-empty" key={date}>
                      <div className="h-dn">
                        <span>{name}</span>
                        <span>{Number(date.slice(8))}</span>
                      </div>
                    </div>
                  );
                const m = dayMarks(day, markerByDate.get(date), noteMarks);
                return (
                  <div className="h-day" key={date} title={m.title}>
                    <div className="h-dn">
                      <span>{name}</span>
                      <span>{Number(date.slice(8))}</span>
                    </div>
                    <div className="h-dw">{day.weight !== null ? formatNumber(day.weight, 1) : '—'}</div>
                    <div className="h-dd">
                      <Marks m={m} />
                    </div>
                  </div>
                );
              })}
            </div>
            {notes.map((n) => (
              <div className="h-paper" key={`${n.date}-${n.label}`}>
                <span className="h-tape" aria-hidden="true" />
                <span className="h-k">{shortDate(n.date)}</span> {n.icon && <span aria-hidden="true">{n.icon} </span>}
                <b>{n.label}</b>
                {n.note && <span className="h-paper-note"> — {n.note}</span>}
              </div>
            ))}
          </article>
        );
      })}
    </>
  );
}
