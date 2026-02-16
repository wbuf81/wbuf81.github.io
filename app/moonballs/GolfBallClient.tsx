'use client';

import { useReducer, useState, useEffect, useCallback } from 'react';
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
  | { type: 'SET_TEXT_LINE1_COLOR'; color: string }
  | { type: 'SET_TEXT_LINE2_COLOR'; color: string }
  | { type: 'SET_TEXT_LINE1_FONT'; font: string }
  | { type: 'SET_TEXT_LINE2_FONT'; font: string }
  | { type: 'SET_TEXT_LINE1_SIZE'; size: number }
  | { type: 'SET_TEXT_LINE2_SIZE'; size: number }
  | { type: 'TOGGLE_TEXT_LINE1_BOLD' }
  | { type: 'TOGGLE_TEXT_LINE2_BOLD' }
  | { type: 'TOGGLE_TEXT_LINE1_ITALIC' }
  | { type: 'TOGGLE_TEXT_LINE2_ITALIC' }
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
  textLine1Color: '#000000',
  textLine2Color: '#000000',
  textLine1Font: 'Outfit',
  textLine2Font: 'Outfit',
  textLine1Size: 44,
  textLine2Size: 36,
  textLine1Bold: true,
  textLine2Bold: false,
  textLine1Italic: false,
  textLine2Italic: false,
  textLine1OffsetY: 0.15,
  textLine2OffsetY: 0.85,
  moonMode: false,
  teeMode: false,
  draggingElement: null,
  designMode: false,
};

// Design fields that get saved to localStorage
const DESIGN_KEYS = [
  'ballColor', 'logoUrl', 'logoScale', 'logoAzimuth', 'logoElevation',
  'textLine1', 'textLine2',
  'textLine1Color', 'textLine2Color', 'textLine1Font', 'textLine2Font',
  'textLine1Size', 'textLine2Size', 'textLine1Bold', 'textLine2Bold',
  'textLine1Italic', 'textLine2Italic', 'textLine1OffsetY', 'textLine2OffsetY',
] as const;

const STORAGE_KEY = 'moonballs-design';

function loadDesignFromStorage(): Partial<GolfBallState> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const saved = JSON.parse(raw);
    // Discard stale data: URL logos (from before upload removal)
    if (typeof saved.logoUrl === 'string' && saved.logoUrl.startsWith('data:')) {
      saved.logoUrl = null;
    }
    return saved;
  } catch {
    return {};
  }
}

function saveDesignToStorage(state: GolfBallState) {
  try {
    const design: Record<string, unknown> = {};
    for (const key of DESIGN_KEYS) {
      design[key] = state[key];
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(design));
  } catch {
    // quota exceeded or private browsing — silently ignore
  }
}

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
    case 'SET_TEXT_LINE1_COLOR':
      return { ...state, textLine1Color: action.color };
    case 'SET_TEXT_LINE2_COLOR':
      return { ...state, textLine2Color: action.color };
    case 'SET_TEXT_LINE1_FONT':
      return { ...state, textLine1Font: action.font };
    case 'SET_TEXT_LINE2_FONT':
      return { ...state, textLine2Font: action.font };
    case 'SET_TEXT_LINE1_SIZE':
      return { ...state, textLine1Size: action.size };
    case 'SET_TEXT_LINE2_SIZE':
      return { ...state, textLine2Size: action.size };
    case 'TOGGLE_TEXT_LINE1_BOLD':
      return { ...state, textLine1Bold: !state.textLine1Bold };
    case 'TOGGLE_TEXT_LINE2_BOLD':
      return { ...state, textLine2Bold: !state.textLine2Bold };
    case 'TOGGLE_TEXT_LINE1_ITALIC':
      return { ...state, textLine1Italic: !state.textLine1Italic };
    case 'TOGGLE_TEXT_LINE2_ITALIC':
      return { ...state, textLine2Italic: !state.textLine2Italic };
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
  'SET_TEXT_LINE1_SIZE', 'SET_TEXT_LINE2_SIZE',
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

function initUndoState(): UndoState {
  const saved = loadDesignFromStorage();
  return {
    current: { ...initialState, ...saved },
    history: [],
    lastActionType: null,
  };
}

export default function GolfBallClient() {
  const [undoState, dispatch] = useReducer(undoReducer, undefined, initUndoState);
  const state = undoState.current;
  const canUndo = undoState.history.length > 0;
  const [activeTab, setActiveTab] = useState<Tab>('logo');

  // Welcome overlay — shows once per device
  const [showWelcome, setShowWelcome] = useState(() => {
    try {
      return !localStorage.getItem('moonballs-welcomed');
    } catch {
      return false;
    }
  });

  const dismissWelcome = useCallback(() => {
    setShowWelcome(false);
    try { localStorage.setItem('moonballs-welcomed', '1'); } catch {}
    setActiveTab('logo');
  }, []);

  // Persist design to localStorage on design field changes
  useEffect(() => {
    saveDesignToStorage(state);
  }, [
    state.ballColor, state.logoUrl, state.logoScale, state.logoAzimuth, state.logoElevation,
    state.textLine1, state.textLine2,
    state.textLine1Color, state.textLine2Color, state.textLine1Font, state.textLine2Font,
    state.textLine1Size, state.textLine2Size, state.textLine1Bold, state.textLine2Bold,
    state.textLine1Italic, state.textLine2Italic,
    state.textLine1OffsetY, state.textLine2OffsetY,
  ]);

  // Clear localStorage on reset
  useEffect(() => {
    if (
      state.ballColor === initialState.ballColor &&
      state.logoUrl === null &&
      state.textLine1 === '' &&
      state.textLine2 === ''
    ) {
      try { localStorage.removeItem(STORAGE_KEY); } catch {}
    }
  }, [state.ballColor, state.logoUrl, state.textLine1, state.textLine2]);

  // Ctrl+Z / Cmd+Z keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        e.preventDefault();
        dispatch({ type: 'UNDO' });
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
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
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        canUndo={canUndo}
      />

      {/* Welcome overlay */}
      {showWelcome && (
        <div className="welcome-overlay" onClick={dismissWelcome}>
          <div className="welcome-card" onClick={(e) => e.stopPropagation()}>
            <h2 className="welcome-title">Design Your Custom Golf Ball</h2>
            <ol className="welcome-steps">
              <li><span className="step-num">1</span> Choose a logo from the gallery</li>
              <li><span className="step-num">2</span> Add your name and a custom message</li>
              <li><span className="step-num">3</span> Pick your ball color and share it</li>
            </ol>
            <button className="welcome-btn" onClick={dismissWelcome}>
              Let&apos;s Go
            </button>
          </div>
        </div>
      )}

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
        .design-mode-bar {
          display: none;
        }
        .mobile-only {
          display: none;
        }

        /* Welcome overlay */
        .welcome-overlay {
          position: fixed;
          inset: 0;
          z-index: 100;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
        }
        .welcome-card {
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(40px);
          -webkit-backdrop-filter: blur(40px);
          border: 1px solid rgba(255, 255, 255, 0.6);
          border-radius: 24px;
          padding: 36px 32px 28px;
          max-width: 380px;
          width: calc(100% - 48px);
          text-align: center;
          box-shadow: 0 8px 40px rgba(0, 0, 0, 0.15);
        }
        .welcome-title {
          font-family: var(--font-outfit), sans-serif;
          font-size: 1.3rem;
          font-weight: 700;
          color: #1e293b;
          margin: 0 0 24px;
        }
        .welcome-steps {
          list-style: none;
          padding: 0;
          margin: 0 0 28px;
          text-align: left;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .welcome-steps li {
          display: flex;
          align-items: center;
          gap: 12px;
          font-family: var(--font-outfit), sans-serif;
          font-size: 0.9rem;
          color: #334155;
          line-height: 1.3;
        }
        .step-num {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: linear-gradient(135deg, #6366f1, #4f46e5);
          color: white;
          font-size: 0.8rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .welcome-btn {
          width: 100%;
          padding: 14px 0;
          background: linear-gradient(135deg, #6366f1, #4f46e5);
          color: white;
          border: none;
          border-radius: 14px;
          font-family: var(--font-outfit), sans-serif;
          font-size: 1rem;
          font-weight: 700;
          cursor: pointer;
          letter-spacing: 0.03em;
          transition: transform 0.15s, box-shadow 0.15s;
          box-shadow: 0 2px 12px rgba(99, 102, 241, 0.35);
        }
        .welcome-btn:hover {
          transform: scale(1.02);
          box-shadow: 0 4px 20px rgba(99, 102, 241, 0.5);
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
          .welcome-card {
            padding: 28px 24px 24px;
          }
          .welcome-title {
            font-size: 1.15rem;
          }
        }
      `}</style>
    </div>
  );
}
