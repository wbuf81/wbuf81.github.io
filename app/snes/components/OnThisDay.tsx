'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { onThisDay, onThisDayYears, type SlimWeek } from '@/lib/snes/onThisDay';
import { timeMachinePath } from '@/lib/snes/routes';

const localIso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// The strip above the hub's cards. The server render is a same-height placeholder: today's date only exists in
// the visitor's browser, so nothing date-dependent is baked into the static page.
export default function OnThisDay({ weeks }: { weeks: SlimWeek[] }) {
  const starts = useMemo(() => weeks.map((w) => ({ start: w[0] })), [weeks]);
  const [pick, setPick] = useState<{ today: string; years: number[]; at: number } | null>(null);

  useEffect(() => {
    const today = localIso(new Date());
    const years = onThisDayYears(starts, today);
    if (years.length) setPick({ today, years, at: Math.floor(Math.random() * years.length) });
  }, [weeks, starts]);

  const step = (n: number) => pick && setPick({ ...pick, at: (pick.at + n + pick.years.length) % pick.years.length });
  const year = pick ? pick.years[pick.at] : null;
  const row = pick && year ? weeks[onThisDay(starts, pick.today, year)] : null;
  const [start, song, by, film, lead, games] = row ?? [];

  return (
    <section className="s-otd" aria-label="On this day in SNES history">
      <div className="s-otd-h">On this day in SNES history</div>
      {pick && row && year ? (
        <div className="s-otd-body">
          <div className="s-otd-year">
            <button type="button" aria-label="Earlier year" onClick={() => step(-1)}>◀</button>
            <span className="s-otd-led">This week in {year}</span>
            <button type="button" aria-label="Later year" onClick={() => step(1)}>▶</button>
          </div>
          <ul className="s-otd-list">
            <li><b>#1 song</b> {song}{by ? ` — ${by}` : ''}</li>
            <li><b>#1 movie</b> {film}</li>
            {lead && <li><b>In the news</b> {lead}</li>}
            <li><b>Games</b> {games} new SNES {games === 1 ? 'game' : 'games'}</li>
          </ul>
          <Link className="s-otd-go" href={timeMachinePath(start as string)}>Open this week in the Time Machine →</Link>
        </div>
      ) : (
        <div className="s-otd-body s-otd-wait" aria-hidden="true" />
      )}
    </section>
  );
}
