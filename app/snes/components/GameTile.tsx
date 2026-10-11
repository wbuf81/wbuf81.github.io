'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { IndexGame } from '@/lib/snes/library';
import { gamePath } from '@/lib/snes/routes';
import { formatRelease } from '@/lib/snes/display';
import { useSound } from './sound';

// One clip at a time across the whole page: starting a tile stops whichever tile was playing.
let stopPlaying: (() => void) | null = null;
const canPreview = () => typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (prefers-reduced-motion: no-preference)').matches;

// A clip must not keep playing behind another tab or window: stop it when the page is hidden or loses focus.
if (typeof window !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') stopPlaying?.();
  });
  window.addEventListener('blur', () => stopPlaying?.());
}

export function GameTile({ game, publisherName, genre }: { game: IndexGame; publisherName: string; genre?: string }) {
  const [playing, setPlaying] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const video = useRef<HTMLVideoElement>(null);
  const sound = useSound();

  const start = () => {
    if (!game.video || !canPreview()) return;
    timer.current = setTimeout(() => {
      stopPlaying?.();
      stopPlaying = () => setPlaying(false);
      setPlaying(true);
    }, 300);
  };
  const stop = () => {
    clearTimeout(timer.current);
    setPlaying(false);
  };

  useEffect(() => {
    const v = video.current;
    if (!playing || !v) return;
    v.muted = !sound.on;
    v.play().catch(() => {
      v.muted = true;
      v.play().catch(() => {});
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);
  useEffect(() => {
    if (video.current) video.current.muted = !sound.on;
  }, [sound.on]);
  useEffect(() => () => clearTimeout(timer.current), []);

  const when = formatRelease(game.releasedUS, game.datePrecision);
  const label = [game.title, when, game.egmAvg !== null ? `EGM ${game.egmAvg.toFixed(1)}` : ''].filter(Boolean).join(', ');
  return (
    <Link href={gamePath(game.slug)} prefetch={false} className={`s-tile${playing ? ' is-playing' : ''}`} aria-label={label} onMouseEnter={start} onMouseLeave={stop}>
      <span className="s-art">
        {game.boxArt ? <img src={game.boxArt} alt="" width={300} height={209} loading="lazy" decoding="async" /> : <span className="s-noart">{game.title}</span>}
        {playing && game.video ? <video ref={video} src={game.video} loop playsInline autoPlay muted={!sound.on} /> : null}
      </span>
      <span className="s-tb">
        <span className="s-tt">{game.title}</span>
        <span className="s-tp">{[publisherName, genre].filter(Boolean).join(' · ')}</span>
        <span className="s-chips">
          {game.egmAvg !== null ? <span>EGM <b>{game.egmAvg.toFixed(1)}</b></span> : null}
          {game.np10 !== null ? <span>NP <b>{game.np10.toFixed(1)}</b></span> : null}
          {game.launchTitle ? <span className="s-day">Day One</span> : null}
        </span>
      </span>
    </Link>
  );
}

export default GameTile;
