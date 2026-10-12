'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { gamePath, TOP8 } from '@/lib/snes/routes';
import { titlesBySlug } from '@/lib/snes/top8';
import { useTop8 } from '../top8/store';
import { Top8Titles } from './Top8Star';

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
  const [state] = useTop8();
  const names = useMemo(() => (Array.isArray(titles) ? titlesBySlug(titles) : titles), [titles]);
  const [collapsed, setCollapsed] = useState<boolean | null>(null);
  const el = useRef<HTMLElement>(null);
  useEffect(() => { setCollapsed(readCollapsed()); }, []);

  const count = state ? state.slots.filter(Boolean).length : 0;
  const shown = count > 0 && collapsed !== null;

  // While the tray shows, the body carries a class and the tray's height, so the page's end can make room for it.
  useEffect(() => {
    if (!shown) return;
    const body = document.body;
    body.classList.add(OPEN_CLASS);
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
      body.classList.remove(OPEN_CLASS);
      body.style.removeProperty(HEIGHT_VAR);
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
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/snes/thumb/${slug}.jpg`} alt="" width={48} height={33} loading="lazy" decoding="async" />
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

/** One titles map for every ★ under it and for the tray, which it mounts after its children. Takes the titles
 * (game and company pages, the smallest payload) or a ready slug → title map (the library builds it from its index). */
export function Top8Scope({ titles, children }: { titles: Record<string, string> | string[]; children: ReactNode }) {
  const names = useMemo(() => (Array.isArray(titles) ? titlesBySlug(titles) : titles), [titles]);
  return (
    <Top8Titles titles={names}>
      {children}
      <Top8Tray titles={names} />
    </Top8Titles>
  );
}
