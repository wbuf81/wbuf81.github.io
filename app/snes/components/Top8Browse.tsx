'use client';

import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Cover } from './Cover';
import { FIRST_YEAR, GENRE_FAMILIES, LAST_YEAR, genreFamily, type GenreFamily } from '@/lib/snes/library';
import { compareReleased, norm, type Top8Game } from '@/lib/snes/top8';

// "Browse all games" on the Top 8 page: year, genre and sort controls over a cover grid that also follows the
// page's search text. Tapping a cover toggles it in the Top 8. Covers render 60 at a time as the visitor scrolls.

export const PAGE = 60;
// The count's spoken announcement waits this long after the last change, so typing isn't read out letter by letter.
const ANNOUNCE_AFTER = 600;
const YEARS = Array.from({ length: LAST_YEAR - FIRST_YEAR + 1 }, (_, i) => String(FIRST_YEAR + i));
type Sort = 'top' | 'az' | 'date';
const SORTS: { key: Sort; label: string }[] = [
  { key: 'top', label: 'Top rated' },
  { key: 'az', label: 'A–Z' },
  { key: 'date', label: 'Release date' },
];
const thumb = (slug: string) => `/snes/thumb/${slug}.jpg`;
const byTitle = (a: Top8Game, b: Top8Game) => a.title.localeCompare(b.title, 'en', { sensitivity: 'base' });

type Props = {
  games: Top8Game[];
  /** The page's search text. */
  query: string;
  picked: (string | null)[];
  /** The game waiting in replace mode, if any (its cover is marked). */
  pending: string | null;
  onToggle: (slug: string) => void;
};

type Row = { g: Top8Game; n: string; fam: GenreFamily; i: number };

const Tile = memo(function Tile({ g, picked, pending, onToggle }: { g: Top8Game; picked: boolean; pending: boolean; onToggle: (slug: string) => void }) {
  return (
    <li>
      <button type="button" className={`s-t8-tile${picked ? ' is-picked' : ''}${pending ? ' is-pending' : ''}`} aria-pressed={picked} onClick={() => onToggle(g.slug)}>
        <span className="s-t8-tc">
          <Cover src={thumb(g.slug)} title={g.title} width={96} height={67} noArt={g.noArt} />
          {picked ? <span className="s-t8-badge" aria-hidden="true">★</span> : null}
        </span>
        <span className="s-t8-tt">{g.title}</span>
      </button>
    </li>
  );
});

export default function Top8Browse({ games, query, picked, pending, onToggle }: Props) {
  const [year, setYear] = useState<string | null>(null);
  const [family, setFamily] = useState<GenreFamily | null>(null);
  const [sort, setSort] = useState<Sort>('top');
  const [shown, setShown] = useState(PAGE);

  const rows = useMemo<Row[]>(() => games.map((g, i) => ({ g, n: norm(g.title), fam: genreFamily(g.genres), i })), [games]);
  const sorted = useMemo(() => {
    const out = rows.slice();
    if (sort === 'date') out.sort((a, b) => compareReleased(a.g.released, b.g.released) || a.i - b.i);
    else if (sort === 'az') out.sort((a, b) => byTitle(a.g, b.g) || a.i - b.i);
    else out.sort((a, b) => (b.g.score ?? -1) - (a.g.score ?? -1) || byTitle(a.g, b.g) || a.i - b.i);
    return out;
  }, [rows, sort]);
  const words = useMemo(() => norm(query).split(' ').filter(Boolean), [query]);
  const matches = useMemo(() => sorted.filter((r) =>
    (!year || r.g.year === year) && (!family || r.fam === family) && words.every((w) => r.n.includes(w))), [sorted, year, family, words]);

  // Any change to what matches starts again from the first page. Reset during render, so the old count never
  // renders against the new matches.
  const filterKey = `${year}|${family}|${sort}|${words.join(' ')}`;
  const [lastKey, setLastKey] = useState(filterKey);
  if (lastKey !== filterKey) {
    setLastKey(filterKey);
    setShown(PAGE);
  }

  const pickedSet = useMemo(() => new Set(picked.filter((s): s is string => !!s)), [picked]);
  const more = matches.length > shown;

  const countText = `Showing ${matches.length} of ${games.length}`;
  const [spoken, setSpoken] = useState(countText);
  useEffect(() => {
    const t = setTimeout(() => setSpoken(countText), ANNOUNCE_AFTER);
    return () => clearTimeout(t);
  }, [countText]);

  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinel.current;
    if (!more || !el || typeof window.IntersectionObserver !== 'function') return;
    const io = new window.IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) setShown((n) => n + PAGE);
    }, { rootMargin: '400px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, [more, shown]);

  return (
    <section className="s-t8-box" aria-labelledby="t8-browse">
      <div className="s-t8-bh">
        <h2 id="t8-browse">Browse all games</h2>
        <span>{countText}</span>
      </div>
      <span className="vh" aria-live="polite">{spoken}</span>
      <div className="s-t8-bb">
        <div className="s-t8-tabs" role="group" aria-label="Year">
          <button type="button" className="s-t8-chip" aria-pressed={year === null} onClick={() => setYear(null)}>All</button>
          {YEARS.map((y) => (
            <button key={y} type="button" className="s-t8-chip" aria-pressed={year === y} aria-label={y} onClick={() => setYear(y)}>{`'${y.slice(2)}`}</button>
          ))}
        </div>
        <div className="s-t8-tabs" role="group" aria-label="Genre">
          <button type="button" className="s-t8-chip" aria-pressed={family === null} onClick={() => setFamily(null)}>All</button>
          {GENRE_FAMILIES.map(({ key, label }) => (
            <button key={key} type="button" className="s-t8-chip" aria-pressed={family === key} onClick={() => setFamily(key)}>{label}</button>
          ))}
        </div>
        <div className="s-t8-sort">
          <label className="s-t8-label" htmlFor="t8-sort">Sort</label>
          <select id="t8-sort" className="s-t8-input" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
            {SORTS.map(({ key, label }) => <option key={key} value={key}>{label}</option>)}
          </select>
        </div>
        {matches.length ? (
          <ul className="s-t8-grid">
            {matches.slice(0, shown).map(({ g }) => <Tile key={g.slug} g={g} picked={pickedSet.has(g.slug)} pending={pending === g.slug} onToggle={onToggle} />)}
          </ul>
        ) : <p className="s-t8-note">No games match.</p>}
        {more ? (
          <div className="s-t8-more" ref={sentinel}>
            <button type="button" className="s-t8-btn is-alt" onClick={() => setShown((n) => n + PAGE)}>Show more</button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
