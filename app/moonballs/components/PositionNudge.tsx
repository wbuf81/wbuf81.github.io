'use client';

import { NUDGE_STEP } from '../constants/printZone';
import type { GolfBallAction } from '../GolfBallClient';

interface PositionNudgeProps {
  element: 'logo' | 'text';
  azimuth: number;
  elevation: number;
  defaultAzimuth: number;
  defaultElevation: number;
  dispatch: React.Dispatch<GolfBallAction>;
}

export default function PositionNudge({
  element,
  azimuth,
  elevation,
  defaultAzimuth,
  defaultElevation,
  dispatch,
}: PositionNudgeProps) {
  const azAction = element === 'logo' ? 'SET_LOGO_AZIMUTH' : 'SET_TEXT_AZIMUTH';
  const elAction = element === 'logo' ? 'SET_LOGO_ELEVATION' : 'SET_TEXT_ELEVATION';

  const nudge = (dAz: number, dEl: number) => {
    if (dAz !== 0) dispatch({ type: azAction, azimuth: azimuth + dAz } as GolfBallAction);
    if (dEl !== 0) dispatch({ type: elAction, elevation: elevation + dEl } as GolfBallAction);
  };

  const reset = () => {
    dispatch({ type: azAction, azimuth: defaultAzimuth } as GolfBallAction);
    dispatch({ type: elAction, elevation: defaultElevation } as GolfBallAction);
  };

  return (
    <div className="nudge-wrap">
      <span className="nudge-label">Position</span>
      <div className="nudge-grid">
        <div className="nudge-row">
          <span className="nudge-spacer" />
          <button className="nudge-btn" onClick={() => nudge(0, NUDGE_STEP)} title="Move up">
            <svg width="14" height="14" viewBox="0 0 14 14"><path d="M7 3L12 9H2Z" fill="currentColor"/></svg>
          </button>
          <span className="nudge-spacer" />
        </div>
        <div className="nudge-row">
          <button className="nudge-btn" onClick={() => nudge(-NUDGE_STEP, 0)} title="Move left">
            <svg width="14" height="14" viewBox="0 0 14 14"><path d="M3 7L9 2V12Z" fill="currentColor"/></svg>
          </button>
          <button className="nudge-btn center" onClick={reset} title="Reset position">
            <svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="3" fill="currentColor"/></svg>
          </button>
          <button className="nudge-btn" onClick={() => nudge(NUDGE_STEP, 0)} title="Move right">
            <svg width="14" height="14" viewBox="0 0 14 14"><path d="M11 7L5 2V12Z" fill="currentColor"/></svg>
          </button>
        </div>
        <div className="nudge-row">
          <span className="nudge-spacer" />
          <button className="nudge-btn" onClick={() => nudge(0, -NUDGE_STEP)} title="Move down">
            <svg width="14" height="14" viewBox="0 0 14 14"><path d="M7 11L2 5H12Z" fill="currentColor"/></svg>
          </button>
          <span className="nudge-spacer" />
        </div>
      </div>
      <span className="nudge-hint">Drag on ball or use arrows</span>

      <style jsx>{`
        .nudge-wrap {
          margin-top: 14px;
        }
        .nudge-label {
          font-family: var(--font-outfit), sans-serif;
          font-size: 0.75rem;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: rgba(0, 0, 0, 0.35);
          display: block;
          margin-bottom: 8px;
        }
        .nudge-grid {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 3px;
        }
        .nudge-row {
          display: flex;
          gap: 3px;
          align-items: center;
        }
        .nudge-spacer {
          width: 32px;
          height: 32px;
        }
        .nudge-btn {
          width: 32px;
          height: 32px;
          border: 1px solid rgba(0, 0, 0, 0.1);
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.6);
          color: rgba(0, 0, 0, 0.45);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s;
          padding: 0;
        }
        .nudge-btn:hover {
          background: rgba(255, 255, 255, 0.9);
          color: rgba(0, 0, 0, 0.7);
          border-color: rgba(0, 0, 0, 0.2);
        }
        .nudge-btn:active {
          transform: scale(0.92);
        }
        .nudge-btn.center {
          border-radius: 50%;
        }
        .nudge-hint {
          display: block;
          margin-top: 6px;
          font-family: var(--font-outfit), sans-serif;
          font-size: 0.65rem;
          color: rgba(0, 0, 0, 0.3);
          text-align: center;
        }
        @media (max-width: 768px) {
          .nudge-btn {
            width: 40px;
            height: 40px;
          }
          .nudge-spacer {
            width: 40px;
            height: 40px;
          }
        }
      `}</style>
    </div>
  );
}
