'use client';

import Link from 'next/link';
import type { IndexGame } from '@/lib/snes/library';
import { formatRelease } from '@/lib/snes/display';
import { gamePath } from '@/lib/snes/routes';
import { Top8Star } from '../Top8Star';

// Every cover at once on a dark screen, in the order given. Filtered-out games stay in place, dimmed, so you
// see where the matches sit in history. A year marker opens each year (only when the order is by date).
export default function CoverWall({ games, matched }: { games: IndexGame[]; matched: Set<string> }) {
  const byDate = games.every((g, i) => i === 0 || games[i - 1].releasedUS.slice(0, 4) <= g.releasedUS.slice(0, 4));
  let lastYear = '';
  return (
    <div className="s-wall">
      {games.flatMap((g) => {
        const year = g.releasedUS.slice(0, 4);
        const marker = byDate && year !== lastYear ? (
          <span key={`y-${year}`} id={`y-${year}`} className="s-wall-year">{year}</span>
        ) : null;
        lastYear = year;
        // The cell is the grid item and the ★'s positioned parent; the ★ is the link's sibling, never inside it.
        const item = (
          <span key={g.slug} className="s-wall-cell">
            <Link
              href={gamePath(g.slug)}
              prefetch={false}
              className={`s-wall-item${matched.has(g.slug) ? '' : ' is-dim'}`}
              aria-label={`${g.title}, ${formatRelease(g.releasedUS, g.datePrecision)}`}
              title={g.title}
            >
              {g.thumb ? <img src={g.thumb} alt="" width={96} height={67} loading="lazy" decoding="async" /> : <span className="s-noart">{g.title}</span>}
            </Link>
            <Top8Star slug={g.slug} title={g.title} variant="tile" />
          </span>
        );
        return marker ? [marker, item] : [item];
      })}
    </div>
  );
}
