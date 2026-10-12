import type { Week } from '@/lib/snes/types';
import { MONTHS, SHORT_MONTHS } from '@/lib/snes/display';

// The week's news as a clipping from "The Omaha World-Pixel" (a riff on the paper Wes read in Omaha): lead story as
// the headline, the rest in a side column. Falls back to the latest story before the week, then to a quiet week.
const day = (iso: string) => { const [, m, d] = iso.split('-').map(Number); return `${SHORT_MONTHS[m - 1]}. ${d}`; };
const long = (iso: string) => { const [y, m, d] = iso.split('-').map(Number); return `${MONTHS[m - 1]} ${d}, ${y}`; };

/** `headline` is the lead's heading level: h2 on SNES pages (under the page's h1), h4 where the paper sits under an h3
 * (the specimen on /design), so a page's heading order never skips or jumps back. */
export default function Paper({ week, weekNumber, compact = false, headline: Headline = 'h2' }: { week: Week; weekNumber: number; compact?: boolean; headline?: 'h2' | 'h4' }) {
  const items = week.news.length ? week.news : week.near ? [week.near] : [{ date: week.start, text: 'A quiet week in the news' }];
  const [lead, ...rest] = items;
  const showSide = rest.length > 0 && !compact;
  const vol = Number(week.start.slice(0, 4)) - 1990;
  return (
    <article className={`s-tm-paper${compact ? ' is-compact' : ''}`} aria-label={`News, week of ${long(week.start)}`}>
      <div className="s-tm-ptop"><span>Vol. {vol} · No. {weekNumber}</span><span>Omaha, Nebraska · Late edition</span><span>25¢</span></div>
      <div className="s-tm-pmast">The Omaha World-Pixel</div>
      <div className="s-tm-pdate">Week of {long(week.start)}</div>
      <div className={`s-tm-pbody${showSide ? '' : ' is-solo'}`}>
        <div>
          <div className="s-tm-pkick">{day(lead.date)}</div>
          <Headline>{lead.text}</Headline>
        </div>
        {showSide ? <div className="s-tm-pmore">{rest.map((r) => <p key={r.date + r.text}><b>{day(r.date)}</b> {r.text}</p>)}</div> : null}
      </div>
    </article>
  );
}
