'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

// Browsers allow audio only after the visitor has interacted with the page, so sound is on by default but
// waits for the first click, tap or keypress anywhere. The button mutes and unmutes; a mute is remembered.
type Sound = { on: boolean; waiting: boolean; muted: boolean; toggle: () => void };
const SoundContext = createContext<Sound>({ on: false, waiting: false, muted: false, toggle: () => {} });
const KEY = 'snes-sound';
const EVENTS = ['pointerdown', 'keydown', 'touchstart'] as const;

export function SoundProvider({ children }: { children: ReactNode }) {
  const [muted, setMuted] = useState(false);
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    try {
      setMuted(localStorage.getItem(KEY) === 'off');
    } catch {
      /* storage blocked: stay unmuted */
    }
    if ((navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation?.hasBeenActive) {
      setUnlocked(true);
      return;
    }
    const unlock = () => setUnlocked(true);
    for (const e of EVENTS) window.addEventListener(e, unlock, { once: true, capture: true });
    return () => {
      for (const e of EVENTS) window.removeEventListener(e, unlock, { capture: true });
    };
  }, []);

  const toggle = useCallback(() => {
    if (!unlocked) {
      setUnlocked(true); // the first click only grants sound
      return;
    }
    setMuted((m) => {
      try {
        localStorage.setItem(KEY, m ? 'on' : 'off');
      } catch {
        /* storage blocked */
      }
      return !m;
    });
  }, [unlocked]);

  return <SoundContext.Provider value={{ on: unlocked && !muted, waiting: !unlocked && !muted, muted, toggle }}>{children}</SoundContext.Provider>;
}

export const useSound = () => useContext(SoundContext);

export function SoundButton() {
  const { on, waiting, toggle } = useSound();
  const label = on ? '🔊 Sound on' : waiting ? '🔊 Click anywhere for sound' : '🔇 Muted';
  return (
    <button type="button" className={`s-sound${on ? ' is-on' : waiting ? ' is-wait' : ''}`} onClick={toggle}>
      {label}
    </button>
  );
}
