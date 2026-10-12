'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { gamePath, TOP8 } from '@/lib/snes/routes';
import { titlesBySlug } from '@/lib/snes/top8';
import { Top8Provider, useTop8Hub } from '../top8/store';
import { ensureToastRegion } from './toast';
import { Top8Titles, knownOnly } from './Top8Star';
import { Cover } from './Cover';

export const TRAY_KEY = 'snes-top8-tray';
const OPEN_CLASS = 't8-tray-open';
const HEIGHT_VAR = '--t8-tray-h';

const fromSlug = (slug: string) => slug.split('-').filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');
const readCollapsed = () => {
  try { return localStorage.getItem(TRAY_KEY) === 'collapsed'; } catch { return false; }
};

// The floating Top 8 tray: fixed to the bottom of the library, game and company pages once something is picked.
// Nothing renders on the server or before mount (the store's server snapshot is null).
export function Top8Tray({ titles }: { titles: Record<string, string> | string[] }) {
  const hub = useTop8Hub();
  const stored = useSyncExternalStore(hub.subscribe, hub.get, () => null);
  const names = useMemo(() => (Array.isArray(titles) ? titlesBySlug(titles) : titles), [titles]);
  // Stored slugs that aren't games are left in storage but neither shown nor counted.
  const state = useMemo(() => stored && knownOnly(stored, names), [stored, names]);
  const [collapsed, setCollapsed] = useState<boolean | null>(null);
  const el = useRef<HTMLElement>(null);
  useEffect(() => { setCollapsed(readCollapsed()); }, []);

  const count = state ? state.slots.filter(Boolean).length : 0;
  const shown = count > 0 && collapsed !== null;

  // While the tray shows, the body carries a class and the tray's height, so the page's end can make room for it.
  // The class follows only whether the tray shows; the height is re-measured when it collapses or expands.
  useEffect(() => {
    if (!shown) return;
    const body = document.body;
    body.classList.add(OPEN_CLASS);
    return () => {
      body.classList.remove(OPEN_CLASS);
      body.style.removeProperty(HEIGHT_VAR);
    };
  }, [shown]);
  useEffect(() => {
    if (!shown) return;
    const body = document.body;
    // From the tray's top edge to the bottom of the viewport: covers the collapsed pill's offset and the safe area too.
    const measure = () => {
      if (!el.current) return;
      const h = Math.max(0, Math.ceil(window.innerHeight - el.current.getBoundingClientRect().top));
      body.style.setProperty(HEIGHT_VAR, `${h}px`);
    };
    measure();
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    if (ro && el.current) ro.observe(el.current);
    window.addEventListener('resize', measure);
    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [shown, collapsed]);

  if (!state || !shown) return null;
  const setFolded = (folded: boolean) => {
    setCollapsed(folded);
    try {
      if (folded) localStorage.setItem(TRAY_KEY, 'collapsed');
      else localStorage.removeItem(TRAY_KEY);
    } catch { /* the choice lasts for this page only */ }
  };
  const tally = `${count}/8`;

  if (collapsed) {
    return (
      <section ref={el} className="s-tray is-collapsed" aria-label="Your Top 8">
        <button type="button" className="s-tray-pill" aria-expanded={false} aria-label={`Show your Top 8 (${tally})`} onClick={() => setFolded(false)}>
          ★ {tally}
        </button>
      </section>
    );
  }
  return (
    <section ref={el} className="s-tray" aria-label="Your Top 8">
      <div className="s-tray-in">
        <ol className="s-tray-slots">
          {state.slots.map((slug, i) => (
            <li key={slug ?? `empty-${i}`} className={`s-tray-slot${slug ? '' : ' is-empty'}`}>
              {slug ? (
                <Link href={gamePath(slug)} prefetch={false} aria-label={names[slug] ?? fromSlug(slug)}>
                  <Cover src={`/snes/thumb/${slug}.jpg`} title={names[slug] ?? fromSlug(slug)} width={48} height={33} />
                </Link>
              ) : null}
            </li>
          ))}
        </ol>
        <span className="s-tray-n">{tally}</span>
        <Link className="s-tray-go" href={TOP8}>Open Top 8 →</Link>
        <button type="button" className="s-tray-fold" aria-expanded={true} aria-label="Collapse your Top 8" onClick={() => setFolded(true)}>
          <span aria-hidden="true">⌄</span>
        </button>
      </div>
    </section>
  );
}

/** One store subscription and one titles map for every ★ under it and for the tray, which it mounts after its
 * children; it also sets up the shared toast region once. Takes the titles
 * (game and company pages, the smallest payload) or a ready slug → title map (the library builds it from its index). */
export function Top8Scope({ titles, children }: { titles: Record<string, string> | string[]; children: ReactNode }) {
  const names = useMemo(() => (Array.isArray(titles) ? titlesBySlug(titles) : titles), [titles]);
  useEffect(() => { ensureToastRegion(); }, []);
  return (
    <Top8Provider>
      <Top8Titles titles={names}>
        {children}
        <Top8Tray titles={names} />
      </Top8Titles>
    </Top8Provider>
  );
}
