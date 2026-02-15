'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, Stars } from '@react-three/drei';
import GolfBall from './GolfBall';
import GolfTee from './GolfTee';
import MoonBallsBranding from './MoonBallsBranding';
import MoonModeToggle from './MoonModeToggle';
import type { GolfBallState, GolfBallAction } from '../GolfBallClient';

interface TeeSceneProps {
  state: GolfBallState;
  dispatch: React.Dispatch<GolfBallAction>;
}

function useGradientBackground() {
  return useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#87CEEB');
    gradient.addColorStop(0.35, '#B0D4E8');
    gradient.addColorStop(0.55, '#C8D8C0');
    gradient.addColorStop(0.75, '#6B8F5E');
    gradient.addColorStop(1, '#3A5F2F');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 512);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);
}

function TeeSceneLighting({ moonMode }: { moonMode: boolean }) {
  const gradientBg = useGradientBackground();

  if (moonMode) {
    return (
      <>
        <color attach="background" args={['#020210']} />
        <Stars radius={80} depth={60} count={8000} factor={5} saturation={0.2} fade speed={1.5} />
        <Stars radius={40} depth={30} count={2000} factor={8} saturation={0} fade={false} speed={0.5} />
        <Environment preset="night" />
        <ambientLight intensity={0.08} color="#0a0a3e" />
        <directionalLight position={[5, 5, 5]} intensity={1.0} color="#c0d8f0" />
        <directionalLight position={[-3, 2, -5]} intensity={0.1} color="#4a4a8a" />
        <pointLight position={[-8, 6, -4]} intensity={0.4} color="#6366f1" distance={20} />
      </>
    );
  }

  return (
    <>
      <primitive object={gradientBg} attach="background" />
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={0.7} />
      <directionalLight position={[-3, 2, -5]} intensity={0.3} />
      <Environment preset="warehouse" />
    </>
  );
}

export default function TeeScene({ state, dispatch }: TeeSceneProps) {
  return (
    <div className="tee-scene-wrapper">
      <Canvas
        dpr={[1, 1.5]}
        gl={{ stencil: true }}
        camera={{ position: [0, 0, 4], fov: 40 }}
        style={{ width: '100%', height: '100%' }}
      >
        <TeeSceneLighting moonMode={state.moonMode} />
        <group>
          <GolfBall state={state} dispatch={dispatch} activeTab="logo" />
          <GolfTee />
        </group>
        <OrbitControls
          enablePan={false}
          enableZoom={false}
          enableDamping
          dampingFactor={0.08}
          minPolarAngle={Math.PI / 2}
          maxPolarAngle={Math.PI / 2}
        />
      </Canvas>

      <button
        className="back-to-edit"
        onClick={() => dispatch({ type: 'SET_TEE_MODE', active: false })}
      >
        &larr; Back to Edit
      </button>
      <MoonBallsBranding />
      <MoonModeToggle state={state} dispatch={dispatch} />
      <button className="order-btn" disabled>
        Coming Soon
      </button>

      <style jsx>{`
        .tee-scene-wrapper {
          position: relative;
          width: 100vw;
          height: 100vh;
          background: #0f0f0f;
        }
        .back-to-edit {
          position: absolute;
          top: 20px;
          left: 20px;
          z-index: 10;
          padding: 8px 16px;
          background: rgba(0, 0, 0, 0.5);
          border: none;
          border-radius: 8px;
          backdrop-filter: blur(8px);
          color: #d1d5db;
          font-family: var(--font-outfit), sans-serif;
          font-size: 0.9rem;
          cursor: pointer;
          transition: background 0.2s;
        }
        .back-to-edit:hover {
          background: rgba(99, 102, 241, 0.3);
        }
        .order-btn {
          position: absolute;
          bottom: 32px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 10;
          padding: 14px 40px;
          background: linear-gradient(135deg, #6366f1, #4f46e5);
          color: white;
          border: none;
          border-radius: 24px;
          font-family: var(--font-outfit), sans-serif;
          font-size: 1rem;
          font-weight: 700;
          letter-spacing: 0.05em;
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
