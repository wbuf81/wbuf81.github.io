'use client';

import { useState } from 'react';
import LogoPicker from './LogoPicker';
import TextCustomizer from './TextCustomizer';
import type { GolfBallState, GolfBallAction, Tab } from '../GolfBallClient';

interface ControlsPanelProps {
  state: GolfBallState;
  dispatch: React.Dispatch<GolfBallAction>;
  onLogoUpload: (file: File) => void;
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
}

const BALL_COLORS = [
  { id: 'white', color: '#ffffff', label: 'White' },
  { id: 'yellow', color: '#fde047', label: 'Yellow' },
  { id: 'orange', color: '#fb923c', label: 'Orange' },
  { id: 'pink', color: '#f9a8d4', label: 'Pink' },
  { id: 'green', color: '#86efac', label: 'Green' },
  { id: 'blue', color: '#93c5fd', label: 'Blue' },
];

const TAB_CONFIG: { key: Tab; label: string }[] = [
  { key: 'logo', label: 'Logo' },
  { key: 'text', label: 'Text' },
  { key: 'color', label: 'Color' },
];

export default function ControlsPanel({ state, dispatch, onLogoUpload, activeTab, setActiveTab }: ControlsPanelProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const hasText = !!(state.textLine1 || state.textLine2);

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    if (tab === 'color') {
      dispatch({ type: 'EXIT_DESIGN_MODE' });
    } else if (tab === 'logo' && state.logoUrl) {
      dispatch({ type: 'ENTER_DESIGN_MODE' });
    } else if (tab === 'text' && (state.textLine1 || state.textLine2)) {
      dispatch({ type: 'ENTER_DESIGN_MODE' });
    }
  };

  return (
    <>
      {/* Mobile toggle */}
      <button
        className="mobile-toggle"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? 'Close' : 'Customize'}
      </button>

      <div className={`controls-panel ${mobileOpen ? 'open' : ''}`}>
        {/* Segmented control */}
        <div className="seg-track">
          {TAB_CONFIG.map((tab) => (
            <button
              key={tab.key}
              className={`seg-btn ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => handleTabChange(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="tab-content">
          {activeTab === 'logo' && (
            <div className="section">
              <LogoPicker selectedLogo={state.logoUrl} dispatch={dispatch} />
              {state.logoUrl && (
                <div className="slider-group">
                  <label>
                    <span className="slider-label">Size</span>
                    <input
                      type="range"
                      min={0.15}
                      max={1}
                      step={0.05}
                      value={state.logoScale}
                      onChange={(e) =>
                        dispatch({ type: 'SET_LOGO_SCALE', scale: parseFloat(e.target.value) })
                      }
                    />
                  </label>
                </div>
              )}
            </div>
          )}

          {activeTab === 'text' && (
            <div className="section">
              <TextCustomizer
                textLine1={state.textLine1}
                textLine2={state.textLine2}
                textColor={state.textColor}
                textLine1OffsetY={state.textLine1OffsetY}
                textLine2OffsetY={state.textLine2OffsetY}
                dispatch={dispatch}
              />
              {hasText && (
                <div className="align-wrap">
                  <span className="align-label">Alignment</span>
                  <div className="align-btns">
                    {(['left', 'center', 'right'] as const).map((a) => (
                      <button
                        key={a}
                        className={`align-btn ${state.textAlign === a ? 'active' : ''}`}
                        onClick={() => dispatch({ type: 'SET_TEXT_ALIGN', align: a })}
                        title={`Align ${a}`}
                      >
                        {a === 'left' && (
                          <svg width="16" height="16" viewBox="0 0 16 16"><path d="M2 3h12M2 7h8M2 11h10M2 15h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                        )}
                        {a === 'center' && (
                          <svg width="16" height="16" viewBox="0 0 16 16"><path d="M2 3h12M4 7h8M3 11h10M5 15h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                        )}
                        {a === 'right' && (
                          <svg width="16" height="16" viewBox="0 0 16 16"><path d="M2 3h12M6 7h8M4 11h10M8 15h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'color' && (
            <div className="section">
              <div className="ball-colors">
                {BALL_COLORS.map((c) => (
                  <button
                    key={c.id}
                    className={`ball-color-swatch ${state.ballColor === c.color ? 'selected' : ''}`}
                    style={{ background: c.color }}
                    onClick={() => dispatch({ type: 'SET_BALL_COLOR', color: c.color })}
                    title={c.label}
                  >
                    <span className="swatch-label">{c.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="panel-footer">
          <button
            className="tee-btn"
            onClick={() => dispatch({ type: 'SET_TEE_MODE', active: true })}
          >
            Tee It Up
          </button>
          <button
            className="reset-btn"
            onClick={() => dispatch({ type: 'RESET' })}
          >
            Reset
          </button>
        </div>
      </div>

      <style jsx>{`
        .mobile-toggle {
          display: none;
          position: fixed;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 20;
          padding: 12px 32px;
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          color: #1e293b;
          border: 1px solid rgba(255, 255, 255, 0.5);
          border-radius: 24px;
          font-family: var(--font-outfit), sans-serif;
          font-size: 0.95rem;
          font-weight: 600;
          cursor: pointer;
        }
        .controls-panel {
          width: 300px;
          background: rgba(255, 255, 255, 0.55);
          backdrop-filter: blur(40px);
          -webkit-backdrop-filter: blur(40px);
          border-left: 1px solid rgba(255, 255, 255, 0.5);
          display: flex;
          flex-direction: column;
          overflow-y: auto;
          flex-shrink: 0;
        }

        /* Segmented control */
        .seg-track {
          display: flex;
          margin: 16px 16px 0;
          padding: 3px;
          background: rgba(0, 0, 0, 0.06);
          border-radius: 10px;
          gap: 2px;
        }
        .seg-btn {
          flex: 1;
          padding: 8px 0;
          border: none;
          border-radius: 8px;
          background: transparent;
          color: rgba(0, 0, 0, 0.4);
          font-family: var(--font-outfit), sans-serif;
          font-size: 0.82rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .seg-btn:hover {
          color: rgba(0, 0, 0, 0.6);
        }
        .seg-btn.active {
          background: rgba(255, 255, 255, 0.8);
          color: #1e293b;
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
        }

        .tab-content {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
        }
        .section h3 {
          font-family: var(--font-outfit), sans-serif;
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: rgba(0, 0, 0, 0.35);
          margin: 0 0 12px;
        }

        /* Size slider */
        .slider-group {
          margin-top: 16px;
        }
        .slider-group label {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .slider-label {
          font-family: var(--font-outfit), sans-serif;
          font-size: 0.75rem;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: rgba(0, 0, 0, 0.35);
        }
        .slider-group input[type='range'] {
          width: 100%;
          accent-color: #6366f1;
          height: 4px;
        }

        /* Text alignment */
        .align-wrap {
          margin-top: 14px;
        }
        .align-label {
          font-family: var(--font-outfit), sans-serif;
          font-size: 0.75rem;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: rgba(0, 0, 0, 0.35);
          display: block;
          margin-bottom: 8px;
        }
        .align-btns {
          display: flex;
          gap: 4px;
        }
        .align-btn {
          flex: 1;
          padding: 8px 0;
          border: 1px solid rgba(0, 0, 0, 0.1);
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.6);
          color: rgba(0, 0, 0, 0.45);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s;
        }
        .align-btn:hover {
          background: rgba(255, 255, 255, 0.9);
          color: rgba(0, 0, 0, 0.7);
          border-color: rgba(0, 0, 0, 0.2);
        }
        .align-btn.active {
          background: rgba(99, 102, 241, 0.1);
          border-color: #6366f1;
          color: #6366f1;
        }

        /* Ball color swatches */
        .ball-colors {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
        }
        .ball-color-swatch {
          aspect-ratio: 1;
          border: 2px solid rgba(0, 0, 0, 0.08);
          border-radius: 14px;
          cursor: pointer;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          padding-bottom: 8px;
          transition: border-color 0.2s, transform 0.15s;
        }
        .ball-color-swatch:hover {
          transform: scale(1.05);
          border-color: rgba(0, 0, 0, 0.2);
        }
        .ball-color-swatch.selected {
          border-color: #6366f1;
          box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.4);
        }
        .swatch-label {
          font-family: var(--font-outfit), sans-serif;
          font-size: 0.65rem;
          color: rgba(0, 0, 0, 0.4);
          font-weight: 600;
        }

        /* Footer actions */
        .panel-footer {
          padding: 12px 16px 16px;
          display: flex;
          gap: 8px;
          border-top: 1px solid rgba(0, 0, 0, 0.06);
        }
        .tee-btn {
          flex: 1;
          padding: 12px 0;
          background: linear-gradient(135deg, #6366f1, #4f46e5);
          color: white;
          border: none;
          border-radius: 12px;
          font-family: var(--font-outfit), sans-serif;
          font-size: 0.9rem;
          font-weight: 700;
          cursor: pointer;
          letter-spacing: 0.03em;
          transition: transform 0.15s, box-shadow 0.15s;
          box-shadow: 0 2px 12px rgba(99, 102, 241, 0.35);
        }
        .tee-btn:hover {
          transform: scale(1.02);
          box-shadow: 0 4px 20px rgba(99, 102, 241, 0.5);
        }
        .reset-btn {
          padding: 12px 16px;
          background: rgba(0, 0, 0, 0.05);
          border: 1px solid rgba(0, 0, 0, 0.1);
          border-radius: 12px;
          color: rgba(0, 0, 0, 0.4);
          font-family: var(--font-outfit), sans-serif;
          font-size: 0.82rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        .reset-btn:hover {
          background: rgba(239, 68, 68, 0.08);
          border-color: rgba(239, 68, 68, 0.3);
          color: #dc2626;
        }

        @media (max-width: 768px) {
          .mobile-toggle {
            display: block;
          }
          .controls-panel {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            width: 100%;
            height: 55vh;
            border-left: none;
            border-top: 1px solid rgba(255, 255, 255, 0.5);
            border-radius: 20px 20px 0 0;
            transform: translateY(100%);
            transition: transform 0.3s ease;
            z-index: 15;
          }
          .controls-panel.open {
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  );
}
