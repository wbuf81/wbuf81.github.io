'use client';

import { useRef, useState } from 'react';
import type { Game } from '@/lib/snes/types';

type Mode = 'cover' | 'box3d' | 'clip';

// The game page's screen: the cover under light scanlines, the 3D box render, or the gameplay clip with sound
// (the click on ▶ is the interaction browsers need before they allow audio).
export default function MediaFrame({ game }: { game: Game }) {
  const [mode, setMode] = useState<Mode>('cover');
  const video = useRef<HTMLVideoElement>(null);
  const modes: [Mode, string][] = [['cover', 'Cover'], ...(game.media.box3d ? [['box3d', '3D box'] as [Mode, string]] : []), ...(game.media.video ? [['clip', 'Gameplay'] as [Mode, string]] : [])];

  const play = () => {
    setMode('clip');
    requestAnimationFrame(() => {
      const v = video.current;
      if (!v) return;
      v.muted = false;
      v.play().catch(() => {});
    });
  };
  const choose = (m: Mode) => {
    if (m !== 'clip') video.current?.pause();
    setMode(m);
  };

  return (
    <div>
      <div className={`s-frame${mode === 'box3d' ? '' : ' is-crt'}`}>
        {mode === 'cover' ? (
          game.boxArt ? <img src={game.boxArt} alt={`${game.title} box art`} width={300} height={209} /> : <span className="s-noart">{game.title}</span>
        ) : null}
        {mode === 'box3d' ? <img className="s-box3d" src={`/snes/box3d/${game.slug}.webp`} alt={`${game.title} box, 3D`} width={300} height={209} /> : null}
        {game.media.video ? (
          <video
            ref={(el) => {
              video.current = el;
              if (el && mode === 'clip') {
                el.muted = false;
                el.play().catch(() => {});
              }
            }}
            src={`/snes/video/${game.slug}.mp4`}
            poster={game.boxArt ?? undefined}
            controls
            playsInline
            preload="none"
            hidden={mode !== 'clip'}
          />
        ) : null}
        {mode === 'cover' && game.media.video ? (
          <button type="button" className="s-play" aria-label="Play gameplay with sound" onClick={play}>
            <span aria-hidden="true">▶</span>
          </button>
        ) : null}
      </div>
      {modes.length > 1 ? (
        <div className="s-seg" role="group" aria-label="Show">
          {modes.map(([m, label]) => (
            <button key={m} type="button" aria-pressed={mode === m} onClick={() => (m === 'clip' ? play() : choose(m))}>{label}</button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
