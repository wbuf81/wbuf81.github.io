'use client';

import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_FILTERS, FIRST_YEAR, LAST_YEAR, filterGames, isFiltered, parseQuery, queryContext, sortGames, toQuery,
  type Facets, type Filters, type IndexGame,
} from '@/lib/snes/library';
import FilterBar from './FilterBar';
import { SoundProvider } from './sound';
import Timeline from './views/Timeline';

const Heatmap = lazy(() => import('./views/Heatmap'));
const CoverWall = lazy(() => import('./views/CoverWall'));
const Shelf = lazy(() => import('./views/Shelf'));
const Scatter = lazy(() => import('./views/Scatter'));
const YEARS = Array.from({ length: LAST_YEAR - FIRST_YEAR + 1 }, (_, i) => FIRST_YEAR + i);

// While a lazy view loads, React keeps the previous view's DOM mounted but display:none; its anchors must not count.
const hiddenBySuspense = (el: HTMLElement) => {
  for (let n: HTMLElement | null = el; n; n = n.parentElement) if (n.style.display === 'none') return true;
  return false;
};

export function Empty({ onClear }: { onClear: () => void }) {
  return (
    <div className="s-empty">
      <p>No carts match those filters</p>
      <button type="button" className="s-clear" onClick={onClear}>Clear filters</button>
    </div>
  );
}

// The interactive layer of /videogames/snes-history. Rendered on the server with the default filters (the full timeline), then
// it reads the URL, applies the filters and keeps the URL in step, so any view can be shared as a link.
export default function Library({ games, names, facets }: { games: IndexGame[]; names: Record<string, string>; facets: Facets }) {
  const ctx = useMemo(() => queryContext(facets), [facets]);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [ready, setReady] = useState(false);
  const [scrollTo, setScrollTo] = useState<string | null>(null);

  useEffect(() => {
    setFilters(parseQuery(window.location.search, ctx));
    setReady(true);
  }, [ctx]);
  useEffect(() => {
    if (ready) window.history.replaceState(null, '', `${window.location.pathname}${toQuery(filters)}${window.location.hash}`);
  }, [filters, ready]);
  useEffect(() => {
    if (!scrollTo) return;
    // Lazy views may not be mounted (or visible) yet: keep the request pending and retry for ~30 frames.
    let frames = 0;
    let raf = 0;
    const tryScroll = () => {
      const el = document.getElementById(scrollTo);
      if (el && !hiddenBySuspense(el)) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setScrollTo(null);
      } else if (++frames < 30) raf = requestAnimationFrame(tryScroll);
      else setScrollTo(null);
    };
    tryScroll();
    return () => cancelAnimationFrame(raf);
  }, [scrollTo, filters.view]);

  const update = (patch: Partial<Filters>) => setFilters((f) => ({ ...f, ...patch }));
  const clear = () => setFilters((f) => ({ ...DEFAULT_FILTERS, view: f.view, y: f.y, sort: f.sort }));
  const matched = useMemo(() => filterGames(games, filters), [games, filters]);
  const matchedSet = useMemo(() => new Set(matched.map((g) => g.slug)), [matched]);
  const years = useMemo(() => new Set(matched.map((g) => Number(g.releasedUS.slice(0, 4)))), [matched]);
  const hasMultiplayer = useMemo(() => games.some((g) => g.coop || g.versus), [games]);
  const { view } = filters;
  const showYears = view === 'timeline' || view === 'wall' || (view === 'shelf' && filters.sort === 'date');

  return (
    <SoundProvider>
      <FilterBar filters={filters} facets={facets} onChange={update} onClear={clear} hasMultiplayer={hasMultiplayer} />
      {ready && isFiltered(filters) ? (
        <p className="s-count">
          Showing {matched.length} of {games.length}
          <button type="button" className="s-clear" onClick={clear}>Clear filters</button>
        </p>
      ) : null}
      {showYears ? (
        <nav className="s-years" aria-label="Jump to year">
          {YEARS.map((y) => (
            <button key={y} type="button" disabled={!years.has(y)} onClick={() => setScrollTo(`y-${y}`)}>{y}</button>
          ))}
        </nav>
      ) : null}
      <div role="tabpanel">
        <Suspense fallback={<p className="s-none">Loading…</p>}>
          {view === 'timeline' ? (matched.length ? <Timeline games={matched} names={names} /> : <Empty onClear={clear} />) : null}
          {view === 'heatmap' ? (
            <Heatmap games={matched} onPick={(key) => { update({ view: 'timeline' }); setScrollTo(`m-${key}`); }} />
          ) : null}
          {view === 'wall' ? (
            <>
              {matched.length ? null : <Empty onClear={clear} />}
              <CoverWall games={sortGames(games, filters.sort)} matched={matchedSet} />
            </>
          ) : null}
          {view === 'shelf' ? (matched.length ? <Shelf games={sortGames(matched, filters.sort)} byYear={filters.sort === 'date'} /> : <Empty onClear={clear} />) : null}
          {view === 'scatter' ? <Scatter games={matched} axis={filters.y} onAxis={(y) => update({ y })} /> : null}
        </Suspense>
      </div>
    </SoundProvider>
  );
}
