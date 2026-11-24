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

// The space between the band's bottom edge and the start of the list when a press brings the list up.
const GAP = 16;

/**
 * The band (design system › the band): the homepage's project filter, a sibling of SnesNav and HealthNav in looks.
 * "Explore projects ▸", then All and a button per category, each with its count; one is pressed at a time
 * (aria-pressed), and arrow keys, Home and End move between them. Without `onPress` (the /design sample) it is inert.
 */
export function FilterBand({
  items,
  pressed,
  onPress,
  bandRef,
}: {
  items: FilterItem[];
  pressed: Filter;
  onPress?: (id: Filter) => void;
  bandRef?: React.Ref<HTMLDivElement>;
}) {
  const rowRef = useRef<HTMLDivElement>(null);

  // Keep the pressed button in view inside the band (it slides sideways on a phone), without moving the page.
  useEffect(() => {
    const row = rowRef.current;
    const b = row?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (!row || !b) return;
    const left = b.offsetLeft;
    const right = left + b.offsetWidth;
    if (left >= row.scrollLeft && right <= row.scrollLeft + row.clientWidth) return;
    const to = Math.max(0, left - (row.clientWidth - b.offsetWidth) / 2);
    if (typeof row.scrollTo === 'function') row.scrollTo({ left: to, behavior: reducedMotion() ? 'auto' : 'smooth' });
    else row.scrollLeft = to;
  }, [pressed]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const list = [...(rowRef.current?.querySelectorAll<HTMLButtonElement>('.pf-b') ?? [])];
    const i = list.indexOf(document.activeElement as HTMLButtonElement);
    if (i < 0) return;
    const last = list.length - 1;
    const j = { ArrowRight: i === last ? 0 : i + 1, ArrowLeft: i === 0 ? last : i - 1, Home: 0, End: last }[e.key];
    if (j === undefined) return;
    e.preventDefault();
    list[j].focus();
  };

  return (
    <div className="pf-band" role="group" aria-label="Explore projects" ref={bandRef}>
      <div className="pf-band-in" ref={rowRef} onKeyDown={onKeyDown}>
        <span className="pf-k" aria-hidden="true">
          Explore projects ▸
        </span>
        {items.map((s) => {
          // The visible label stays in the name (for voice control); a short label also gets the full name.
          const name = s.name.includes(s.label) ? s.name : `${s.label}, ${s.name}`;
          return (
            <button
              key={s.id}
              type="button"
              className="pf-b"
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
    </div>
  );
}

// The notes a category opens with, when it has one: the agents' and the games' (Wes's copy, from the old sections).
const NOTES: Partial<Record<CategoryId, ReactNode>> = {
  work: (
    <>
      <div className="eyebrow">Autonomous AI agents</div>
      <p className="gnote">
        Agents that take the repetitive end of legal and compliance work — scanning, monitoring, reporting, chasing
        deadlines before they lapse. Each one named after a coworker&apos;s pet, driving engagement and making compliance a
        little more fun.
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
 * The homepage's projects (Wes, 24 Nov 2026: "defaulting to all, but then the click tabs"): the band, the note for the
 * pressed category, and one grid of every project, newest first. With All pressed the highlights row's projects are
 * left out of the grid (they are right above it); a category shows only its own tiles, highlights included. The others
 * carry `hidden`, so a tile keeps its place, tilt and tape.
 *
 * The server renders All, so without JavaScript every tile shows but the three above, and nothing is out of reach. The
 * address holds the filter: #work … #web select a category, #projects is All (and lands on the band), no hash is All.
 * A press rewrites the address in place; a hash change (Back, Forward, a link) applies it again.
 *
 * The band sticks under the header (top: var(--head-h)). A press while it is stuck brings the start of the list up
 * under it; while it is still in its own place on screen the page stays put. `children` follow the grid (the GitHub map).
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
  const spotRef = useRef<HTMLDivElement>(null);
  const bandRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLElement>(null);
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
    // and the browser has already brought the band up; a category is applied as on arrival. Any other hash (the
    // header's #connect, Back to top's #top) leaves the filter as it is.
    const onHash = () => {
      const f = filterFromHash(location.hash);
      if (f) setSel((s) => ({ filter: f, n: s.n + 1, scroll: f === 'all' ? null : 'arrive' }));
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // After the grid has changed: put the band and the list where the press or the address wants them.
  useLayoutEffect(() => {
    const spot = spotRef.current;
    const band = bandRef.current;
    const list = listRef.current;
    if (!sel.scroll || !spot || !band || !list) return;
    // The band's sticky offset is the header's height (--head-h); the stylesheet is the one place it is set.
    const line = parseFloat(getComputedStyle(band).top) || 0;
    const settled = window.scrollY + spot.getBoundingClientRect().top - line; // the band just stuck, the list under it
    if (sel.scroll === 'arrive') return scrollToY(settled, false);
    if (spot.getBoundingClientRect().top > line + 0.5) return; // the band is still in its own place: stay put
    const y = window.scrollY + list.getBoundingClientRect().top - line - band.offsetHeight - GAP;
    scrollToY(Math.max(y, settled), sel.scroll === 'press');
  }, [sel]);

  const items = filterItems(projects);
  const nameOf = (id: CategoryId) => CATEGORIES.find((c) => c.id === id)!.name;
  const note = filter === 'all' ? null : NOTES[filter];

  return (
    <>
      {/* #projects lands here: the band's own place, so it comes to rest just under the header. */}
      <div id="projects" className="pf-spot" ref={spotRef} />
      <FilterBand items={items} pressed={filter} onPress={press} bandRef={bandRef} />
      <div className="wrap pf-wrap">
        <section className="pf-list" aria-labelledby="pf-h" ref={listRef}>
          <h2 id="pf-h" className="vh">
            Projects
          </h2>
          {note && <div className="pf-note">{note}</div>}
          <div className="tiles">
            {projects.map((p) => (
              <ProjectTile
                key={p.key}
                project={p}
                footer={p.category !== 'work'}
                category={{ name: nameOf(p.category), onPress: () => press(p.category) }}
                hidden={filter === 'all' ? highlights.includes(p.key) : p.category !== filter}
              />
            ))}
          </div>
        </section>
        {children}
      </div>
    </>
  );
}
