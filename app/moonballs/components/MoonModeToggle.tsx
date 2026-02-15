'use client';

import type { GolfBallState, GolfBallAction } from '../GolfBallClient';

interface MoonModeToggleProps {
  state: GolfBallState;
  dispatch: React.Dispatch<GolfBallAction>;
}

export default function MoonModeToggle({ state, dispatch }: MoonModeToggleProps) {
  return (
    <>
      <button
        className="moon-toggle"
        onClick={() => dispatch({ type: 'TOGGLE_MOON_MODE' })}
        title={state.moonMode ? 'Switch to studio lighting' : 'Switch to moon mode'}
      >
        {state.moonMode ? '☀️' : '🌙'}
      </button>

      <style jsx>{`
        .moon-toggle {
          position: absolute;
          top: max(20px, env(safe-area-inset-top));
          right: max(20px, env(safe-area-inset-right));
          z-index: 10;
          pointer-events: auto;
          padding: 8px 16px;
          background: rgba(0, 0, 0, 0.5);
          border: none;
          border-radius: 20px;
          backdrop-filter: blur(8px);
          cursor: pointer;
          font-size: 1.2rem;
          line-height: 1;
          transition: background 0.2s;
          min-width: 44px;
          min-height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .moon-toggle:hover {
          background: rgba(99, 102, 241, 0.3);
        }
      `}</style>
    </>
  );
}
