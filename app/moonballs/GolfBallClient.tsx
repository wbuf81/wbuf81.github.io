'use client';

import { useReducer, useCallback, useState } from 'react';
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
  | { type: 'RESET' };

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

export default function GolfBallClient() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [activeTab, setActiveTab] = useState<Tab>('logo');

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
        {state.designMode && (
          <button
            className="done-editing-btn"
            onClick={() => dispatch({ type: 'EXIT_DESIGN_MODE' })}
          >
            Done
          </button>
        )}
      </div>
      <ControlsPanel
        state={state}
        dispatch={dispatch}
        onLogoUpload={handleLogoUpload}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      <style jsx>{`
        .customizer-layout {
          display: flex;
          height: 100vh;
          width: 100vw;
          overflow: hidden;
          background: #2a4a25;
        }
        .scene-container {
          flex: 1;
          position: relative;
          touch-action: none;
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
        @media (max-width: 768px) {
          .customizer-layout {
            flex-direction: column;
          }
          .scene-container {
            flex: 1;
            min-height: 50vh;
          }
        }
      `}</style>
    </div>
  );
}
