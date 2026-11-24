'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { CATEGORIES, filterItems, type CategoryId, type Filter, type FilterItem, type HomeProject } from '@/lib/projects';
import ProjectTile from './ProjectTile';

/** The filter an address asks for: a category's id, `#projects` (All), or null for any other hash or none. */
export function filterFromHash(hash: string): Filter | null {
  const h = hash.replace(/^#/, '');
  if (h === 'projects') return 'all';
  return CATEGORIES.some((c) => c.id === h) ? (h as CategoryId) : null;
}

function reducedMotion(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// A page reached by Back or Forward: the browser puts the scroll back where it was, so arriving doesn't move it.
function returning(): boolean {
  if (typeof performance === 'undefined' || typeof performance.getEntriesByType !== 'function') return false;
  const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
  return nav?.type === 'back_forward';
}

function scrollToY(top: number, smooth: boolean) {
  if (typeof window.scrollTo !== 'function') return;
  window.scrollTo({ top: Math.max(0, top), behavior: smooth && !reducedMotion() ? 'smooth' : 'auto' });
}

// The space between the slim bar's bottom edge and the start of the list when a press brings the list up.
const GAP = 16;

/**
 * The homepage's chips (design system › the project filter): All and a chip per category, each with its emoji and its
 * count. One is pressed at a time (aria-pressed, filled in ink); arrow keys, Home and End move between them. `slim` is
 * the one-row copy in the bar that shows once the resting chips have gone up under the header: on a phone it slides
 * sideways, keeps the pressed chip in view and fades its right edge while there is more. `inert` takes a copy that
 * isn't showing out of the tab order and the accessibility tree. Without `onPress` (the /design sample) it is inert.
 */
export function FilterChips({
  items,
  pressed,
  onPress,
  slim = false,
  inert = false,
}: {
  items: FilterItem[];
  pressed: Filter;
  onPress?: (id: Filter) => void;
  slim?: boolean;
  inert?: boolean;
}) {
  const rowRef = useRef<HTMLDivElement>(null);

  // The slim row: keep the pressed chip in view without moving the page, and fade the edge while there is more.
  const fit = useCallback(() => {
    const row = rowRef.current;
    if (!slim || !row) return;
    row.classList.toggle('pf-more', row.scrollWidth - row.clientWidth - row.scrollLeft > 4);
  }, [slim]);
  useEffect(() => {
    const row = rowRef.current;
    if (!slim || !row) return;
    const b = row.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (b && row.scrollWidth > row.clientWidth) {
      const left = b.offsetLeft;
      const right = left + b.offsetWidth;
      if (left < row.scrollLeft || right > row.scrollLeft + row.clientWidth) {
        row.scrollLeft = Math.max(0, left - (row.clientWidth - b.offsetWidth) / 2);
      }
    }
    fit();
  }, [pressed, slim, inert, fit]);
  useEffect(() => {
    if (!slim) return;
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, [slim, fit]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const list = [...(rowRef.current?.querySelectorAll<HTMLButtonElement>('.pf-chip') ?? [])];
    const i = list.indexOf(document.activeElement as HTMLButtonElement);
    if (i < 0) return;
    const last = list.length - 1;
    const j = { ArrowRight: i === last ? 0 : i + 1, ArrowLeft: i === 0 ? last : i - 1, Home: 0, End: last }[e.key];
    if (j === undefined) return;
    e.preventDefault();
    list[j].focus();
  };

  return (
    <div
      className={slim ? 'pf-chips is-slim' : 'pf-chips'}
      role="group"
      aria-label="Explore projects"
      ref={rowRef}
      onKeyDown={onKeyDown}
      onScroll={slim ? fit : undefined}
      inert={inert}
    >
      {items.map((s) => {
        // The visible label stays in the name (for voice control); a short label also gets the full name.
        const name = s.name.includes(s.label) ? s.name : `${s.label}, ${s.name}`;
        return (
          <button
            key={s.id}
            type="button"
            className="pf-chip"
            data-id={s.id}
            aria-pressed={s.id === pressed}
            aria-label={`${name}, ${s.count} ${s.count === 1 ? 'project' : 'projects'}`}
            onClick={onPress ? () => onPress(s.id) : undefined}
          >
            {s.icon && (
              <span className="pf-i" aria-hidden="true">
                {s.icon}
              </span>
            )}
            <span className="pf-l">{s.label}</span>
            <span className="pf-n" aria-hidden="true">
              {s.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// The notes a category opens with, when it has one: the pals' and the games' (Wes's copy, from the old sections). The
// pals' note links to their write-up, /work.
const NOTES: Partial<Record<CategoryId, ReactNode>> = {
  work: (
    <>
      <div className="eyebrow">The pals</div>
      <p className="gnote">
        Agents that take the repetitive end of legal and compliance work — scanning, monitoring, reporting, chasing
        deadlines before they lapse. Each one named after a coworker&apos;s pet, driving engagement and making compliance a
        little more fun.
      </p>
      <p className="gnote">
        <a href="/work">How the pals work →</a>
      </p>
    </>
  ),
  games: (
    <p className="gnote">
      Private builds for friends, so there is nothing to download. Each one has a page on how it plays and how it was
      built.
    </p>
  ),
};

type Selection = { filter: Filter; n: number; scroll: null | 'press' | 'arrive' };

/**
 * The homepage's projects (Wes, 24 Nov 2026: "defaulting to all, but then the click tabs"): an "Explore projects"
 * heading with the chips under it, the note for the pressed category, and one grid of every project, newest first.
 * With All pressed the highlights row's projects are left out of the grid (they are right above it); a category shows
 * only its own tiles, highlights included. The others carry `hidden`, so a tile keeps its place, tilt and tape.
 *
 * The server renders All, so without JavaScript every tile shows but the three above, and nothing is out of reach. The
 * address holds the filter: #work … #web select a category, #projects is All (and lands on the heading), no hash is All.
 * A press rewrites the address in place; a hash change (Back, Forward, a link) applies it again.
 *
 * The slim bar (Wes picked "option 1", 24 Nov 2026): once the resting chips have gone up under the header, and while
 * the list is still on screen, a one-row copy of them shows in a bar fixed under the header. Fixed, so nothing in the
 * page moves when it comes or goes. Only one copy is ever reachable: the bar is `hidden` while it isn't showing, and
 * the resting chips are `inert` while it is; a keyboard user focused in the copy that goes is moved to the same chip in
 * the other. A press while the bar shows brings the start of the list up under it; otherwise the page stays put.
 * `children` follow the list (the GitHub map).
 */
export default function ProjectFilter({
  projects,
  highlights,
  children,
}: {
  projects: HomeProject[];
  highlights: string[];
  children?: ReactNode;
}) {
  const [sel, setSel] = useState<Selection>({ filter: 'all', n: 0, scroll: null });
  const [stuck, setStuck] = useState(false);
  const restRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const startRef = useRef<HTMLDivElement>(null);
  const handoff = useRef<string | null>(null);
  const stuckRef = useRef(false);
  const filter = sel.filter;

  const press = useCallback((id: Filter) => {
    setSel((s) => ({ filter: id, n: s.n + 1, scroll: 'press' }));
    const hash = id === 'all' ? '' : `#${id}`;
    if (location.hash === hash) return;
    // In place, keeping the router's own history state: a press is not a new entry to go Back through.
    history.replaceState(history.state, '', hash || location.pathname + location.search);
  }, []);

  // Arriving with a filter in the address, and any later hash change.
  useEffect(() => {
    const start = filterFromHash(location.hash);
    if (start && start !== 'all') setSel((s) => ({ filter: start, n: s.n + 1, scroll: returning() ? null : 'arrive' }));
    // Back, Forward or a link changing the hash (a fragment's Back and Forward fire hashchange too). #projects is All,
    // and the browser has already brought the heading up; a category is applied as on arrival. Any other hash (the
    // header's #connect, Back to top's #top) leaves the filter as it is.
    const onHash = () => {
      const f = filterFromHash(location.hash);
      if (f) setSel((s) => ({ filter: f, n: s.n + 1, scroll: f === 'all' ? null : 'arrive' }));
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // The header's height, where the bar sits (top: var(--head-h)); the stylesheet is the one place it is set.
  const line = () => (barRef.current ? parseFloat(getComputedStyle(barRef.current).top) || 0 : 0);

  // Show the slim bar once the resting chips have gone up under the header, while the list is still on screen.
  const update = useCallback(() => {
    const rest = restRef.current?.querySelector<HTMLElement>('.pf-chips');
    const start = startRef.current;
    if (!rest || !start) return;
    const top = line();
    const next = rest.getBoundingClientRect().top < top && start.getBoundingClientRect().bottom > top + 60;
    if (next === stuckRef.current) return;
    // A keyboard user in the copy that is going moves to the same chip in the other.
    const a = document.activeElement as HTMLElement | null;
    const from = stuckRef.current ? barRef.current : restRef.current;
    handoff.current = a && from?.contains(a) ? (a.dataset.id ?? null) : null;
    stuckRef.current = next;
    setStuck(next);
  }, []);

  useEffect(() => {
    let frame = 0;
    const raf = typeof window.requestAnimationFrame === 'function' ? window.requestAnimationFrame.bind(window) : null;
    const onScroll = () => {
      if (!raf) return update();
      if (!frame) frame = raf(() => {
        frame = 0;
        update();
      });
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame && typeof window.cancelAnimationFrame === 'function') window.cancelAnimationFrame(frame);
    };
  }, [update]);

  useLayoutEffect(() => {
    const id = handoff.current;
    handoff.current = null;
    if (!id) return;
    const to = (stuck ? barRef.current : restRef.current)?.querySelector<HTMLElement>(`.pf-chip[data-id="${id}"]`);
    to?.focus({ preventScroll: true });
  }, [stuck]);

  // After the grid has changed: put the heading and the list where the press or the address wants them.
  useLayoutEffect(() => {
    const rest = restRef.current;
    const start = startRef.current;
    if (!sel.scroll || !rest || !start) return;
    const top = line();
    const settled = window.scrollY + rest.getBoundingClientRect().top - top; // the heading just under the header
    if (sel.scroll === 'arrive') return scrollToY(settled, false);
    if (!stuck || !barRef.current) return; // the chips are still in their own place: stay put
    const y = window.scrollY + start.getBoundingClientRect().top - top - barRef.current.offsetHeight - GAP;
    scrollToY(Math.max(y, settled), sel.scroll === 'press');
    // `stuck` is read, not followed: a press or an arrival is what moves the page.
  }, [sel]);

  const items = filterItems(projects);
  const nameOf = (id: CategoryId) => CATEGORIES.find((c) => c.id === id)!.name;
  const note = filter === 'all' ? null : NOTES[filter];

  return (
    <>
      {/* The slim bar, fixed under the header: first in the order, so Tab meets it before the list when it shows. */}
      <div className="pf-bar" ref={barRef} hidden={!stuck}>
        <div className="pf-bar-in">
          <FilterChips items={items} pressed={filter} onPress={press} slim inert={!stuck} />
        </div>
      </div>
      <section className="pf-list" aria-labelledby="pf-h">
        {/* #projects lands here: the heading comes to rest just under the header. */}
        <div id="projects" className="pf-rest" ref={restRef}>
          <h2 id="pf-h" className="pf-h">
            Explore projects
          </h2>
          <FilterChips items={items} pressed={filter} onPress={press} inert={stuck} />
        </div>
        <div className="pf-items" ref={startRef}>
          {note && <div className="pf-note">{note}</div>}
          <div className="tiles">
            {projects.map((p) => (
              <ProjectTile
                key={p.key}
                project={p}
                footer
                category={{ name: nameOf(p.category), onPress: () => press(p.category) }}
                hidden={filter === 'all' ? highlights.includes(p.key) : p.category !== filter}
              />
            ))}
          </div>
        </div>
      </section>
      {children}
    </>
  );
}
