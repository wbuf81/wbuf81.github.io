'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { flushSync } from 'react-dom';
import {
  AXES, GENRE_FAMILIES, genreFamily, labelPoints, scatterPoints, scoreDomain, xForDate, yForScore, yTicks,
  type GenreFamily, type IndexGame, type ScoreAxis,
} from '@/lib/snes/library';
import { gamePath } from '@/lib/snes/routes';
import { canPreview, claimClip, isTouch, playClip } from '../clip';
import { useSound } from '../sound';
import ScatterCard, { type CardMode } from './ScatterCard';

const AXIS_LABEL: Record<ScoreAxis, string> = { egm: 'EGM average', np: 'Nintendo Power', aggregate: 'Aggregate', users: 'Player score' };
const AXIS_BUTTON: Record<ScoreAxis, string> = { egm: 'EGM', np: 'Nintendo Power', aggregate: 'Aggregate', users: 'Player score' };
const YEAR_TICKS = [1992, 1993, 1994, 1995, 1996, 1997, 1998];
const FAMILY_LABEL = Object.fromEntries(GENRE_FAMILIES.map((f) => [f.key, f.label])) as Record<GenreFamily, string>;
const hasHover = () => typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches;

type Card = { slug: string; mode: CardMode; clip: boolean };

// Every game with the chosen score as a dot, coloured by genre family: release date across, score up, the y axis
// spanning just the scores shown. Hall of Fame (9+) and Bargain Bin (under 5) bands sit behind the dots, and the
// best-scoring games that fit get a label. Hovering or focusing a dot opens a card with its clip (on phones the first
// tap does, the second opens the game); the genre key spotlights a family. A hidden table carries the same data.
export default function Scatter({ games, axis, onAxis, names = {} }: {
  games: IndexGame[]; axis: ScoreAxis; onAxis: (a: ScoreAxis) => void; names?: Record<string, string>;
}) {
  const [spot, setSpot] = useState<GenreFamily | null>(null);
  const [card, setCard] = useState<Card | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const byPointer = useRef(false);
  const video = useRef<HTMLVideoElement>(null);
  const sound = useSound();

  // A tapped card closes when the visitor taps anywhere but a dot or the card.
  useEffect(() => {
    if (card?.mode !== 'tap') return;
    const away = (e: PointerEvent) => {
      if (!(e.target as Element).closest?.('.s-dot, .s-card')) setCard(null);
    };
    document.addEventListener('pointerdown', away, true);
    return () => document.removeEventListener('pointerdown', away, true);
  }, [card?.mode]);
  useEffect(() => () => clearTimeout(timer.current), []);

  const points = scatterPoints(games, axis);
  const domain = scoreDomain(points);
  const y = (v: number) => yForScore(v, domain);
  const labels = new Map(labelPoints(points, 8, domain).map((l) => [l.slug, l.side]));
  const bySlug = new Map(games.map((g) => [g.slug, g]));
  const family = new Map(points.map((p) => [p.slug, genreFamily(bySlug.get(p.slug)?.genres ?? [])]));
  const key = GENRE_FAMILIES.map((f) => ({ ...f, count: points.filter((p) => family.get(p.slug) === f.key).length })).filter((f) => f.count);
  const active = spot && key.some((f) => f.key === spot) ? spot : null; // a family the filters emptied spotlights nothing
  const available = (a: ScoreAxis) => scatterPoints(games, a).length > 0;

  // One card at a time, and one clip across the page: opening a card stops any other clip, and losing the window closes it.
  const open = (slug: string, mode: CardMode) => {
    claimClip(() => setCard(null));
    setCard({ slug, mode, clip: Boolean(bySlug.get(slug)?.video) && (mode === 'tap' || canPreview()) });
  };
  const enter = (slug: string) => {
    if (!hasHover()) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => open(slug, 'hover'), 300);
  };
  const leave = () => {
    clearTimeout(timer.current);
    setCard((c) => (c?.mode === 'hover' ? null : c));
  };
  // Focus from a click or tap is not keyboard focus: those have their own handling.
  const focus = (slug: string) => {
    if (byPointer.current) byPointer.current = false;
    else open(slug, 'focus');
  };
  // As on game tiles: iOS plays with sound only when play() runs inside the tap, so the card renders synchronously and
  // starts here. A desktop click, keyboard activation and a second tap on the same dot navigate as usual.
  const tap = (e: MouseEvent, slug: string) => {
    byPointer.current = false;
    if (e.detail === 0 || !isTouch() || (card?.slug === slug && card.mode === 'tap')) return;
    e.preventDefault();
    flushSync(() => open(slug, 'tap'));
    if (video.current) playClip(video.current, sound.on || sound.waiting);
  };

  const shown = card ? points.find((p) => p.slug === card.slug) : undefined;
  const shownGame = shown && bySlug.get(shown.slug);
  return (
    <div className="s-scatter-wrap">
      <div className="s-axis-pick" role="group" aria-label="Score">
        {AXES.map((a) => (
          <button key={a} type="button" className="s-toggle" aria-pressed={axis === a} disabled={!available(a) && axis !== a} onClick={() => onAxis(a)}>
            {AXIS_BUTTON[a]}
          </button>
        ))}
      </div>
      {points.length === 0 ? (
        <p className="s-none">No games with {axis === 'users' ? 'player' : AXIS_BUTTON[axis]} scores match those filters.</p>
      ) : (
        <>
          <div className="s-key" role="group" aria-label="Genre">
            {key.map((f) => (
              <button key={f.key} type="button" className={`s-key-btn f-${f.key}`} aria-pressed={active === f.key} onClick={() => setSpot(active === f.key ? null : f.key)}>
                <i aria-hidden="true" />{f.label} · {f.count}
              </button>
            ))}
          </div>
          <div className="s-scatter">
            {domain[1] >= 9 ? (
              <div className="s-zone s-zone-hof" style={{ top: 0, bottom: `${y(9)}%` }}><span>Hall of Fame · {points.filter((p) => p.y >= 9).length}</span></div>
            ) : null}
            {domain[0] < 5 ? (
              <div className="s-zone s-zone-bin" style={{ bottom: 0, height: `${y(5)}%` }}><span>Bargain Bin · {points.filter((p) => p.y < 5).length}</span></div>
            ) : null}
            {points.map((p) => {
              const fam = family.get(p.slug)!;
              const faded = active !== null && fam !== active;
              const side = faded ? undefined : labels.get(p.slug);
              return (
                <Link
                  key={p.slug}
                  href={gamePath(p.slug)}
                  prefetch={false}
                  className={`s-dot f-${fam}${side ? ' is-star' : ''}${faded ? ' is-faded' : ''}${card?.slug === p.slug ? ' is-open' : ''}`}
                  style={{ left: `${p.x}%`, bottom: `${y(p.y)}%` }}
                  aria-label={`${p.title}, ${AXIS_LABEL[axis]} ${p.y}`}
                  onMouseEnter={() => enter(p.slug)}
                  onMouseLeave={leave}
                  onPointerDown={() => { byPointer.current = true; }}
                  onFocus={() => focus(p.slug)}
                  onBlur={() => setCard((c) => (c?.mode === 'focus' && c.slug === p.slug ? null : c))}
                  onClick={(e) => tap(e, p.slug)}
                >
                  {side ? <span className={`s-dot-label${side === 'left' ? ' is-left' : ''}`}>{p.title}</span> : null}
                </Link>
              );
            })}
            {YEAR_TICKS.map((yr) => <span key={yr} className="s-tick-x" style={{ left: `${xForDate(`${yr}-01-01`)}%` }}>{yr}</span>)}
            {yTicks(domain).map((v) => <span key={v} className="s-tick-y" style={{ bottom: `${y(v)}%` }}>{v}</span>)}
            {card && shown && shownGame ? (
              <ScatterCard
                key={card.slug}
                game={shownGame}
                x={shown.x}
                y={y(shown.y)}
                publisherName={names[shownGame.publisher] ?? ''}
                axisLabel={AXIS_LABEL[axis]}
                score={shown.y}
                mode={card.mode}
                clip={card.clip}
                videoRef={video}
              />
            ) : null}
          </div>
          <table className="vh">
            <caption>{AXIS_LABEL[axis]} by release date</caption>
            <thead><tr><th>Game</th><th>Score</th><th>Genre</th></tr></thead>
            <tbody>{points.map((p) => <tr key={p.slug}><td>{p.title}</td><td>{p.y}</td><td>{FAMILY_LABEL[family.get(p.slug)!]}</td></tr>)}</tbody>
          </table>
        </>
      )}
    </div>
  );
}
