'use client';

import { useState } from 'react';
import type { GolfBallAction } from '../GolfBallClient';

interface LogoPickerProps {
  selectedLogo: string | null;
  dispatch: React.Dispatch<GolfBallAction>;
}

const PRESET_LOGOS = [
  { id: 'dog', src: '/moonballs/logos/dog.png', label: 'Dog' },
  { id: 'moon', src: '/moonballs/logos/moon.png', label: 'Moon' },
  { id: 'bard', src: '/moonballs/logos/bard.png', label: 'Bard' },
  { id: 'gators01', src: '/moonballs/logos/gators01.png', label: 'Gators 1' },
  { id: 'gators02', src: '/moonballs/logos/gators02.png', label: 'Gators 2' },
  { id: 'flag', src: '/moonballs/logos/flag.png', label: 'Flag' },
];

export default function LogoPicker({ selectedLogo, dispatch }: LogoPickerProps) {
  const [expanded, setExpanded] = useState(false);

  const selectedPreset = PRESET_LOGOS.find((l) => l.src === selectedLogo);
  const showCollapsed = selectedLogo && !expanded;

  return (
    <div className="logo-picker">
      {/* Collapsed view: selected logo + Change button */}
      {showCollapsed && (
        <div className="selected-row">
          <div className="selected-thumb">
            {selectedPreset ? (
              <img src={selectedPreset.src} alt={selectedPreset.label} />
            ) : (
              <img src={selectedLogo} alt="Custom logo" />
            )}
          </div>
          <span className="selected-label">
            {selectedPreset ? selectedPreset.label : 'Custom'}
          </span>
          <button className="change-btn" onClick={() => setExpanded(true)}>
            Change
          </button>
          <button
            className="remove-btn"
            onClick={() => dispatch({ type: 'SET_LOGO', url: null })}
            title="Remove logo"
          >
            &times;
          </button>
        </div>
      )}

      {/* Full grid: shown when nothing selected or expanded */}
      {!showCollapsed && (
        <div className="logo-grid">
          {PRESET_LOGOS.map((logo) => (
            <button
              key={logo.id}
              className={`logo-item ${selectedLogo === logo.src ? 'selected' : ''}`}
              onClick={() => {
                if (selectedLogo === logo.src) {
                  dispatch({ type: 'SET_LOGO', url: null });
                } else {
                  dispatch({ type: 'SET_LOGO', url: logo.src });
                  setExpanded(false);
                }
              }}
              title={logo.label}
            >
              <img src={logo.src} alt={logo.label} />
              {selectedLogo === logo.src && <div className="check-badge">&#10003;</div>}
            </button>
          ))}
        </div>
      )}

      <style jsx>{`
        .logo-picker {
          display: flex;
          flex-direction: column;
        }

        /* Collapsed selected row */
        .selected-row {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 10px;
          background: rgba(255, 255, 255, 0.5);
          border: 1px solid rgba(0, 0, 0, 0.08);
          border-radius: 12px;
        }
        .selected-thumb {
          width: 40px;
          height: 40px;
          border-radius: 8px;
          overflow: hidden;
          flex-shrink: 0;
          background: rgba(255, 255, 255, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .selected-thumb img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
        .selected-label {
          flex: 1;
          font-family: var(--font-outfit), sans-serif;
          font-size: 0.85rem;
          font-weight: 600;
          color: #1e293b;
        }
        .change-btn {
          padding: 6px 14px;
          border: 1px solid rgba(99, 102, 241, 0.3);
          border-radius: 8px;
          background: rgba(99, 102, 241, 0.08);
          color: #6366f1;
          font-family: var(--font-outfit), sans-serif;
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
        }
        .change-btn:hover {
          background: rgba(99, 102, 241, 0.15);
        }
        .remove-btn {
          width: 32px;
          height: 32px;
          border: 1px solid rgba(0, 0, 0, 0.1);
          border-radius: 8px;
          background: rgba(0, 0, 0, 0.04);
          color: rgba(0, 0, 0, 0.35);
          font-size: 1.1rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s;
          flex-shrink: 0;
        }
        .remove-btn:hover {
          background: rgba(239, 68, 68, 0.08);
          border-color: rgba(239, 68, 68, 0.3);
          color: #dc2626;
        }

        /* Full grid */
        .logo-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 8px;
          overflow: hidden;
        }
        .logo-item {
          position: relative;
          width: 100%;
          min-width: 0;
          aspect-ratio: 1;
          border: 2px solid rgba(0, 0, 0, 0.08);
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.5);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 10px;
          transition: all 0.2s ease;
          overflow: hidden;
        }
        .logo-item:hover {
          border-color: rgba(99, 102, 241, 0.4);
          background: rgba(255, 255, 255, 0.7);
        }
        .logo-item.selected {
          border-color: #6366f1;
          background: rgba(255, 255, 255, 0.75);
          box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.25);
        }
        .logo-item img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          border-radius: 6px;
        }
        .check-badge {
          position: absolute;
          top: -4px;
          right: -4px;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #6366f1;
          color: white;
          font-size: 11px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        @media (max-width: 768px) {
          .logo-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 6px;
          }
          .logo-item {
            padding: 6px;
            border-radius: 10px;
          }
          .change-btn {
            min-height: 36px;
            padding: 6px 16px;
          }
          .remove-btn {
            width: 36px;
            height: 36px;
          }
        }
      `}</style>
    </div>
  );
}
