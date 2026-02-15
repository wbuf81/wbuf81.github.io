'use client';

import type { GolfBallAction } from '../GolfBallClient';

interface TextCustomizerProps {
  textLine1: string;
  textLine2: string;
  textColor: string;
  textLine1OffsetY: number;
  textLine2OffsetY: number;
  dispatch: React.Dispatch<GolfBallAction>;
}

const TEXT_COLORS = [
  { id: 'black', color: '#000000', label: 'Black' },
  { id: 'white', color: '#ffffff', label: 'White' },
  { id: 'navy', color: '#1e3a5f', label: 'Navy' },
  { id: 'red', color: '#dc2626', label: 'Red' },
  { id: 'green', color: '#16a34a', label: 'Green' },
  { id: 'gold', color: '#ca8a04', label: 'Gold' },
];

export default function TextCustomizer({ textLine1, textLine2, textColor, textLine1OffsetY, textLine2OffsetY, dispatch }: TextCustomizerProps) {
  return (
    <div className="text-customizer">
      <div className="field">
        <label>Name / Line 1</label>
        <input
          type="text"
          inputMode="text"
          enterKeyHint="done"
          value={textLine1}
          onChange={(e) => {
            dispatch({ type: 'SET_TEXT_LINE1', text: e.target.value });
            if (e.target.value && !textLine1) {
              dispatch({ type: 'ENTER_DESIGN_MODE' });
            }
          }}
          placeholder="Your name"
          maxLength={20}
        />
      </div>
      <div className="field">
        <label>Message / Line 2</label>
        <input
          type="text"
          inputMode="text"
          enterKeyHint="done"
          value={textLine2}
          onChange={(e) => {
            dispatch({ type: 'SET_TEXT_LINE2', text: e.target.value });
            if (e.target.value && !textLine2) {
              dispatch({ type: 'ENTER_DESIGN_MODE' });
            }
          }}
          placeholder="Custom message"
          maxLength={24}
        />
      </div>
      <div className="field">
        <label>Text Color</label>
        <div className="color-row">
          {TEXT_COLORS.map((c) => (
            <button
              key={c.id}
              className={`color-swatch ${textColor === c.color ? 'selected' : ''}`}
              style={{ background: c.color }}
              onClick={() => dispatch({ type: 'SET_TEXT_COLOR', color: c.color })}
              title={c.label}
            />
          ))}
        </div>
      </div>
      {textLine1 && (
        <div className="field">
          <label>Line 1 Position</label>
          <div className="slider-row">
            <span className="slider-label">Top</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={textLine1OffsetY}
              onChange={(e) => dispatch({ type: 'SET_TEXT_LINE1_OFFSET_Y', offset: parseFloat(e.target.value) })}
            />
            <span className="slider-label">Bottom</span>
          </div>
        </div>
      )}
      {textLine2 && (
        <div className="field">
          <label>Line 2 Position</label>
          <div className="slider-row">
            <span className="slider-label">Top</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={textLine2OffsetY}
              onChange={(e) => dispatch({ type: 'SET_TEXT_LINE2_OFFSET_Y', offset: parseFloat(e.target.value) })}
            />
            <span className="slider-label">Bottom</span>
          </div>
        </div>
      )}

      <style jsx>{`
        .text-customizer {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .field label {
          display: block;
          font-size: 0.75rem;
          color: rgba(0, 0, 0, 0.35);
          margin-bottom: 6px;
          font-family: var(--font-outfit), sans-serif;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          font-weight: 500;
        }
        .field input {
          width: 100%;
          padding: 10px 12px;
          background: rgba(255, 255, 255, 0.5);
          border: 1px solid rgba(0, 0, 0, 0.1);
          border-radius: 10px;
          color: #1e293b;
          font-family: var(--font-outfit), sans-serif;
          font-size: 0.9rem;
          outline: none;
          transition: border-color 0.2s;
        }
        .field input:focus {
          border-color: rgba(99, 102, 241, 0.5);
        }
        .field input::placeholder {
          color: rgba(0, 0, 0, 0.25);
        }
        .color-row {
          display: flex;
          gap: 8px;
        }
        .color-swatch {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: 2px solid rgba(0, 0, 0, 0.1);
          cursor: pointer;
          transition: border-color 0.2s, transform 0.15s;
        }
        .color-swatch:hover {
          transform: scale(1.1);
        }
        .color-swatch.selected {
          border-color: #6366f1;
          box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.4);
        }
        @media (max-width: 768px) {
          .color-swatch {
            width: 40px;
            height: 40px;
          }
          .color-row {
            gap: 10px;
          }
          .slider-row input[type="range"] {
            height: 44px;
            padding: 16px 0;
          }
          .slider-row input[type="range"]::-webkit-slider-track {
            height: 8px;
            border-radius: 4px;
          }
          .slider-row input[type="range"]::-moz-range-track {
            height: 8px;
            border-radius: 4px;
          }
          .slider-row input[type="range"]::-webkit-slider-thumb {
            width: 28px;
            height: 28px;
            margin-top: -10px;
          }
          .slider-row input[type="range"]::-moz-range-thumb {
            width: 28px;
            height: 28px;
          }
        }
        .slider-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .slider-label {
          font-size: 0.7rem;
          color: rgba(0, 0, 0, 0.35);
          font-family: var(--font-outfit), sans-serif;
        }
        .slider-row input[type="range"] {
          flex: 1;
          accent-color: #6366f1;
          height: 6px;
          -webkit-appearance: none;
          appearance: none;
          background: transparent;
          cursor: pointer;
        }
        .slider-row input[type="range"]::-webkit-slider-track {
          height: 6px;
          border-radius: 3px;
          background: rgba(0, 0, 0, 0.18);
        }
        .slider-row input[type="range"]::-moz-range-track {
          height: 6px;
          border-radius: 3px;
          background: rgba(0, 0, 0, 0.18);
          border: none;
        }
        .slider-row input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #6366f1;
          border: 2px solid white;
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
          margin-top: -7px;
        }
        .slider-row input[type="range"]::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #6366f1;
          border: 2px solid white;
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
        }
      `}</style>
    </div>
  );
}
