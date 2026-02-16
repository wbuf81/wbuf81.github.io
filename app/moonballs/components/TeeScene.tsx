'use client';

import { useMemo, useRef, useCallback, useState } from 'react';
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

type ShareStatus = 'idle' | 'capturing' | 'preview' | 'sharing' | 'done';

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

function addWatermark(sourceDataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);

      const fontSize = Math.max(14, Math.round(img.width * 0.022));
      ctx.font = `${fontSize}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
      ctx.shadowBlur = 4;
      ctx.fillText('Designed with Moon Balls', img.width / 2, img.height - fontSize);

      resolve(canvas.toDataURL('image/png'));
    };
    img.src = sourceDataUrl;
  });
}

function buildFilename(textLine1: string): string {
  const slug = textLine1.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const date = new Date().toISOString().slice(0, 10);
  return `moonball-${slug || 'custom'}-${date}.png`;
}

export default function TeeScene({ state, dispatch }: TeeSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [shareStatus, setShareStatus] = useState<ShareStatus>('idle');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleCapture = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setShareStatus('capturing');
    await new Promise((r) => setTimeout(r, 100));

    try {
      const raw = canvas.toDataURL('image/png');
      const watermarked = await addWatermark(raw);
      setPreviewUrl(watermarked);
      setShareStatus('preview');
    } catch {
      setShareStatus('idle');
    }
  }, []);

  const handleShare = useCallback(async () => {
    if (!previewUrl) return;
    setShareStatus('sharing');

    const filename = buildFilename(state.textLine1);

    try {
      if (navigator.share && navigator.canShare) {
        const blob = await (await fetch(previewUrl)).blob();
        const file = new File([blob], filename, { type: 'image/png' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ title: 'My Moon Ball', files: [file] });
          setShareStatus('done');
          setTimeout(() => { setShareStatus('idle'); setPreviewUrl(null); }, 2000);
          return;
        }
      }

      // Fallback: download
      const link = document.createElement('a');
      link.download = filename;
      link.href = previewUrl;
      link.click();
      setShareStatus('done');
      setTimeout(() => { setShareStatus('idle'); setPreviewUrl(null); }, 2000);
    } catch {
      setShareStatus('preview'); // back to preview on cancel
    }
  }, [previewUrl, state.textLine1]);

  const handleRetake = useCallback(() => {
    setPreviewUrl(null);
    setShareStatus('idle');
  }, []);

  return (
    <div className="tee-scene-wrapper">
      <Canvas
        ref={canvasRef}
        dpr={[1, 1.5]}
        gl={{ stencil: true, preserveDrawingBuffer: true }}
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

      {shareStatus === 'done' ? (
        <button className="share-btn" disabled>Saved!</button>
      ) : shareStatus === 'capturing' ? (
        <button className="share-btn" disabled>Capturing...</button>
      ) : shareStatus !== 'preview' && shareStatus !== 'sharing' ? (
        <button className="share-btn" onClick={handleCapture}>Share</button>
      ) : null}

      {/* Preview modal */}
      {(shareStatus === 'preview' || shareStatus === 'sharing') && previewUrl && (
        <div className="preview-overlay" onClick={handleRetake}>
          <div className="preview-modal" onClick={(e) => e.stopPropagation()}>
            <img src={previewUrl} alt="Ball preview" className="preview-img" />
            <div className="preview-actions">
              <button className="preview-btn secondary" onClick={handleRetake}>
                Retake
              </button>
              <button
                className="preview-btn primary"
                onClick={handleShare}
                disabled={shareStatus === 'sharing'}
              >
                {shareStatus === 'sharing' ? 'Sharing...' : 'Share'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .tee-scene-wrapper {
          position: relative;
          width: 100vw;
          height: 100vh;
          height: 100dvh;
          background: #0f0f0f;
        }
        .back-to-edit {
          position: absolute;
          top: max(20px, env(safe-area-inset-top));
          left: max(20px, env(safe-area-inset-left));
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
          min-height: 44px;
          display: flex;
          align-items: center;
        }
        .back-to-edit:hover {
          background: rgba(99, 102, 241, 0.3);
        }
        .share-btn {
          position: absolute;
          bottom: max(32px, calc(16px + env(safe-area-inset-bottom)));
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
          cursor: pointer;
          min-height: 48px;
          transition: transform 0.15s, box-shadow 0.15s, opacity 0.2s;
          box-shadow: 0 2px 16px rgba(99, 102, 241, 0.4);
        }
        .share-btn:hover {
          transform: translateX(-50%) scale(1.03);
          box-shadow: 0 4px 24px rgba(99, 102, 241, 0.55);
        }
        .share-btn:disabled {
          opacity: 0.7;
          cursor: wait;
        }

        /* Preview overlay */
        .preview-overlay {
          position: fixed;
          inset: 0;
          z-index: 50;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
        }
        .preview-modal {
          background: rgba(30, 30, 30, 0.95);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 20px;
          padding: 16px;
          max-width: 420px;
          width: calc(100% - 32px);
          box-shadow: 0 8px 40px rgba(0, 0, 0, 0.4);
        }
        .preview-img {
          width: 100%;
          border-radius: 12px;
          display: block;
        }
        .preview-actions {
          display: flex;
          gap: 10px;
          margin-top: 14px;
        }
        .preview-btn {
          flex: 1;
          padding: 12px 0;
          border: none;
          border-radius: 12px;
          font-family: var(--font-outfit), sans-serif;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          min-height: 44px;
          transition: transform 0.15s, box-shadow 0.15s;
        }
        .preview-btn.secondary {
          background: rgba(255, 255, 255, 0.1);
          color: rgba(255, 255, 255, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.15);
        }
        .preview-btn.secondary:hover {
          background: rgba(255, 255, 255, 0.15);
        }
        .preview-btn.primary {
          background: linear-gradient(135deg, #6366f1, #4f46e5);
          color: white;
          box-shadow: 0 2px 12px rgba(99, 102, 241, 0.35);
        }
        .preview-btn.primary:hover {
          transform: scale(1.02);
          box-shadow: 0 4px 20px rgba(99, 102, 241, 0.5);
        }
        .preview-btn:disabled {
          opacity: 0.7;
          cursor: wait;
        }
      `}</style>
    </div>
  );
}
