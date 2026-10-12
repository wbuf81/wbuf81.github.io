import type { Week } from '@/lib/snes/types';
import { MONTHS, SHORT_MONTHS } from '@/lib/snes/display';

// The week's news as a clipping from "The Omaha World-Pixel" (a riff on the paper Wes read in Omaha): lead story as
// the headline, the rest in a side column. Falls back to the latest story before the week, then to a quiet week.
const day = (iso: string) => { const [, m, d] = iso.split('-').map(Number); return `${SHORT_MONTHS[m - 1]}. ${d}`; };
const long = (iso: string) => { const [y, m, d] = iso.split('-').map(Number); return `${MONTHS[m - 1]} ${d}, ${y}`; };

export default function Paper({ week, weekNumber, compact = false }: { week: Week; weekNumber: number; compact?: boolean }) {
  const items = week.news.length ? week.news : week.near ? [week.near] : [{ date: week.start, text: 'A quiet week in the news' }];
  const [lead, ...rest] = items;
  const vol = Number(week.start.slice(0, 4)) - 1990;
  return (
    <article className={`s-tm-paper${compact ? ' is-compact' : ''}`} aria-label={`News, week of ${long(week.start)}`}>
      <div className="s-tm-ptop"><span>Vol. {vol} · No. {weekNumber}</span><span>Omaha, Nebraska · Late edition</span><span>25¢</span></div>
      <div className="s-tm-pmast">The Omaha World-Pixel</div>
      <div className="s-tm-pdate">Week of {long(week.start)}</div>
      <div className={`s-tm-pbody${rest.length && !compact ? '' : ' is-solo'}`}>
        <div>
          <div className="s-tm-pkick">{day(lead.date)}</div>
          <h3>{lead.text}</h3>
        </div>
        {rest.length && !compact ? <div className="s-tm-pmore">{rest.map((r) => <p key={r.date + r.text}><b>{day(r.date)}</b> {r.text}</p>)}</div> : null}
      </div>
    </article>
  );
}
