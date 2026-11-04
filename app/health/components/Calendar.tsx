'use client';

import { useMemo, useState } from 'react';
import {
  type CalendarDay,
  type Light,
  addDays,
  monthGrid,
  monthSummary,
  monthsWithData,
  weekSummary,
} from '@/lib/healthCalendar';
import { formatDelta, formatNumber } from './format';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const SHORT = MONTHS.map((m) => m.slice(0, 3));
const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const WORD: Record<Light, string> = { hit: 'hit', close: 'close', miss: 'missed', none: 'not scored' };

const label = (date: string) => `${SHORT[Number(date.slice(5, 7)) - 1]} ${Number(date.slice(8))}`;
const n = (v: number | null, digits = 0) => (v === null ? '—' : formatNumber(v, digits));

/**
 * The month, Monday first, each day as three lights (calories, protein, steps) or as its numbers, with the
 * week's average in a column on the right. Rules in lib/healthCalendar.ts. Opens on the month the newest week began in.
 */
export default function Calendar({ days, weightUnit }: { days: CalendarDay[]; weightUnit: string }) {
  const byDate = useMemo(() => new Map(days.map((d) => [d.date, d])), [days]);
  const months = useMemo(() => monthsWithData(days), [days]);
  // Open on the month the newest week began in: the week ending Sun Nov 1 opens October, not a November
  // holding one day. Once a week starting in the new month is in, it opens there.
  const [month, setMonth] = useState(() => {
    const newest = days[days.length - 1]?.date;
    if (!newest) return months[months.length - 1];
    const back = (new Date(`${newest}T12:00:00Z`).getUTCDay() + 6) % 7;
    const opening = addDays(newest, -back).slice(0, 7);
    return months.includes(opening) ? opening : months[months.length - 1];
  });
  const [mode, setMode] = useState<'lights' | 'numbers'>('lights');
  const [picked, setPicked] = useState<string | null>(null);

  if (!month) return null;
  const [year, mon] = month.split('-').map(Number);
  const at = months.indexOf(month);
  const grid = monthGrid(year, mon);
  const sum = monthSummary(days, year, mon);
  const inMonth = days.filter((d) => d.date.startsWith(month));
  const selected = picked && picked.startsWith(month) ? byDate.get(picked) : inMonth[inMonth.length - 1];
  const blocks = [...new Set(inMonth.map((d) => d.phase?.label).filter(Boolean))].join(' → ');
  const bulk = inMonth[inMonth.length - 1]?.phase?.type === 'bulk';

  const go = (step: number) => {
    const next = months[at + step];
    if (next) setMonth(next);
  };

  const facts = [
    { k: 'Days logged', v: String(sum.daysLogged), l: `of ${sum.daysInMonth}` },
    { k: 'All three hit', v: String(sum.allThree), l: 'calories · protein · steps' },
    { k: 'Avg weight', v: n(sum.avgWeight, 1), l: `${weightUnit}, every weigh-in` },
    { k: 'Avg calories', v: n(sum.avgCals), l: 'per day' },
    { k: 'Avg steps', v: n(sum.avgSteps), l: 'per day' },
    { k: 'Training', v: `${sum.lifts} · ${sum.cardio}`, l: 'lifts · cardio' },
  ];

  return (
    <section className="h-card h-cal" aria-label="Calendar">
      <div className="h-cal-head">
        <div className="h-cal-month">
          <button type="button" className="h-cal-step" onClick={() => go(-1)} disabled={at <= 0} aria-label="Previous month">
            ‹
          </button>
          <h2 aria-live="polite">
            {MONTHS[mon - 1]} {year}
          </h2>
          <button type="button" className="h-cal-step" onClick={() => go(1)} disabled={at >= months.length - 1} aria-label="Next month">
            ›
          </button>
          {blocks && <span className="tag acc">{blocks}</span>}
        </div>
        <div className="h-seg" role="group" aria-label="Show">
          <button type="button" aria-pressed={mode === 'lights'} onClick={() => setMode('lights')}>
            Lights
          </button>
          <button type="button" aria-pressed={mode === 'numbers'} onClick={() => setMode('numbers')}>
            Numbers
          </button>
        </div>
      </div>

      <div className="h-cal-sum">
        {facts.map((f) => (
          <div key={f.k}>
            <div className="h-k">{f.k}</div>
            <div className="h-n">{f.v}</div>
            <div className="h-l">{f.l}</div>
          </div>
        ))}
      </div>

      <div className={`h-cal-grid${bulk ? ' is-bulk' : ''}`}>
        {DOW.map((d) => (
          <div key={d} className="h-cal-dow">
            {d}
          </div>
        ))}
        <div className="h-cal-dow is-week">Week</div>
        {grid.map((week) => {
          const ws = weekSummary(days, week.monday);
          const sunday = addDays(week.monday, 6);
          return [
            ...week.dates.map((date, i) =>
              date === null ? (
                <div key={`${week.monday}-${i}`} className="h-cal-day is-blank" aria-hidden="true" />
              ) : (
                <Day
                  key={date}
                  date={date}
                  day={byDate.get(date)}
                  mode={mode}
                  selected={selected?.date === date}
                  onPick={setPicked}
                  weightUnit={weightUnit}
                />
              ),
            ),
            <div key={`${week.monday}-wk`} className="h-cal-wk">
              {ws && (
                <>
                  <div className="h-k">Ending {label(sunday)}</div>
                  <div className="h-cal-wa">{n(ws.avgWeight, 1)}</div>
                  <div className={`h-cal-wd ${tone(ws.change)}`}>
                    {ws.change === null ? 'first week' : `${formatDelta(ws.change)} ${weightUnit} avg`}
                  </div>
                  <div className="h-l">
                    {ws.lifts} lifts · {ws.cardio} cardio{ws.dayCount < 7 ? ` · ${ws.dayCount} days` : ''}
                  </div>
                </>
              )}
            </div>,
          ];
        })}
      </div>

      <div className="h-cal-legend">
        {mode === 'lights' && (
          <>
            <span><i className="h-cal-dot is-hit" />Hit</span>
            <span><i className="h-cal-dot is-close" />Close</span>
            <span><i className="h-cal-dot is-miss" />Missed</span>
          </>
        )}
        <span><span className="h-cal-chip">L</span>Lift</span>
        <span><span className="h-cal-chip">C</span>Cardio (minutes when not 30)</span>
      </div>
      <p className="h-note">
        Each day is scored against the targets in force that day. Calories: on a cut, at or under the target is a hit
        and up to 10% over is close; on a bulk, within 5% either way is a hit and within 10% close. Protein: the goal is
        a hit, within 10% close. Steps: the goal is a hit, the floor close. The right-hand column is the week, named
        for the Sunday it ends on.
      </p>

      {selected && <Detail day={selected} byDate={byDate} weightUnit={weightUnit} />}
    </section>
  );
}

/** A weight change coloured for the block: down is good on a cut, up on a bulk (the grid's is-bulk flips it). */
function tone(change: number | null) {
  if (change === null || Math.abs(change) < 0.05) return '';
  return change < 0 ? 'is-down' : 'is-up';
}

function Training({ day }: { day: CalendarDay }) {
  const chips = [];
  if (day.workout) chips.push(<span key="l" className="h-cal-chip" title={day.workout}>L</span>);
  if (day.cardioIcon) chips.push(<span key="c" className="h-cal-chip" title={day.cardioLabel ?? 'Cardio'}>{day.cardioIcon}</span>);
  else if (day.cardio)
    chips.push(
      <span key="c" className="h-cal-chip" title={`Cardio${day.cardioMinutes ? `, ${day.cardioMinutes} min` : ''}`}>
        C{day.cardioMinutes && day.cardioMinutes !== 30 ? day.cardioMinutes : ''}
      </span>,
    );
  if (!chips.length) chips.push(<span key="r" className="h-cal-chip is-rest">rest</span>);
  return <div className="h-cal-train">{chips}</div>;
}

function Day({
  date,
  day,
  mode,
  selected,
  onPick,
  weightUnit,
}: {
  date: string;
  day: CalendarDay | undefined;
  mode: 'lights' | 'numbers';
  selected: boolean;
  onPick: (date: string) => void;
  weightUnit: string;
}) {
  const num = Number(date.slice(8));
  if (!day) {
    return (
      <div className="h-cal-day is-empty">
        <span className="h-cal-dn">{num}</span>
      </div>
    );
  }
  const { cals, protein, steps } = day.lights;
  const aria = `${label(date)}: ${day.weight !== null ? `${n(day.weight, 1)} ${weightUnit}, ` : ''}calories ${n(day.cals)} ${WORD[cals]}, protein ${n(day.protein)} g ${WORD[protein]}, steps ${n(day.steps)} ${WORD[steps]}`;
  return (
    <button type="button" className="h-cal-day" aria-pressed={selected} aria-label={aria} onClick={() => onPick(date)}>
      <span className="h-cal-top">
        <span className="h-cal-dn">{num}</span>
        <span className="h-cal-icons">{day.icons.join('')}</span>
      </span>
      {mode === 'lights' ? (
        <span className="h-cal-lights">
          <i className={`h-cal-dot is-${cals}`} />
          <span className="h-cal-lbl">kcal</span>
          <i className={`h-cal-dot is-${protein}`} />
          <span className="h-cal-lbl">protein</span>
          <i className={`h-cal-dot is-${steps}`} />
          <span className="h-cal-lbl">steps</span>
        </span>
      ) : (
        <span className="h-cal-nums">
          <span className="h-cal-wt">{n(day.weight, 1)}</span>
          <span className={`is-${cals}`}>
            {n(day.cals)} <small>kcal</small>
          </span>
          <span className={`is-${protein} h-cal-xtra`}>
            {n(day.protein)} <small>g pro</small>
          </span>
          <span className={`is-${steps} h-cal-xtra`}>
            {day.steps === null ? '—' : `${formatNumber(day.steps / 1000, 1)}k`} <small>steps</small>
          </span>
        </span>
      )}
      <Training day={day} />
    </button>
  );
}

function Detail({ day, byDate, weightUnit }: { day: CalendarDay; byDate: Map<string, CalendarDay>; weightUnit: string }) {
  const before = byDate.get(addDays(day.date, -1));
  const weekday = new Date(`${day.date}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
  const ink = (l: Light) => (l === 'hit' ? 'is-good' : l === 'miss' ? 'is-over' : '');
  return (
    <div className="h-cal-detail">
      <div className="h-cal-dh">
        <h3>
          {weekday}, {label(day.date)}
        </h3>
        {day.phase && <span className="tag">{day.phase.label}</span>}
        {day.marker && (
          <span className="tag acc">
            {day.icons[0]} {day.marker}
          </span>
        )}
      </div>
      <div className="h-cal-facts">
        <div>
          <div className="h-k">Weight</div>
          <div className="h-n">{n(day.weight, 1)}</div>
          <div className="h-l">
            {day.weight !== null && before?.weight != null
              ? `${formatDelta(day.weight - before.weight)} ${weightUnit} on the day before`
              : weightUnit}
          </div>
        </div>
        <div>
          <div className="h-k">Calories</div>
          <div className="h-n">{n(day.cals)}</div>
          <div className={`h-l ${ink(day.lights.cals)}`}>
            {day.cals !== null && day.calTarget !== null
              ? `${formatDelta(day.cals - day.calTarget, 0)} vs the ${n(day.calTarget)} target`
              : 'no target'}
          </div>
        </div>
        <div>
          <div className="h-k">Protein</div>
          <div className="h-n">{n(day.protein)} g</div>
          <div className={`h-l ${ink(day.lights.protein)}`}>
            {day.proteinGoal !== null ? `goal ${day.proteinGoal} g · ` : ''}
            {n(day.carbs)} g carbs · {n(day.fat)} g fat
          </div>
        </div>
        <div>
          <div className="h-k">Steps</div>
          <div className="h-n">{n(day.steps)}</div>
          <div className={`h-l ${ink(day.lights.steps)}`}>
            {day.stepsGoal !== null ? `goal ${n(day.stepsGoal)}` : ''}
            {day.stepsMinimum !== null ? ` · floor ${n(day.stepsMinimum)}` : ''}
          </div>
        </div>
        <div>
          <div className="h-k">Training</div>
          <div className="h-n is-small">{day.workout ? day.workout.replace(/^Lee - /, '') : 'No lift'}</div>
          <div className="h-l">
            {day.cardio ? `${day.cardioLabel ?? 'Cardio'}, ${day.cardioMinutes ?? 30} min` : 'no cardio'}
          </div>
        </div>
      </div>
    </div>
  );
}
