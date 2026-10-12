import type { PopItem, Week } from '@/lib/snes/types';
import { toToday } from '@/lib/snes/money';
import { timeMachinePath } from '@/lib/snes/routes';
import Paper from './Paper';

// "Be Kind, Rewind": what was on the radio, in the record store, at the movies and in the paper the week a game came
// out, laid out as things on a 90s coffee table. Month-only games show their month rather than claiming a week.
const wiki = (article: string | null) => (article ? `https://en.wikipedia.org/wiki/${article.replace(/ /g, '_')}` : undefined);

function Obj({ kind, label, item, sub }: { kind: 'cass' | 'cd' | 'tix'; label: string; item: PopItem; sub: string | null }) {
  const body = (
    <>
      <span className="s-bkr-k">{label}</span>
      {item.art ? <img src={item.art} alt="" width={240} height={kind === 'tix' ? 360 : 240} loading="lazy" decoding="async" /> : null}
      <b>{item.title}</b>
      {sub ? <span>{sub}</span> : null}
    </>
  );
  const href = wiki(item.article);
  return href ? <a className={`s-bkr-obj is-${kind}`} href={href} target="_blank" rel="noopener noreferrer">{body}</a> : <div className={`s-bkr-obj is-${kind}`}>{body}</div>;
}

export default function BeKindRewind({ week, weekNumber, label, monthName, price }: {
  week: Week; weekNumber: number; label: 'week' | 'month'; monthName: string; price: { usd: number; year: number; what: 'game' | 'console' };
}) {
  const now = toToday(price.usd, price.year);
  return (
    <section className="s-bkr" aria-label="Be Kind, Rewind: what else was going on">
      <div className="s-bkr-tape">
        <span className="s-bkr-label">BE KIND, REWIND</span>
        <span className="s-bkr-sticker">{label === 'week' ? 'The week it came out' : monthName}</span>
      </div>
      <div className="s-bkr-objs">
        <Obj kind="cass" label="#1 song" item={week.song} sub={week.song.by} />
        <Obj kind="cd" label="#1 album" item={week.album} sub={week.album.by} />
        <Obj kind="tix" label="Admit one · #1 movie" item={week.film} sub={week.film.gross ? `${week.film.gross} weekend` : null} />
        <Paper week={week} weekNumber={weekNumber} compact />
      </div>
      <p className="s-bkr-price">
        💵 {price.what === 'game' ? `$${price.usd.toFixed(2)} in a ${price.year} catalog · about $${now} today` : `A Super NES was $${price.usd.toFixed(2)} at launch · about $${now} today`}
      </p>
      <a className="s-bkr-go" href={timeMachinePath(week.start)}>Open this week in the Time Machine →</a>
    </section>
  );
}
