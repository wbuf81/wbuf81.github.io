import Link from 'next/link';
import type { Game } from '@/lib/snes/types';
import type { IndexGame } from '@/lib/snes/library';
import { MONTHS } from '@/lib/snes/display';
import { SNES_BASE, gamePath } from '@/lib/snes/routes';
import Booklet from './Booklet';
import MediaFrame from './MediaFrame';
import { GameTile } from './GameTile';

const STRIP = 8;

export default function GameView({ game, names, prev, next, sameMonth, seriesGames, similarGames }: {
  game: Game; names: Record<string, string>; prev: IndexGame | null; next: IndexGame | null; sameMonth: IndexGame[];
  seriesGames: IndexGame[]; similarGames: IndexGame[];
}) {
  const [year, month] = game.releasedUS.split('-').map(Number);
  const monthName = month ? `${MONTHS[month - 1]} ${year}` : String(year);
  const monthKey = month ? game.releasedUS.slice(0, 7) : String(year);
  const step = (g: IndexGame | null, dir: 'prev' | 'next') =>
    g ? <Link href={gamePath(g.slug)}>{dir === 'prev' ? `◀ ${g.title}` : `${g.title} ▶`}</Link> : <span>{dir === 'prev' ? 'Start of the timeline' : 'End of the timeline'}</span>;

  const strip = (heading: string, games: IndexGame[]) => (
    <section className="s-also" aria-label={heading}>
      <div className="eyebrow">{heading}</div>
      <div className="s-row">
        {games.map((g) => <GameTile key={g.slug} game={g} publisherName={names[g.publisher] ?? ''} genre={g.genres[0]} />)}
      </div>
    </section>
  );

  return (
    <>
      <nav className="s-crumb" aria-label="Breadcrumb">
        <span>
          <Link href={SNES_BASE}>SNES</Link> / <Link href={`${SNES_BASE}#y-${year}`}>{year}</Link>
          {month ? <> / <Link href={`${SNES_BASE}#m-${monthKey}`}>{MONTHS[month - 1]}</Link></> : null}
        </span>
        <span>{step(prev, 'prev')} · {step(next, 'next')}</span>
      </nav>
      <div className="s-game">
        <div>
          <MediaFrame game={game} />
          <div className="s-wes">
            <b>Wes&apos;s take — coming soon</b>
            Played? Beaten? 100%? Rating, tier and a Pocket log line will live here.
          </div>
        </div>
        <Booklet game={game} names={names} />
      </div>
      {similarGames.length ? strip(`If you like ${game.title}, try…`, similarGames) : null}
      {game.series && seriesGames.length ? strip(`More in the ${game.series} series`, seriesGames) : null}
      {sameMonth.length ? (
        <section className="s-also" aria-label={`Also out in ${monthName}`}>
          <div className="eyebrow">
            Also out in {monthName}
            {sameMonth.length > STRIP ? <> · <Link href={`${SNES_BASE}#m-${monthKey}`}>{sameMonth.length - STRIP} more →</Link></> : null}
          </div>
          <div className="s-row">
            {sameMonth.slice(0, STRIP).map((g) => <GameTile key={g.slug} game={g} publisherName={names[g.publisher] ?? ''} genre={g.genres[0]} />)}
          </div>
        </section>
      ) : null}
      <div className="s-steps">{step(prev, 'prev')}{step(next, 'next')}</div>
    </>
  );
}
