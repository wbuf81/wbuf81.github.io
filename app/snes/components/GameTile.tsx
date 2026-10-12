'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { flushSync } from 'react-dom';
import type { IndexGame } from '@/lib/snes/library';
import { gamePath } from '@/lib/snes/routes';
import { formatRelease } from '@/lib/snes/display';
import { useSound } from './sound';
import { canPreview, claimClip, isTouch, playClip } from './clip';
import { Top8Star } from './Top8Star';

export function GameTile({ game, publisherName, genre }: { game: IndexGame; publisherName: string; genre?: string }) {
  const [playing, setPlaying] = useState(false);
  const [tapped, setTapped] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const video = useRef<HTMLVideoElement>(null);
  const sound = useSound();

  const begin = (byTap: boolean) => {
    claimClip(() => setPlaying(false));
    setTapped(byTap);
    setPlaying(true);
  };
  const start = () => {
    if (!game.video || !canPreview()) return;
    timer.current = setTimeout(() => begin(false), 300);
  };
  // iOS plays with sound only when play() runs inside the tap itself, so render the <video> synchronously and start it
  // here. Keyboard activation (detail 0) and a tap on the tile already playing navigate as usual.
  const tap = (e: MouseEvent) => {
    if (e.detail === 0 || playing || !game.video || !isTouch()) return;
    e.preventDefault();
    flushSync(() => begin(true));
    // The tap's own pointerdown unlocks sound, which may not have re-rendered yet: "waiting" counts as on.
    if (video.current) playClip(video.current, sound.on || sound.waiting);
  };
  const stop = () => {
    clearTimeout(timer.current);
    setPlaying(false);
  };

  useEffect(() => {
    const v = video.current;
    if (!playing || !v || tapped) return; // a tapped clip was already started inside the tap
    playClip(v, sound.on);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);
  useEffect(() => {
    if (video.current) video.current.muted = !sound.on;
  }, [sound.on]);
  useEffect(() => () => clearTimeout(timer.current), []);

  const when = formatRelease(game.releasedUS, game.datePrecision);
  const label = [game.title, when, game.egmAvg !== null ? `EGM ${game.egmAvg.toFixed(1)}` : ''].filter(Boolean).join(', ');
  return (
    // The wrapper holds the hover (so moving onto the ★ keeps the clip) and the ★, a sibling of the link, never inside it.
    <div className="s-tile-w" onMouseEnter={start} onMouseLeave={stop}>
      <Link href={gamePath(game.slug)} prefetch={false} className={`s-tile${playing ? ' is-playing' : ''}`} aria-label={label} onClick={tap}>
        <span className="s-art">
          {game.boxArt ? <img src={game.boxArt} alt="" width={300} height={209} loading="lazy" decoding="async" /> : <span className="s-noart">{game.title}</span>}
          {playing && game.video ? <video ref={video} src={game.video} loop playsInline autoPlay muted={!sound.on} /> : null}
          {playing && tapped ? <span className="s-tap">Tap again to open</span> : null}
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
      <Top8Star slug={game.slug} title={game.title} variant="tile" />
    </div>
  );
}

export default GameTile;
