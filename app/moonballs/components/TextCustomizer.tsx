'use client';

import { useState } from 'react';
import type { GolfBallAction } from '../GolfBallClient';

interface TextCustomizerProps {
  textLine1: string;
  textLine2: string;
  textLine1Color: string;
  textLine2Color: string;
  textLine1Font: string;
  textLine2Font: string;
  textLine1Size: number;
  textLine2Size: number;
  textLine1Bold: boolean;
  textLine2Bold: boolean;
  textLine1Italic: boolean;
  textLine2Italic: boolean;
  textLine1OffsetY: number;
  textLine2OffsetY: number;
  dispatch: React.Dispatch<GolfBallAction>;
}

const LINE1_MAX = 20;
const LINE2_MAX = 24;

function counterWarn(len: number, max: number): string {
  if (len >= max) return 'red';
  if (len > max * 0.8) return 'amber';
  return '';
}

const TEXT_COLORS = [
  { id: 'black', color: '#000000', label: 'Black' },
  { id: 'white', color: '#ffffff', label: 'White' },
  { id: 'navy', color: '#1e3a5f', label: 'Navy' },
  { id: 'red', color: '#dc2626', label: 'Red' },
  { id: 'green', color: '#16a34a', label: 'Green' },
  { id: 'gold', color: '#ca8a04', label: 'Gold' },
];

const FONTS = [
  { id: 'Outfit', label: 'Outfit' },
  { id: 'Georgia', label: 'Georgia' },
  { id: 'Courier New', label: 'Courier' },
];

export default function TextCustomizer({
  textLine1, textLine2,
  textLine1Color, textLine2Color,
  textLine1Font, textLine2Font,
  textLine1Size, textLine2Size,
  textLine1Bold, textLine2Bold,
  textLine1Italic, textLine2Italic,
  textLine1OffsetY, textLine2OffsetY,
  dispatch,
}: TextCustomizerProps) {
  const [line1StyleOpen, setLine1StyleOpen] = useState(false);
  const [line2StyleOpen, setLine2StyleOpen] = useState(false);

  return (
    <div className="text-customizer">
      {/* LINE 1 */}
      <div className="line-section">
        <span className="line-heading">Line 1</span>
        <div className="field">
          <div className="input-wrap">
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
              maxLength={LINE1_MAX}
            />
            <span className="char-counter" data-warn={counterWarn(textLine1.length, LINE1_MAX)}>
              {textLine1.length}/{LINE1_MAX}
            </span>
          </div>
        </div>
        {textLine1 && (
          <>
            <button
              className="style-toggle"
              onClick={() => setLine1StyleOpen(!line1StyleOpen)}
            >
              Style {line1StyleOpen ? '\u25B4' : '\u25BE'}
            </button>
            <div className={`line-controls-collapse ${line1StyleOpen ? 'open' : ''}`}>
              <div className="line-controls">
                <div className="font-row">
                  <div className="font-btns">
                    {FONTS.map((f) => (
                      <button
                        key={f.id}
                        className={`font-btn ${textLine1Font === f.id ? 'active' : ''}`}
                        style={{ fontFamily: `${f.id}, sans-serif` }}
                        onClick={() => dispatch({ type: 'SET_TEXT_LINE1_FONT', font: f.id })}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                  <div className="style-btns">
                    <button
                      className={`style-btn ${textLine1Bold ? 'active' : ''}`}
                      onClick={() => dispatch({ type: 'TOGGLE_TEXT_LINE1_BOLD' })}
                      title="Bold"
                    >
                      <strong>B</strong>
                    </button>
                    <button
                      className={`style-btn ${textLine1Italic ? 'active' : ''}`}
                      onClick={() => dispatch({ type: 'TOGGLE_TEXT_LINE1_ITALIC' })}
                      title="Italic"
                    >
                      <em>I</em>
                    </button>
                  </div>
                </div>
                <div className="slider-row">
                  <span className="slider-label">Size</span>
                  <input
                    type="range"
                    min={20}
                    max={60}
                    step={1}
                    value={textLine1Size}
                    onChange={(e) => dispatch({ type: 'SET_TEXT_LINE1_SIZE', size: parseInt(e.target.value) })}
                  />
                </div>
                <div className="color-row">
                  {TEXT_COLORS.map((c) => (
                    <button
                      key={c.id}
                      className={`color-swatch ${textLine1Color === c.color ? 'selected' : ''}`}
                      style={{ background: c.color }}
                      onClick={() => dispatch({ type: 'SET_TEXT_LINE1_COLOR', color: c.color })}
                      title={c.label}
                    />
                  ))}
                </div>
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
            </div>
          </>
        )}
      </div>

      {/* LINE 2 */}
      <div className="line-section">
        <span className="line-heading">Line 2</span>
        <div className="field">
          <div className="input-wrap">
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
              maxLength={LINE2_MAX}
            />
            <span className="char-counter" data-warn={counterWarn(textLine2.length, LINE2_MAX)}>
              {textLine2.length}/{LINE2_MAX}
            </span>
          </div>
        </div>
        {textLine2 && (
          <>
            <button
              className="style-toggle"
              onClick={() => setLine2StyleOpen(!line2StyleOpen)}
            >
              Style {line2StyleOpen ? '\u25B4' : '\u25BE'}
            </button>
            <div className={`line-controls-collapse ${line2StyleOpen ? 'open' : ''}`}>
              <div className="line-controls">
                <div className="font-row">
                  <div className="font-btns">
                    {FONTS.map((f) => (
                      <button
                        key={f.id}
                        className={`font-btn ${textLine2Font === f.id ? 'active' : ''}`}
                        style={{ fontFamily: `${f.id}, sans-serif` }}
                        onClick={() => dispatch({ type: 'SET_TEXT_LINE2_FONT', font: f.id })}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                  <div className="style-btns">
                    <button
                      className={`style-btn ${textLine2Bold ? 'active' : ''}`}
                      onClick={() => dispatch({ type: 'TOGGLE_TEXT_LINE2_BOLD' })}
                      title="Bold"
                    >
                      <strong>B</strong>
                    </button>
                    <button
                      className={`style-btn ${textLine2Italic ? 'active' : ''}`}
                      onClick={() => dispatch({ type: 'TOGGLE_TEXT_LINE2_ITALIC' })}
                      title="Italic"
                    >
                      <em>I</em>
                    </button>
                  </div>
                </div>
                <div className="slider-row">
                  <span className="slider-label">Size</span>
                  <input
                    type="range"
                    min={20}
                    max={60}
                    step={1}
                    value={textLine2Size}
                    onChange={(e) => dispatch({ type: 'SET_TEXT_LINE2_SIZE', size: parseInt(e.target.value) })}
                  />
                </div>
                <div className="color-row">
                  {TEXT_COLORS.map((c) => (
                    <button
                      key={c.id}
                      className={`color-swatch ${textLine2Color === c.color ? 'selected' : ''}`}
                      style={{ background: c.color }}
                      onClick={() => dispatch({ type: 'SET_TEXT_LINE2_COLOR', color: c.color })}
                      title={c.label}
                    />
                  ))}
                </div>
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
            </div>
          </>
        )}
      </div>

      <style jsx>{`
        .text-customizer {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .line-section {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .line-heading {
          font-family: var(--font-outfit), sans-serif;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: rgba(0, 0, 0, 0.35);
        }
        .field .input-wrap {
          position: relative;
        }
        .field input {
          width: 100%;
          padding: 10px 12px;
          padding-right: 48px;
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
        .char-counter {
          position: absolute;
          right: 10px;
          top: 50%;
          transform: translateY(-50%);
          font-family: var(--font-outfit), sans-serif;
          font-size: 0.65rem;
          font-weight: 500;
          color: rgba(0, 0, 0, 0.25);
          pointer-events: none;
          transition: color 0.15s;
        }
        .char-counter[data-warn='amber'] {
          color: #d97706;
        }
        .char-counter[data-warn='red'] {
          color: #dc2626;
          font-weight: 600;
        }
        .style-toggle {
          display: none;
        }
        .line-controls-collapse {
          display: contents;
        }
        .line-controls {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .font-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .font-btns {
          display: flex;
          gap: 4px;
          flex: 1;
        }
        .font-btn {
          flex: 1;
          padding: 6px 4px;
          border: 1px solid rgba(0, 0, 0, 0.1);
          border-radius: 6px;
          background: rgba(255, 255, 255, 0.6);
          color: rgba(0, 0, 0, 0.5);
          font-size: 0.72rem;
          cursor: pointer;
          transition: all 0.15s;
          white-space: nowrap;
        }
        .font-btn:hover {
          background: rgba(255, 255, 255, 0.9);
          color: rgba(0, 0, 0, 0.7);
        }
        .font-btn.active {
          background: rgba(99, 102, 241, 0.1);
          border-color: #6366f1;
          color: #6366f1;
        }
        .style-btns {
          display: flex;
          gap: 4px;
        }
        .style-btn {
          width: 32px;
          height: 32px;
          border: 1px solid rgba(0, 0, 0, 0.1);
          border-radius: 6px;
          background: rgba(255, 255, 255, 0.6);
          color: rgba(0, 0, 0, 0.5);
          font-family: var(--font-outfit), sans-serif;
          font-size: 0.82rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s;
        }
        .style-btn:hover {
          background: rgba(255, 255, 255, 0.9);
          color: rgba(0, 0, 0, 0.7);
        }
        .style-btn.active {
          background: rgba(99, 102, 241, 0.1);
          border-color: #6366f1;
          color: #6366f1;
        }
        .color-row {
          display: flex;
          gap: 8px;
        }
        .color-swatch {
          width: 28px;
          height: 28px;
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
          height: 8px;
          -webkit-appearance: none;
          appearance: none;
          background: transparent;
          border-radius: 4px;
          cursor: pointer;
          outline: none;
        }
        .slider-row input[type="range"]::-webkit-slider-runnable-track {
          height: 8px;
          border-radius: 4px;
          background: rgba(0, 0, 0, 0.12);
        }
        .slider-row input[type="range"]::-moz-range-track {
          height: 8px;
          border-radius: 4px;
          background: rgba(0, 0, 0, 0.12);
          border: none;
        }
        .slider-row input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: #6366f1;
          border: 2.5px solid white;
          box-shadow: 0 1px 6px rgba(0, 0, 0, 0.25);
          margin-top: -7px;
        }
        .slider-row input[type="range"]::-moz-range-thumb {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: #6366f1;
          border: 2.5px solid white;
          box-shadow: 0 1px 6px rgba(0, 0, 0, 0.25);
        }
        @media (max-width: 768px) {
          .text-customizer {
            gap: 14px;
          }
          .line-controls {
            gap: 8px;
          }
          .style-toggle {
            display: block;
            align-self: flex-start;
            padding: 6px 12px;
            border: 1px solid rgba(0, 0, 0, 0.1);
            border-radius: 8px;
            background: rgba(255, 255, 255, 0.6);
            color: rgba(0, 0, 0, 0.45);
            font-family: var(--font-outfit), sans-serif;
            font-size: 0.75rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.15s;
          }
          .style-toggle:hover {
            background: rgba(255, 255, 255, 0.9);
            color: rgba(0, 0, 0, 0.65);
          }
          .line-controls-collapse {
            display: block;
            max-height: 0;
            overflow: hidden;
            transition: max-height 0.25s ease;
          }
          .line-controls-collapse.open {
            max-height: 300px;
          }
          .color-swatch {
            width: 36px;
            height: 36px;
          }
          .color-row {
            gap: 10px;
          }
          .style-btn {
            width: 40px;
            height: 40px;
            min-height: 44px;
          }
          .font-btn {
            min-height: 40px;
            font-size: 0.78rem;
          }
          .slider-row input[type="range"] {
            height: 10px;
            border-radius: 5px;
            padding: 0;
            min-height: 44px;
          }
          .slider-row input[type="range"]::-webkit-slider-runnable-track {
            height: 10px;
            border-radius: 5px;
          }
          .slider-row input[type="range"]::-moz-range-track {
            height: 10px;
            border-radius: 5px;
          }
          .slider-row input[type="range"]::-webkit-slider-thumb {
            width: 30px;
            height: 30px;
            margin-top: -10px;
          }
          .slider-row input[type="range"]::-moz-range-thumb {
            width: 30px;
            height: 30px;
          }
        }
      `}</style>
    </div>
  );
}
