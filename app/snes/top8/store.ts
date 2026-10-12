'use client';

import { createContext, createElement, useCallback, useContext, useLayoutEffect, useMemo, useRef, useSyncExternalStore, type ReactNode } from 'react';
import { EMPTY_STATE, THEME_IDS, cleanName, type ThemeId, type Top8State } from '../../../lib/snes/top8.ts';

// The one saved Top 8, shared by the Top 8 page, the star and the tray. Every storage access is guarded;
// the server snapshot is null so nothing Top 8 renders before hydration.

export const TOP8_KEY = 'snes-top8';
export const TOP8_EVENT = 'snes-top8:change';

/** Validates a stored value: slot shape, theme, name and denied list. Anything unusable falls back to EMPTY_STATE. */
export function parseStored(text: string | null): Top8State {
  try {
    const raw = JSON.parse(text || 'null');
    if (!raw || !Array.isArray(raw.slots)) return EMPTY_STATE;
    const seen = new Set<string>();
    const slots = Array.from({ length: 8 }, (_, i) => {
      const s = raw.slots[i];
      if (typeof s !== 'string' || !s || seen.has(s)) return null;
      seen.add(s);
      return s;
    });
    const theme: ThemeId = (THEME_IDS as readonly string[]).includes(raw.theme) ? raw.theme : EMPTY_STATE.theme;
    const name = typeof raw.name === 'string' ? cleanName(raw.name) : '';
    const denied: string[] = Array.isArray(raw.denied) ? raw.denied.filter((s: unknown): s is string => typeof s === 'string') : [];
    return { slots, theme, name, denied };
  } catch {
    return EMPTY_STATE;
  }
}

// When storage throws (blocked), the session's state lives here so edits still show and subscribers still fire.
let memory: Top8State | null = null;
let blocked = false;

function rawStored(): string | null {
  try { return localStorage.getItem(TOP8_KEY); } catch { blocked = true; return null; }
}

/** Test hook: forget the in-memory fallback. */
export function resetTop8Memory(): void {
  memory = null;
  blocked = false;
  cache = null;
}

export function readTop8(): Top8State {
  const raw = rawStored();
  if (blocked && memory) return memory;
  return parseStored(raw);
}

export function writeTop8(state: Top8State): void {
  memory = state;
  try { localStorage.setItem(TOP8_KEY, JSON.stringify(state)); } catch { blocked = true; }
  try { window.dispatchEvent(new CustomEvent(TOP8_EVENT)); } catch { /* no window */ }
}

export function subscribeTop8(cb: () => void): () => void {
  const onStorage = (e: StorageEvent) => { if (e.key === TOP8_KEY || e.key === null) cb(); };
  window.addEventListener('storage', onStorage);
  window.addEventListener(TOP8_EVENT, cb);
  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener(TOP8_EVENT, cb);
  };
}

// Snapshot identity follows the raw storage string, so React sees a new object only when the data changed.
let cache: { raw: string | null; state: Top8State } | null = null;
function getSnapshot(): Top8State {
  const raw = rawStored();
  if (blocked && memory) return memory;
  if (!cache || cache.raw !== raw) cache = { raw, state: parseStored(raw) };
  return cache.state;
}

const getServerSnapshot = (): Top8State | null => null;

/** Applies an edit to the latest stored state; an updater that returns the same state writes nothing. */
function apply(fn: (s: Top8State) => Top8State): void {
  const cur = getSnapshot();
  const next = fn(cur);
  if (next !== cur) writeTop8(next);
}

export function useTop8(): [Top8State | null, (fn: (s: Top8State) => Top8State) => void] {
  const state = useSyncExternalStore(subscribeTop8, getSnapshot, getServerSnapshot);
  const update = useCallback(apply, []);
  return [state, update];
}

/** What a list's stars and tray read instead of each subscribing to the window: the latest state (null until mounted),
 * a subscription that fires when it changes, and the update function. */
export type Top8Hub = {
  get: () => Top8State | null;
  subscribe: (cb: () => void) => () => void;
  update: (fn: (s: Top8State) => Top8State) => void;
};

// Outside a provider (a star on its own, tests) each reader subscribes to the store directly.
const directHub: Top8Hub = {
  get: () => getSnapshot(),
  subscribe: subscribeTop8,
  update: apply,
};

const HubContext = createContext<Top8Hub | null>(null);

/** One store subscription for everything under it (a page's ~717 stars and its tray). Readers subscribe to an
 * in-memory listener set and select just what they show, so a pick re-renders only the stars it changes. */
export function Top8Provider({ children }: { children: ReactNode }) {
  const [state, update] = useTop8();
  const current = useRef<Top8State | null>(state);
  current.current = state; // children rendering in this same pass already see the new state
  const listeners = useRef(new Set<() => void>());
  const hub = useMemo<Top8Hub>(() => ({
    get: () => current.current,
    subscribe: (cb) => { listeners.current.add(cb); return () => { listeners.current.delete(cb); }; },
    update,
  }), [update]);
  useLayoutEffect(() => { for (const cb of listeners.current) cb(); }, [state]);
  return createElement(HubContext.Provider, { value: hub }, children);
}

/** The nearest provider's hub, or the store itself when there is none. */
export const useTop8Hub = (): Top8Hub => useContext(HubContext) ?? directHub;

/** Whether a Top8Provider is above (it then owns the shared toast region set-up). */
export const useInTop8Provider = (): boolean => useContext(HubContext) !== null;
