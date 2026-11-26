import type { HealthDay, PhaseSummary } from '@/types/health';
import { GRAMS_PER_LB, STEPS_PER_MILE, soFar } from '@/lib/healthProgress';
import { formatNumber, longDate, shortDate } from './format';
import { dayAndDate } from './RoadToGoal';

interface Props {
  days: HealthDay[];
  /** The block the newest data falls in: the steps milestone is dated at its average a day. */
  lead: PhaseSummary | null;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
/** Monday first, as the week runs on this page. */
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

function ordinal(n: number): string {
  const t = n % 100;
  const suffix = t >= 11 && t <= 13 ? 'th' : n % 10 === 1 ? 'st' : n % 10 === 2 ? 'nd' : n % 10 === 3 ? 'rd' : 'th';
  return `${formatNumber(n)}${suffix}`;
}

function aboutWeeks(w: number): string {
  if (w < 1) return 'under a week';
  const r = Math.round(w);
  return r === 1 ? 'a week' : r === 2 ? 'two weeks' : r === 3 ? 'three weeks' : `${r} weeks`;
}

function Track({ from, to, now, fromLabel = '', toLabel = '' }: { from: number; to: number; now: number; fromLabel?: string; toLabel?: string }) {
  const p = Math.max(0, Math.min(1, (now - from) / (to - from))) * 100;
  return (
    <div className="h-so-trk" aria-hidden="true">
      <div className="h-so-bar">
        <i style={{ width: `${p.toFixed(1)}%` }} />
      </div>
      <div className="h-so-ends">
        <span>{fromLabel}</span>
        <span>{toLabel}</span>
      </div>
    </div>
  );
}

/**
 * Running totals since the first recorded day, each with the next round number and when it falls. The steps figure is
 * a counter; the miles beside it are an assumption (2,100 steps a mile) and say so. Ported from the mockup's idea 5.
 */
export default function SoFar({ days, lead }: Props) {
  const t = soFar(days, lead);
  if (!t) return null;
  const year = t.last.slice(0, 4);
  const word = lead ? (lead.type === 'maintain' ? 'block' : lead.type) : null;
  const { steps, lifts, cardio } = t;
  const hours = Math.floor(cardio.minutes / 60);
  const mins = Math.round(cardio.minutes % 60);
  const digits = formatNumber(steps.total).split('');

  return (
    <section className="h-card">
      <div className="h-card-h">
        <h2>So far</h2>
      </div>
      <p className="h-note">
        Running totals since {longDate(t.first)}, each with the next round number and when it falls.
      </p>
      <div className="h-so">
        <div className="h-so-lead">
          <div className="h-k">Steps</div>
          <div className="h-so-ctr" role="img" aria-label={`${formatNumber(steps.total)} steps`}>
            {digits.map((c, i) =>
              c === ',' ? (
                <span key={i} className="h-so-sep">
                  ,
                </span>
              ) : (
                <span key={i} className="h-so-dg">
                  {c}
                </span>
              ),
            )}
          </div>
          <div className="h-l">
            about {formatNumber(Math.round(steps.miles))} miles, at {formatNumber(STEPS_PER_MILE)} steps a mile
          </div>
          <Track from={steps.prev} to={steps.next} now={steps.total} fromLabel={formatNumber(steps.prev)} toLabel={formatNumber(steps.next)} />
          <div className="h-l">
            Next: <b>{formatNumber(steps.next)}</b>, {formatNumber(steps.next - steps.total)} to go
            {steps.due && steps.perDay !== null && (
              <>
                , due about <b>{dayAndDate(steps.due, year)}</b> at{' '}
                {word ? `this ${word}’s` : 'the average of'} {formatNumber(Math.round(steps.perDay / 10) * 10)} a day
              </>
            )}
          </div>
        </div>
        <div>
          <div className="h-k">Lifts</div>
          <div className="h-n">{formatNumber(lifts.total)}</div>
          <Track from={lifts.prev} to={lifts.next} now={lifts.total} fromLabel={formatNumber(lifts.prev)} toLabel={formatNumber(lifts.next)} />
          <div className="h-l">
            Next: the {ordinal(lifts.next)}
            {lifts.due && (
              <>
                , on <b>{dayAndDate(lifts.due, year)}</b>, lifting {WEEK_ORDER.filter((k) => lifts.weekdays.includes(k)).map((k) => WEEKDAYS[k]).join(', ')}
              </>
            )}
          </div>
        </div>
        <div>
          <div className="h-k">Cardio</div>
          <div className="h-n">{cardio.sessions === 1 ? '1 session' : `${formatNumber(cardio.sessions)} sessions`}</div>
          <div className="h-l">
            {formatNumber(cardio.minutes)} minutes, {hours} h {mins} min
          </div>
          <Track from={cardio.prev} to={cardio.next} now={cardio.minutes} fromLabel={`${cardio.prev / 60} h`} toLabel={`${cardio.next / 60} h`} />
          <div className="h-l">
            Next: {cardio.next / 60} hours, {formatNumber(cardio.next - cardio.minutes)} minutes to go
            {cardio.weeks !== null && (
              <>
                , about {aboutWeeks(cardio.weeks)} at the last three weeks’ {formatNumber(Math.round(cardio.perWeek))} minutes a week
              </>
            )}
          </div>
        </div>
        <div>
          <div className="h-k">Weigh-ins</div>
          <div className="h-n">
            {formatNumber(t.weighIns)} of {formatNumber(t.recorded)}
          </div>
          <Track from={0} to={t.recorded} now={t.weighIns} />
          <div className="h-l">
            {t.weighIns === t.recorded ? `days, every one since ${shortDate(t.first)}` : `days recorded since ${shortDate(t.first)} had one`}
          </div>
        </div>
        <div>
          <div className="h-k">Calories logged</div>
          <div className="h-n">{formatNumber(t.cals.total)}</div>
          <div className="h-l">kcal over {formatNumber(t.cals.days)} days</div>
          <div className="h-k h-so-next">Protein</div>
          <div className="h-n">{formatNumber(t.protein.grams / GRAMS_PER_LB, 1)} lb</div>
          <div className="h-l">
            {formatNumber(t.protein.grams)} g, eaten over {formatNumber(t.protein.days)} days
          </div>
        </div>
      </div>
    </section>
  );
}
