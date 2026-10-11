import { groupByMonth, type IndexGame } from '@/lib/snes/library';
import { gameCount, MONTHS, SHORT_MONTHS } from '@/lib/snes/display';
import { GameTile } from '../GameTile';

// Month rows down the page: the month on the left rail, its games wrapping to the right. Each year's first
// row carries an anchor (#y-1994) for the year tabs; each row its own (#m-1994-04) for the heatmap.
export default function Timeline({ games, names }: { games: IndexGame[]; names: Record<string, string> }) {
  let lastYear = 0;
  return (
    <div className="s-timeline">
      {groupByMonth(games).map((group) => {
        const yearStart = group.year !== lastYear;
        lastYear = group.year;
        const launch = group.key === '1991-08' && group.games.some((g) => g.launchTitle);
        return (
          <section key={group.key} className="s-month" id={`m-${group.key}`} aria-label={group.month ? `${MONTHS[group.month - 1]} ${group.year}` : `Sometime in ${group.year}`}>
            {yearStart ? <span className="s-anchor" id={`y-${group.year}`} /> : null}
            <div className="s-when">
              <div className="s-m">{group.month ? SHORT_MONTHS[group.month - 1] : '—'}</div>
              <div className="s-y">{group.year}</div>
              <div className="s-n">{gameCount(group.games.length)}</div>
            </div>
            <div>
              <p className="s-lbl">{launch ? 'Launch day · Aug 23' : group.month ? MONTHS[group.month - 1] : `Sometime in ${group.year}`}</p>
              <div className="s-row">
                {group.games.map((g) => (
                  <GameTile key={g.slug} game={g} publisherName={names[g.publisher] ?? ''} genre={g.genres[0]} />
                ))}
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
