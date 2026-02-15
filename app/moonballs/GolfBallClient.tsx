'use client';

import { useReducer, useCallback, useState, useEffect } from 'react';
import GolfBallScene from './components/GolfBallScene';
import ControlsPanel from './components/ControlsPanel';
import MoonBallsBranding from './components/MoonBallsBranding';
import MoonModeToggle from './components/MoonModeToggle';
import TeeScene from './components/TeeScene';
import { clampAzimuth, clampElevation } from './constants/printZone';

export type Tab = 'logo' | 'text' | 'color';

export interface GolfBallState {
  ballColor: string;
  logoUrl: string | null;
  logoScale: number;
  logoAzimuth: number;
  logoElevation: number;
  textLine1: string;
  textLine2: string;
  textColor: string;
  textAlign: 'left' | 'center' | 'right';
  textLine1OffsetY: number;
  textLine2OffsetY: number;
  moonMode: boolean;
  teeMode: boolean;
  draggingElement: 'logo' | 'text' | null;
  designMode: boolean;
}

export type GolfBallAction =
  | { type: 'SET_BALL_COLOR'; color: string }
  | { type: 'SET_LOGO'; url: string | null }
  | { type: 'SET_LOGO_SCALE'; scale: number }
  | { type: 'SET_LOGO_AZIMUTH'; azimuth: number }
  | { type: 'SET_LOGO_ELEVATION'; elevation: number }
  | { type: 'SET_TEXT_LINE1'; text: string }
  | { type: 'SET_TEXT_LINE2'; text: string }
  | { type: 'SET_TEXT_COLOR'; color: string }
  | { type: 'SET_TEXT_ALIGN'; align: 'left' | 'center' | 'right' }
  | { type: 'SET_TEXT_LINE1_OFFSET_Y'; offset: number }
  | { type: 'SET_TEXT_LINE2_OFFSET_Y'; offset: number }
  | { type: 'TOGGLE_MOON_MODE' }
  | { type: 'SET_TEE_MODE'; active: boolean }
  | { type: 'SET_DRAGGING'; element: 'logo' | 'text' | null }
  | { type: 'ENTER_DESIGN_MODE' }
  | { type: 'EXIT_DESIGN_MODE' }
  | { type: 'RESET' }
  | { type: 'UNDO' };

export const DEFAULT_LOGO_AZIMUTH = Math.PI / 2;
export const DEFAULT_LOGO_ELEVATION = 0;

const initialState: GolfBallState = {
  ballColor: '#ffffff',
  logoUrl: null,
  logoScale: 0.5,
  logoAzimuth: DEFAULT_LOGO_AZIMUTH,
  logoElevation: DEFAULT_LOGO_ELEVATION,
  textLine1: '',
  textLine2: '',
  textColor: '#000000',
  textAlign: 'center',
  textLine1OffsetY: 0.15,
  textLine2OffsetY: 0.85,
  moonMode: false,
  teeMode: false,
  draggingElement: null,
  designMode: false,
};

function reducer(state: GolfBallState, action: GolfBallAction): GolfBallState {
  switch (action.type) {
    case 'SET_BALL_COLOR':
      return { ...state, ballColor: action.color };
    case 'SET_LOGO':
      return { ...state, logoUrl: action.url, designMode: action.url ? true : state.designMode };
    case 'SET_LOGO_SCALE':
      return { ...state, logoScale: action.scale };
    case 'SET_LOGO_AZIMUTH':
      return { ...state, logoAzimuth: clampAzimuth(action.azimuth) };
    case 'SET_LOGO_ELEVATION':
      return { ...state, logoElevation: clampElevation(action.elevation) };
    case 'SET_TEXT_LINE1':
      return { ...state, textLine1: action.text };
    case 'SET_TEXT_LINE2':
      return { ...state, textLine2: action.text };
    case 'SET_TEXT_COLOR':
      return { ...state, textColor: action.color };
    case 'SET_TEXT_ALIGN':
      return { ...state, textAlign: action.align };
    case 'SET_TEXT_LINE1_OFFSET_Y':
      return { ...state, textLine1OffsetY: action.offset };
    case 'SET_TEXT_LINE2_OFFSET_Y':
      return { ...state, textLine2OffsetY: action.offset };
    case 'TOGGLE_MOON_MODE':
      return { ...state, moonMode: !state.moonMode };
    case 'SET_TEE_MODE':
      return { ...state, teeMode: action.active, ...(action.active ? { designMode: false } : {}) };
    case 'SET_DRAGGING':
      return { ...state, draggingElement: action.element };
    case 'ENTER_DESIGN_MODE':
      return { ...state, designMode: true };
    case 'EXIT_DESIGN_MODE':
      return { ...state, designMode: false };
    case 'RESET':
      return { ...initialState, moonMode: state.moonMode };
    default:
      return state;
  }
}

// Actions that don't modify user-visible design state (no undo tracking)
const SKIP_UNDO: Set<string> = new Set([
  'TOGGLE_MOON_MODE', 'SET_TEE_MODE', 'SET_DRAGGING',
  'ENTER_DESIGN_MODE', 'EXIT_DESIGN_MODE', 'UNDO',
]);

// Continuous slider actions — collapse consecutive same-type into one undo entry
const SLIDER_ACTIONS: Set<string> = new Set([
  'SET_LOGO_SCALE', 'SET_TEXT_LINE1_OFFSET_Y', 'SET_TEXT_LINE2_OFFSET_Y',
  'SET_LOGO_AZIMUTH', 'SET_LOGO_ELEVATION',
]);

const MAX_UNDO = 20;

interface UndoState {
  current: GolfBallState;
  history: GolfBallState[];
  lastActionType: string | null;
}

function undoReducer(undoState: UndoState, action: GolfBallAction): UndoState {
  if (action.type === 'UNDO') {
    if (undoState.history.length === 0) return undoState;
    const prev = undoState.history[undoState.history.length - 1];
    return {
      current: { ...prev, moonMode: undoState.current.moonMode, designMode: undoState.current.designMode },
      history: undoState.history.slice(0, -1),
      lastActionType: null,
    };
  }

  const newState = reducer(undoState.current, action);
  if (newState === undoState.current) return undoState;

  if (SKIP_UNDO.has(action.type)) {
    return { ...undoState, current: newState };
  }

  // For slider actions, collapse consecutive same-type (don't push a new entry)
  if (SLIDER_ACTIONS.has(action.type) && undoState.lastActionType === action.type) {
    return { ...undoState, current: newState };
  }

  return {
    current: newState,
    history: [...undoState.history.slice(-(MAX_UNDO - 1)), undoState.current],
    lastActionType: action.type,
  };
}

export default function GolfBallClient() {
  const [undoState, dispatch] = useReducer(undoReducer, { current: initialState, history: [], lastActionType: null });
  const state = undoState.current;
  const canUndo = undoState.history.length > 0;
  const [activeTab, setActiveTab] = useState<Tab>('logo');

  const hasContent = !!(state.logoUrl || state.textLine1 || state.textLine2);
  const [hintDismissed, setHintDismissed] = useState(false);
  const showHint = !hasContent && !hintDismissed;

  // Dismiss hint on first interaction
  useEffect(() => {
    if (hasContent) setHintDismissed(true);
  }, [hasContent]);

  const handleLogoUpload = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        dispatch({ type: 'SET_LOGO', url: e.target.result as string });
      }
    };
    reader.readAsDataURL(file);
  }, []);

  if (state.teeMode) {
    return <TeeScene state={state} dispatch={dispatch} />;
  }

  return (
    <div className="customizer-layout">
      <div className="scene-container">
        <MoonBallsBranding />
        <MoonModeToggle state={state} dispatch={dispatch} />
        <GolfBallScene state={state} dispatch={dispatch} activeTab={activeTab} setActiveTab={setActiveTab} />
        {/* Onboarding hint */}
        {showHint && (
          <div className="onboarding-hint" onClick={() => setHintDismissed(true)}>
            <span className="hint-arrow">&#8594;</span>
            <span>Pick a logo or add text to get started</span>
          </div>
        )}
        {/* Desktop-only floating Done button */}
        {state.designMode && (
          <button
            className="done-editing-btn desktop-only"
            onClick={() => dispatch({ type: 'EXIT_DESIGN_MODE' })}
          >
            Done
          </button>
        )}
      </div>
      {/* Mobile design-mode bar between scene and controls */}
      {state.designMode && (
        <div className="design-mode-bar mobile-only">
          <span className="design-mode-label">Editing</span>
          <button
            className="design-mode-done"
            onClick={() => dispatch({ type: 'EXIT_DESIGN_MODE' })}
          >
            Done
          </button>
        </div>
      )}
      <ControlsPanel
        state={state}
        dispatch={dispatch}
        onLogoUpload={handleLogoUpload}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        canUndo={canUndo}
      />

      <style jsx>{`
        .customizer-layout {
          display: flex;
          height: 100vh;
          height: 100dvh;
          width: 100vw;
          overflow: hidden;
          background: #2a4a25;
        }
        .scene-container {
          flex: 1;
          position: relative;
          touch-action: none;
          min-width: 0;
          min-height: 0;
        }
        .done-editing-btn {
          position: absolute;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 10;
          padding: 10px 32px;
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          color: #1e293b;
          border: 1px solid rgba(255, 255, 255, 0.5);
          border-radius: 24px;
          font-family: var(--font-outfit), sans-serif;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.15s, box-shadow 0.15s;
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
        }
        .done-editing-btn:hover {
          transform: translateX(-50%) scale(1.05);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        }
        .onboarding-hint {
          position: absolute;
          bottom: 32px;
          right: 24px;
          z-index: 10;
          pointer-events: auto;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 18px;
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.5);
          border-radius: 20px;
          font-family: var(--font-outfit), sans-serif;
          font-size: 0.82rem;
          font-weight: 500;
          color: #1e293b;
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
          animation: hint-pulse 2.5s ease-in-out infinite;
        }
        .hint-arrow {
          font-size: 1rem;
          animation: hint-bounce 1.5s ease-in-out infinite;
        }
        @keyframes hint-pulse {
          0%, 100% { opacity: 0.85; }
          50% { opacity: 1; }
        }
        @keyframes hint-bounce {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(4px); }
        }
        .design-mode-bar {
          display: none;
        }
        .mobile-only {
          display: none;
        }
        @media (max-width: 768px) {
          .customizer-layout {
            flex-direction: column;
          }
          .scene-container {
            flex: 1 1 0;
            min-height: 0;
          }
          .desktop-only {
            display: none !important;
          }
          .mobile-only {
            display: flex;
          }
          .onboarding-hint {
            bottom: 12px;
            right: auto;
            left: 50%;
            transform: translateX(-50%);
            font-size: 0.75rem;
            padding: 8px 14px;
          }
          .hint-arrow {
            display: none;
          }
          .design-mode-bar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 8px 16px;
            background: rgba(99, 102, 241, 0.12);
            border-top: 1px solid rgba(99, 102, 241, 0.2);
            border-bottom: 1px solid rgba(99, 102, 241, 0.2);
            flex-shrink: 0;
          }
          .design-mode-label {
            font-family: var(--font-outfit), sans-serif;
            font-size: 0.8rem;
            font-weight: 600;
            color: #6366f1;
            text-transform: uppercase;
            letter-spacing: 0.06em;
          }
          .design-mode-done {
            padding: 6px 20px;
            background: #6366f1;
            color: white;
            border: none;
            border-radius: 16px;
            font-family: var(--font-outfit), sans-serif;
            font-size: 0.82rem;
            font-weight: 600;
            cursor: pointer;
            min-height: 36px;
          }
        }
      `}</style>
    </div>
  );
}
