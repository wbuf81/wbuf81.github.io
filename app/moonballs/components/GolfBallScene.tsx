'use client';

import { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, Stars } from '@react-three/drei';
import GolfBall from './GolfBall';
import type { GolfBallState, GolfBallAction, Tab } from '../GolfBallClient';

interface GolfBallSceneProps {
  state: GolfBallState;
  dispatch: React.Dispatch<GolfBallAction>;
  activeTab: Tab;
  setActiveTab?: (tab: Tab) => void;
}

function useGradientBackground() {
  return useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    // Sky blue at top → soft haze → fairway green at bottom
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

function SceneLighting({ moonMode }: { moonMode: boolean }) {
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

function CameraAnimator({ targetZ, onReachTarget }: { targetZ: number; onReachTarget?: () => void }) {
  const reachedRef = useRef(true);
  const prevTargetZ = useRef(targetZ);

  useEffect(() => {
    if (targetZ !== prevTargetZ.current) {
      prevTargetZ.current = targetZ;
      reachedRef.current = false;
    }
  }, [targetZ]);

  useFrame(({ camera }) => {
    if (reachedRef.current) return;
    camera.position.x += (0 - camera.position.x) * 0.08;
    camera.position.y += (0 - camera.position.y) * 0.08;
    camera.position.z += (targetZ - camera.position.z) * 0.08;
    camera.lookAt(0, 0, 0);
    const dist = Math.abs(camera.position.z - targetZ) + Math.abs(camera.position.x) + Math.abs(camera.position.y);
    if (dist < 0.01) {
      camera.position.set(0, 0, targetZ);
      reachedRef.current = true;
      onReachTarget?.();
    }
  });
  return null;
}

// Gentle showcase wobble — oscillates the ball so the design area is always visible
function ShowcaseGroup({ active, children }: { active: boolean; children: React.ReactNode }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    if (active) {
      const t = clock.elapsedTime;
      // Overlapping sine waves for organic motion
      groupRef.current.rotation.y = Math.sin(t * 0.4) * 0.35 + Math.sin(t * 0.17) * 0.15;
      groupRef.current.rotation.x = Math.sin(t * 0.3) * 0.12 + Math.sin(t * 0.13) * 0.06;
    } else {
      // Smoothly return to neutral when entering design mode
      groupRef.current.rotation.y += (0 - groupRef.current.rotation.y) * 0.1;
      groupRef.current.rotation.x += (0 - groupRef.current.rotation.x) * 0.1;
    }
  });

  return <group ref={groupRef}>{children}</group>;
}

function SceneContent({ state, dispatch, activeTab, setActiveTab }: GolfBallSceneProps) {
  const controlsRef = useRef<React.ComponentRef<typeof OrbitControls>>(null);
  const [controlsEnabled, setControlsEnabled] = useState(true);

  useEffect(() => {
    if (state.designMode) {
      setControlsEnabled(false);
      controlsRef.current?.reset();
    } else {
      setControlsEnabled(true);
    }
  }, [state.designMode]);

  const handleCameraReachTarget = useCallback(() => {
    if (state.designMode) {
      setControlsEnabled(true);
    }
  }, [state.designMode]);

  const targetZ = state.designMode ? 2.5 : 4;

  return (
    <>
      <SceneLighting moonMode={state.moonMode} />
      <CameraAnimator targetZ={targetZ} onReachTarget={handleCameraReachTarget} />
      <ShowcaseGroup active={!state.designMode}>
        <GolfBall state={state} dispatch={dispatch} activeTab={activeTab} setActiveTab={setActiveTab} />
      </ShowcaseGroup>
      <OrbitControls
        ref={controlsRef}
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.5}
        minDistance={2}
        maxDistance={5}
        enabled={controlsEnabled}
      />
    </>
  );
}

export default function GolfBallScene({ state, dispatch, activeTab, setActiveTab }: GolfBallSceneProps) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      gl={{ stencil: true }}
      camera={{ position: [0, 0, 4], fov: 40 }}
      style={{ width: '100%', height: '100%' }}
    >
      <SceneContent state={state} dispatch={dispatch} activeTab={activeTab} setActiveTab={setActiveTab} />
    </Canvas>
  );
}
