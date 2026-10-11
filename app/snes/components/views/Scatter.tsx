'use client';

import Link from 'next/link';
import { AXES, labelPoints, scatterPoints, xForDate, type IndexGame, type ScoreAxis } from '@/lib/snes/library';
import { gamePath } from '@/lib/snes/routes';

const AXIS_LABEL: Record<ScoreAxis, string> = { egm: 'EGM average', np: 'Nintendo Power', aggregate: 'Aggregate', users: 'Player score' };
const AXIS_BUTTON: Record<ScoreAxis, string> = { egm: 'EGM', np: 'Nintendo Power', aggregate: 'Aggregate', users: 'Player score' };
const YEAR_TICKS = [1992, 1993, 1994, 1995, 1996, 1997, 1998];

// Every game with the chosen score as a dot: release date across, score (0–10) up. The best-scoring games that
// fit get a label; hovering or focusing any dot names it, and a hidden table carries the same data.
export default function Scatter({ games, axis, onAxis }: { games: IndexGame[]; axis: ScoreAxis; onAxis: (a: ScoreAxis) => void }) {
  const points = scatterPoints(games, axis);
  const labelled = new Set(labelPoints(points));
  const available = (a: ScoreAxis) => scatterPoints(games, a).length > 0;
  return (
    <div className="s-scatter-wrap">
      <div className="s-axis-pick">
        {AXES.map((a) => (
          <button key={a} type="button" className="s-toggle" aria-pressed={axis === a} disabled={!available(a) && axis !== a} onClick={() => onAxis(a)}>
            {AXIS_BUTTON[a]}
          </button>
        ))}
      </div>
      {points.length === 0 ? (
        <p className="s-none">No games with {AXIS_BUTTON[axis]} scores match those filters.</p>
      ) : (
        <>
          <div className="s-scatter" aria-hidden="false">
            {points.map((p) => (
              <Link
                key={p.slug}
                href={gamePath(p.slug)}
                className={`s-dot${labelled.has(p.slug) ? ' is-star' : ''}`}
                style={{ left: `${p.x}%`, bottom: `${p.y * 10}%` }}
                title={`${p.title} — ${p.y}`}
                aria-label={`${p.title}, ${AXIS_LABEL[axis]} ${p.y}`}
              >
                {labelled.has(p.slug) ? <span className="s-dot-label">{p.title}</span> : null}
              </Link>
            ))}
            {YEAR_TICKS.map((y) => <span key={y} className="s-tick-x" style={{ left: `${xForDate(`${y}-01-01`)}%` }}>{y}</span>)}
            {[0, 5, 10].map((v) => <span key={v} className="s-tick-y" style={{ bottom: `${v * 10}%` }}>{v}</span>)}
          </div>
          <table className="vh">
            <caption>{AXIS_LABEL[axis]} by release date</caption>
            <thead><tr><th>Game</th><th>Score</th></tr></thead>
            <tbody>{points.map((p) => <tr key={p.slug}><td>{p.title}</td><td>{p.y}</td></tr>)}</tbody>
          </table>
        </>
      )}
    </div>
  );
}
