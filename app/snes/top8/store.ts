'use client';

import { useCallback, useSyncExternalStore } from 'react';
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

function rawStored(): string | null {
  try { return localStorage.getItem(TOP8_KEY); } catch { return null; }
}

export function readTop8(): Top8State {
  return parseStored(rawStored());
}

export function writeTop8(state: Top8State): void {
  try { localStorage.setItem(TOP8_KEY, JSON.stringify(state)); } catch { /* storage blocked: the session still works */ }
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
  if (!cache || cache.raw !== raw) cache = { raw, state: parseStored(raw) };
  return cache.state;
}

const getServerSnapshot = (): Top8State | null => null;

export function useTop8(): [Top8State | null, (fn: (s: Top8State) => Top8State) => void] {
  const state = useSyncExternalStore(subscribeTop8, getSnapshot, getServerSnapshot);
  const update = useCallback((fn: (s: Top8State) => Top8State) => {
    writeTop8(fn(getSnapshot()));
  }, []);
  return [state, update];
}
