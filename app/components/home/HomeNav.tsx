'use client';

import { useEffect, useRef, useState } from 'react';
import type { HomeSectionId } from '@/lib/projects';

export interface HomeNavItem {
  id: HomeSectionId;
  heading: string;
  label: string;
  icon: string;
  count: number;
}

// How far below the band a section's top may sit and still count as the one being read: a quarter of the screen, or
// just under the band on a short one. A band link lands a section at its scroll-margin-top (band + 16px), inside this.
function threshold(band: HTMLElement): number {
  return Math.max(band.getBoundingClientRect().bottom + 32, window.innerHeight * 0.25);
}

/** The section being read: the last one whose top has reached the threshold, none above the first or past the last. */
function currentSection(band: HTMLElement, ids: string[]): string | null {
  const line = threshold(band);
  let found: string | null = null;
  let el: HTMLElement | null = null;
  for (const id of ids) {
    const s = document.getElementById(id);
    if (!s) continue;
    if (s.getBoundingClientRect().top <= line) {
      found = id;
      el = s;
    } else break;
  }
  if (found && found === ids[ids.length - 1] && el && el.getBoundingClientRect().bottom < line) return null;
  return found;
}

function reducedMotion(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * The homepage's own menu, a sibling of SnesNav and HealthNav (rules in app/design-system.css › home-nav): a band that
 * sticks to the top of the screen, one link per build section with its count. It says where you are on this page,
 * lighting the section being read. The header has no links (Wes, 24 Nov 2026: "i only want one menu please"), so this
 * is the page's only menu, and it ends with Connect (the footer). Each link is a plain anchor, so it
 * works without JavaScript; the lighting is a rAF-throttled scroll handler, and on a phone the band slides itself (never
 * the page) to keep the lit link in view.
 *
 * `sample` is for /design, where the sections don't exist: it lights that one section, points every link at the
 * homepage (/#work …) and tracks nothing. The design page's own rule (.ds-home-nav) keeps it from sticking.
 */
export default function HomeNav({ items, sample }: { items: HomeNavItem[]; sample?: HomeSectionId }) {
  const [tracked, setCurrent] = useState<string | null>(null);
  const current = sample ?? tracked;
  const navRef = useRef<HTMLElement>(null);
  const inRef = useRef<HTMLDivElement>(null);
  const ids = items.map((i) => i.id).join(' ');

  useEffect(() => {
    const band = navRef.current;
    if (sample || !band || typeof window === 'undefined') return;
    const list = ids.split(' ');
    let frame = 0;
    const update = () => {
      frame = 0;
      setCurrent(currentSection(band, list));
    };
    const raf = typeof window.requestAnimationFrame === 'function' ? window.requestAnimationFrame.bind(window) : null;
    const onScroll = () => {
      if (!raf) return update();
      if (!frame) frame = raf(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    window.addEventListener('hashchange', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      window.removeEventListener('hashchange', onScroll);
      if (frame && typeof window.cancelAnimationFrame === 'function') window.cancelAnimationFrame(frame);
    };
  }, [ids, sample]);

  // Keep the lit link in view inside the band (it slides sideways on a phone), without moving the page.
  useEffect(() => {
    const row = inRef.current;
    if (sample || !row || !current) return;
    const link = row.querySelector<HTMLElement>(`[data-section="${current}"]`);
    if (!link) return;
    const left = link.offsetLeft;
    const right = left + link.offsetWidth;
    if (left >= row.scrollLeft && right <= row.scrollLeft + row.clientWidth) return;
    const to = Math.max(0, left - (row.clientWidth - link.offsetWidth) / 2);
    if (typeof row.scrollTo === 'function') row.scrollTo({ left: to, behavior: reducedMotion() ? 'auto' : 'smooth' });
    else row.scrollLeft = to;
  }, [current, sample]);

  // Glide there (jump under reduced motion) and keep the address in step.
  const go = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    if (sample) return;
    const el = document.getElementById(id);
    if (!el || typeof el.scrollIntoView !== 'function') return;
    e.preventDefault();
    el.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth' });
    history.replaceState(null, '', `#${id}`);
  };

  // On /design the links lead to the homepage's sections; on the homepage they stay on the page.
  const at = sample ? '/#' : '#';

  return (
    <nav className="home-nav" aria-label={sample ? 'Builds on the homepage' : 'Builds on this page'} ref={navRef}>
      <div className="home-nav-in" ref={inRef}>
        <span className="home-nav-k" aria-hidden="true">Builds ▸</span>
        {items.map((s) => {
          // The visible label stays in the name (for voice control); a short label also gets the section's heading.
          const name = s.heading.includes(s.label) ? s.heading : `${s.label}, ${s.heading}`;
          return (
            <a
              key={s.id}
              href={`${at}${s.id}`}
              className="home-nav-a"
              data-section={s.id}
              onClick={(e) => go(e, s.id)}
              aria-current={s.id === current ? 'true' : undefined}
              aria-label={`${name}, ${s.count} ${s.count === 1 ? 'build' : 'builds'}`}
            >
              <span className="home-nav-i" aria-hidden="true">{s.icon}</span>
              <span className="home-nav-l">{s.label}</span>
              <span className="home-nav-n" aria-hidden="true">{s.count}</span>
            </a>
          );
        })}
        {/* Connect: the footer. The band is the page's only menu, so it ends here; never counted, never lit. */}
        <a href={`${at}connect`} className="home-nav-a home-nav-end" onClick={(e) => go(e, 'connect')}>
          <span className="home-nav-i" aria-hidden="true">✉️</span>
          <span className="home-nav-l">Connect</span>
        </a>
      </div>
    </nav>
  );
}
