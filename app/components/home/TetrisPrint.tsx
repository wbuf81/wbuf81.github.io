'use client';

import { useCallback, useRef, useState } from 'react';
import TetrisBoard, { type TetrisHandle } from './TetrisBoard';
import Print from './Print';

type GameState = { isPlaying: boolean; score: number; lines: number };

// The hero's two prints: Tetris on an arcade print (Play / Stop in its caption, the keys while playing),
// and the headshot print overlapping it.
export default function TetrisPrint() {
  const board = useRef<TetrisHandle>(null);
  const [game, setGame] = useState<GameState>({ isPlaying: false, score: 0, lines: 0 });
  const onStateChange = useCallback((s: GameState) => setGame(s), []);

  return (
    <div className="duo">
      <Print
        className="arcade"
        tilt={-2.2}
        tapes={[{ left: '36%', top: '-10px', width: '84px', angle: '-5deg' }]}
        caption={
          <>
            <span>{game.isPlaying ? 'Arrows · space drops' : 'Tetris'}</span>
            <button type="button" className="btn sm" onClick={() => board.current?.togglePlay()}>
              {game.isPlaying ? (
                <>
                  <svg viewBox="0 0 12 12" aria-hidden="true">
                    <rect x="2" y="2" width="8" height="8" rx="1" />
                  </svg>
                  Stop
                </>
              ) : (
                <>
                  <svg viewBox="0 0 12 12" aria-hidden="true">
                    <path d="M3 1.5v9l7.5-4.5z" />
                  </svg>
                  Play
                </>
              )}
            </button>
          </>
        }
      >
        <div className="screen">
          <div className="board">
            <TetrisBoard ref={board} onStateChange={onStateChange} />
          </div>
          <div className="hud" aria-live="polite">
            <div>
              Score<b>{game.isPlaying ? game.score.toLocaleString('en-US') : '—'}</b>
            </div>
            <div>
              Lines<b>{game.isPlaying ? game.lines : '—'}</b>
            </div>
          </div>
        </div>
      </Print>
      <Print
        className="hs"
        image="/headshot-thumb.jpg"
        alt="Wesley Bard"
        tilt={2.8}
        tapes={[{ left: 'calc(100% - 40px)', top: '-6px', width: '56px', angle: '38deg' }]}
        caption={
          <>
            <span>Wesley Bard</span>
            <span>Newfold Digital</span>
          </>
        }
        eager
      />
    </div>
  );
}
