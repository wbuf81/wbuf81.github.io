'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';

// Phones have no hover, so there a clip plays in whichever tile sits nearest the middle of the screen once
// scrolling has been still for half a second. One page-level coordinator watches every tile; a new scroll stops
// the clip at once. Skipped with reduced motion or data saver on.
const SETTLE = 500;
const BAND = 0.4; // a tile's centre must sit inside the middle 40% of the viewport to qualify

type Rect = { top: number; bottom: number };

// Index of the rect whose centre is nearest the viewport's vertical centre, or -1 when none is inside the band.
export function pickCentre(rects: Rect[], viewport: number, band = BAND): number {
  const mid = viewport / 2;
  let best = -1;
  let gap = (band * viewport) / 2;
  rects.forEach((r, i) => {
    const d = Math.abs((r.top + r.bottom) / 2 - mid);
    if (d <= gap) {
      best = i;
      gap = d;
    }
  });
  return best;
}

const canCenterPlay = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(hover: none) and (prefers-reduced-motion: no-preference)').matches &&
  (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData !== true;

type Tile = { el: HTMLElement; choose: (on: boolean) => void };
const tiles = new Set<Tile>();
const near = new Set<Element>(); // tiles the observer reports near the middle; every tile when there is no observer
let observer: IntersectionObserver | null = null;
let current: Tile | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;

const settle = () => {
  current = null;
  const candidates = [...tiles].filter((t) => !observer || near.has(t.el));
  const i = pickCentre(candidates.map((t) => t.el.getBoundingClientRect()), window.innerHeight);
  if (i < 0) return;
  current = candidates[i];
  current.choose(true);
};
const schedule = () => {
  clearTimeout(timer);
  timer = setTimeout(settle, SETTLE);
};
const onScroll = () => {
  current?.choose(false);
  current = null;
  schedule();
};

function register(tile: Tile) {
  if (tiles.size === 0) {
    window.addEventListener('scroll', onScroll, { passive: true });
    if (typeof IntersectionObserver !== 'undefined') {
      // Only tiles touching the middle band are worth measuring when the scroll settles.
      observer = new IntersectionObserver(
        (entries) => entries.forEach((e) => (e.isIntersecting ? near.add(e.target) : near.delete(e.target))),
        { rootMargin: '-30% 0px -30% 0px' },
      );
    }
    armPriming();
  }
  tiles.add(tile);
  observer?.observe(tile.el);
  schedule(); // evaluate once after the page mounts
  return () => {
    tiles.delete(tile);
    near.delete(tile.el);
    observer?.unobserve(tile.el);
    if (current === tile) current = null;
    if (tiles.size === 0) {
      window.removeEventListener('scroll', onScroll);
      clearTimeout(timer);
      observer?.disconnect();
      observer = null;
    }
  };
}

// iOS lets a video play with sound only if that same element was started inside a tap. So phones share one
// <video>: the first tap starts it (muted, then paused) and unmutes it, and it then moves into whichever tile plays.
let shared: HTMLVideoElement | null = null;
let primed = false;
const PRIME_EVENTS = ['touchstart', 'pointerdown'] as const;

const sharedVideo = () => {
  if (!shared) {
    shared = document.createElement('video');
    shared.loop = true;
    shared.muted = true;
    shared.playsInline = true;
    shared.setAttribute('playsinline', '');
    shared.preload = 'none';
  }
  return shared;
};
const soundWanted = () => {
  try {
    return localStorage.getItem('snes-sound') !== 'off';
  } catch {
    return true;
  }
};
const prime = () => {
  if (primed) return;
  primed = true;
  for (const e of PRIME_EVENTS) window.removeEventListener(e, prime, { capture: true });
  const v = sharedVideo();
  if (v.getAttribute('src')) {
    // A clip is already playing muted: unmute it while the tap still counts.
    v.muted = !soundWanted();
    v.play().catch(() => {});
    return;
  }
  v.muted = true;
  v.play().then(() => { if (!v.getAttribute('src')) v.pause(); }, () => {});
  v.muted = !soundWanted();
};
function armPriming() {
  if (primed) return;
  for (const e of PRIME_EVENTS) window.addEventListener(e, prime, { capture: true, passive: true });
}

// Moves the shared video into a tile and plays its clip, with sound if allowed, else muted (as on desktop).
export function playShared(host: HTMLElement, src: string, sound: boolean) {
  const v = sharedVideo();
  if (v.parentNode !== host) host.appendChild(v);
  if (v.getAttribute('src') !== src) v.src = src;
  v.muted = !sound;
  v.play().catch(() => {
    v.muted = true;
    v.play().catch(() => {});
  });
}
// Stops and detaches the shared video, dropping its source so the download ends; only if it is still in this tile.
export function stopShared(host: HTMLElement) {
  const v = shared;
  if (!v || v.parentNode !== host) return;
  v.pause();
  v.removeAttribute('src');
  v.load();
  v.remove();
}
export function muteShared(host: HTMLElement, muted: boolean) {
  if (shared?.parentNode === host) shared.muted = muted;
}

// Registers a tile with the coordinator on phones; returns true when this tile is in centre-play mode.
export function useCenterPlay(ref: RefObject<HTMLElement | null>, enabled: boolean, choose: (on: boolean) => void) {
  const [active, setActive] = useState(false);
  const latest = useRef(choose);
  latest.current = choose;
  useEffect(() => {
    const el = ref.current;
    if (!enabled || !el || !canCenterPlay()) return;
    setActive(true);
    const off = register({ el, choose: (on) => latest.current(on) });
    return () => {
      off();
      setActive(false);
    };
  }, [ref, enabled]);
  return active;
}
