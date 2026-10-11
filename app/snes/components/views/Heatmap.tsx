'use client';

import { FIRST_YEAR, LAST_YEAR, heatmapCounts, type IndexGame } from '@/lib/snes/library';
import { gameCount, MONTHS } from '@/lib/snes/display';

// Years down, months across; darker purple = more releases. Clicking a month opens the timeline there.
export default function Heatmap({ games, onPick }: { games: IndexGame[]; onPick: (monthKey: string) => void }) {
  const cells = heatmapCounts(games);
  const years = Array.from({ length: LAST_YEAR - FIRST_YEAR + 1 }, (_, i) => FIRST_YEAR + i);
  return (
    <div>
      {games.length === 0 ? <p className="s-none">No games match those filters.</p> : null}
      <div className="s-heat" role="group" aria-label="Games released per month">
        <div className="s-heat-row" aria-hidden="true">
          <span />
          {MONTHS.map((m) => <em key={m}>{m[0]}</em>)}
        </div>
        {years.map((year) => (
          <div className="s-heat-row" key={year}>
            <span>{year}</span>
            {cells.filter((c) => c.year === year).map((c) => (
              <button
                key={c.key}
                type="button"
                className={`s-heat-cell l${c.level}${c.pre ? ' is-pre' : ''}`}
                disabled={c.pre || c.count === 0}
                aria-label={`${MONTHS[c.month - 1]} ${c.year}: ${c.pre ? 'before launch' : gameCount(c.count)}`}
                onClick={() => onPick(c.key)}
              >
                {c.count || ''}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
