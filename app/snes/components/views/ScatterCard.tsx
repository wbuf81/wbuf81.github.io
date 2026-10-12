'use client';

import Link from 'next/link';
import { useEffect, type RefObject } from 'react';
import type { IndexGame } from '@/lib/snes/library';
import { gamePath } from '@/lib/snes/routes';
import { formatRelease } from '@/lib/snes/display';
import { playClip } from '../clip';
import { useSound } from '../sound';

export type CardMode = 'hover' | 'focus' | 'tap';

// The floating card beside a scatter dot: box art with the game's clip playing over it, the title, release date,
// publisher and the score on the current axis. Hover plays with sound (per the sound button), keyboard focus plays
// muted, and a tapped card was already started inside the tap; on phones the card is itself a link to the game.
export default function ScatterCard({ game, x, y, publisherName, axisLabel, score, mode, clip, videoRef }: {
  game: IndexGame; x: number; y: number; publisherName: string; axisLabel: string; score: number; mode: CardMode; clip: boolean;
  videoRef: RefObject<HTMLVideoElement | null>;
}) {
  const sound = useSound();

  useEffect(() => {
    const v = videoRef.current;
    if (v && mode !== 'tap') playClip(v, mode === 'hover' && sound.on);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (videoRef.current && mode !== 'focus') videoRef.current.muted = !sound.on;
  }, [sound.on, mode, videoRef]);

  // Beside the dot, on whichever side has room, and vertically centred on it but kept inside the chart.
  const flip = x > 55;
  const style = {
    [flip ? 'right' : 'left']: `calc(${flip ? 100 - x : x}% + 12px)`,
    top: `clamp(0px, calc(${100 - y}% - var(--card-h) / 2), calc(100% - var(--card-h)))`,
  };
  const body = (
    <>
      <span className="s-card-art">
        {game.boxArt ? <img src={game.boxArt} alt="" width={300} height={209} decoding="async" /> : <span className="s-noart">{game.title}</span>}
        {clip && game.video ? <video ref={videoRef} src={game.video} loop playsInline muted={mode === 'focus' || !sound.on} /> : null}
      </span>
      <span className="s-card-t">{game.title}</span>
      <span className="s-card-m">{[formatRelease(game.releasedUS, game.datePrecision), publisherName].filter(Boolean).join(' · ')}</span>
      <span className="s-card-s">{axisLabel} <b>{score}</b></span>
      {mode === 'tap' ? <span className="s-card-hint">Tap again to open</span> : null}
    </>
  );
  const className = `s-card${flip ? ' is-left' : ''}`;
  return mode === 'tap' ? (
    <Link href={gamePath(game.slug)} prefetch={false} className={className} style={style} aria-label={`Open ${game.title}`}>{body}</Link>
  ) : (
    <div className={className} style={style} aria-hidden="true">{body}</div>
  );
}
