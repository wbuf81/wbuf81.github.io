'use client';

import Link from 'next/link';
import type { CSSProperties } from 'react';
import type { IndexGame } from '@/lib/snes/library';
import { formatRelease } from '@/lib/snes/display';
import { gamePath } from '@/lib/snes/routes';
import { Top8Star } from '../Top8Star';

// Drawn spines standing on planks: a black SUPER NINTENDO band, then a vertical slice of the game's own cover
// behind its title. One shelf per year when ordered by date; one long shelf for any other order.
export default function Shelf({ games, byYear }: { games: IndexGame[]; byYear: boolean }) {
  const groups = byYear
    ? [...new Set(games.map((g) => g.releasedUS.slice(0, 4)))].map((y) => ({ year: y, games: games.filter((g) => g.releasedUS.startsWith(y)) }))
    : [{ year: '', games }];
  return (
    <div>
      {groups.map((group) => (
        <section key={group.year || 'all'} className="s-shelf-year" id={group.year ? `y-${group.year}` : undefined}>
          {group.year ? <h2>{group.year}</h2> : null}
          <div className="s-shelf">
            {group.games.map((g) => (
              // The wrapper holds the hover (the spine lifts and its tip shows while the pointer is on the ★ too) and
              // the ★: in the tip on desktop, on the spine's top band on touch screens. Never inside the link.
              <span key={g.slug} className="s-spine-w">
                <Link
                  href={gamePath(g.slug)}
                  prefetch={false}
                  className="s-spine"
                  aria-label={`${g.title}, ${formatRelease(g.releasedUS, g.datePrecision)}`}
                  style={g.thumb ? ({ '--art': `url(${g.thumb})` } as CSSProperties) : undefined}
                >
                  <span className="s-band"><b>SUPER NINTENDO</b></span>
                  <span className="s-spine-t">{g.title}</span>
                  <span className="s-seal" />
                  <span className="s-spine-tip" aria-hidden="true">
                    {g.thumb ? <img src={g.thumb} alt="" width={96} height={67} loading="lazy" /> : null}
                    {g.title}
                  </span>
                </Link>
                <Top8Star slug={g.slug} title={g.title} variant="tile" />
              </span>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
