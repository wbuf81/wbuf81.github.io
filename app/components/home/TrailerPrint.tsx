'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Tape, Trailer } from '@/lib/projects';
import Print from './Print';

// Plays on its own only where the visitor hasn't asked for less: reduced motion or Data Saver keep the poster.
function autoplayAllowed(): boolean {
  if (typeof window === 'undefined') return false;
  const reduce = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  return !reduce && !conn?.saveData;
}

// A tile's print with a trailer in place of the picture (a game on the homepage). It plays muted
// while at least half of it is in view and pauses, muted again, when it leaves, so sound never comes back on its
// own. A click on the picture or "Turn sound on" brings the sound in; Pause holds it until the visitor plays again.
// The print is not a link: the tile's footer link goes to the game's page.
// `sound={false}` is for a clip with no sound track: no sound button, and a click on the picture plays or pauses it.
// `label` is the caption's left-hand text. `off` is its tile filtered out of the homepage grid: it stops, muted, and
// starts again (muted) only once it is back on screen.
export default function TrailerPrint({
  trailer,
  tilt,
  tapes,
  sound = true,
  label = 'Trailer',
  className,
  off = false,
}: {
  trailer: Trailer;
  tilt: number;
  tapes: Tape[];
  sound?: boolean;
  label?: string;
  className?: string;
  off?: boolean;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const userPaused = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);

  // The element is the truth: read it back after every event and every action.
  const sync = useCallback(() => {
    const v = ref.current;
    if (!v) return;
    setPlaying(!v.paused);
    setMuted(v.muted);
  }, []);

  const play = useCallback(() => {
    const v = ref.current;
    if (!v) return;
    // A refusal (autoplay blocked, a decode error) just leaves the poster and the Play button.
    const p = v.play();
    if (p && typeof p.then === 'function') p.then(sync, sync);
    sync();
  }, [sync]);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    v.muted = true;
    v.addEventListener('play', sync);
    v.addEventListener('pause', sync);
    v.addEventListener('volumechange', sync);
    sync();
    let io: IntersectionObserver | undefined;
    if (typeof IntersectionObserver !== 'undefined') {
      io = new IntersectionObserver(
        (entries) => {
          const e = entries[entries.length - 1];
          if (!e) return;
          // Checked by ratio as well: below the threshold, browsers don't agree on what isIntersecting says.
          if (e.isIntersecting && e.intersectionRatio >= 0.5) {
            if (userPaused.current || !autoplayAllowed()) return;
            v.muted = true;
            play();
          } else {
            // Not the visitor's pause: coming back into view starts it again, still muted.
            v.pause();
            v.muted = true;
            sync();
          }
        },
        { threshold: 0.5 },
      );
      io.observe(v);
    }
    return () => {
      io?.disconnect();
      v.removeEventListener('play', sync);
      v.removeEventListener('pause', sync);
      v.removeEventListener('volumechange', sync);
    };
  }, [play, sync]);

  // Filtered out of the grid: stop it, as scrolling it away would (the observer starts it again once it is back).
  useEffect(() => {
    const v = ref.current;
    if (!off || !v) return;
    if (!v.paused) v.pause();
    v.muted = true;
    sync();
  }, [off, sync]);

  // Synchronous inside the click: iOS only lets sound start from within the tap.
  const toggleSound = () => {
    const v = ref.current;
    if (!v) return;
    if (v.paused) {
      userPaused.current = false;
      v.muted = false;
      play();
    } else {
      v.muted = !v.muted;
      sync();
    }
  };

  const togglePlay = () => {
    const v = ref.current;
    if (!v) return;
    if (v.paused) {
      userPaused.current = false;
      play();
    } else {
      userPaused.current = true;
      v.pause();
      sync();
    }
  };

  return (
    <Print
      className={className ? `trl ${className}` : 'trl'}
      tilt={tilt}
      tapes={tapes}
      caption={
        <>
          <span>{label}</span>
          <span className="trl-ctl">
            {sound && (
              <button type="button" onClick={toggleSound}>
                {muted ? 'Turn sound on' : 'Turn sound off'}
              </button>
            )}
            <button type="button" onClick={togglePlay}>
              {playing ? 'Pause' : 'Play'}
            </button>
          </span>
        </>
      }
    >
      <video
        ref={ref}
        className="ph trl-v"
        src={trailer.src}
        poster={trailer.poster}
        muted
        loop
        playsInline
        preload="none"
        width={trailer.width ?? 960}
        height={trailer.height ?? 640}
        aria-label={trailer.label}
        onClick={sound ? toggleSound : togglePlay}
      />
    </Print>
  );
}
