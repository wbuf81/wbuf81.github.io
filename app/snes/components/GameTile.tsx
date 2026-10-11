'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { IndexGame } from '@/lib/snes/library';
import { gamePath } from '@/lib/snes/routes';
import { formatRelease } from '@/lib/snes/display';
import { useSound } from './sound';
import { muteShared, playShared, stopShared, useCenterPlay } from './useCenterPlay';

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
  const link = useRef<HTMLAnchorElement>(null);
  const art = useRef<HTMLSpanElement>(null);
  const sound = useSound();

  const begin = () => {
    stopPlaying?.();
    stopPlaying = () => setPlaying(false);
    setPlaying(true);
  };
  const start = () => {
    if (!game.video || !canPreview()) return;
    timer.current = setTimeout(begin, 300);
  };
  // On phones the tile nearest the middle of the screen plays instead, in the page's one shared <video>.
  const centred = useCenterPlay(link, !!game.video, (on) => (on ? begin() : setPlaying(false)));
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
    const host = art.current;
    if (!playing || !centred || !host || !game.video) return;
    playShared(host, game.video, sound.on);
    return () => stopShared(host);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, centred]);
  useEffect(() => {
    if (video.current) video.current.muted = !sound.on;
    if (art.current) muteShared(art.current, !sound.on);
  }, [sound.on]);
  useEffect(() => () => clearTimeout(timer.current), []);

  const when = formatRelease(game.releasedUS, game.datePrecision);
  const label = [game.title, when, game.egmAvg !== null ? `EGM ${game.egmAvg.toFixed(1)}` : ''].filter(Boolean).join(', ');
  return (
    <Link ref={link} href={gamePath(game.slug)} prefetch={false} className={`s-tile${playing ? ' is-playing' : ''}`} aria-label={label} onMouseEnter={start} onMouseLeave={stop}>
      <span className="s-art" ref={art}>
        {game.boxArt ? <img src={game.boxArt} alt="" width={300} height={209} loading="lazy" decoding="async" /> : <span className="s-noart">{game.title}</span>}
        {playing && game.video && !centred ? <video ref={video} src={game.video} loop playsInline autoPlay muted={!sound.on} /> : null}
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
