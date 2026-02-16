'use client';

import { useRef, useMemo, useState, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { ThreeEvent, useFrame } from '@react-three/fiber';
import { Decal } from '@react-three/drei';
import { getDimpleNormalMap, getDimpleRoughnessMap, getDimpleDisplacementMap } from '../utils/dimpleNormalMap';
import { flipTextureForDecal, flipCanvasForDecal } from '../utils/decalTexture';
import { useCanvasTextureLine } from '../hooks/useCanvasTexture';
import { usePrintZoneTexture } from '../hooks/usePrintZoneTexture';
import { PRINT_ZONE } from '../constants/printZone';
import type { GolfBallState, GolfBallAction, Tab } from '../GolfBallClient';

interface GolfBallProps {
  state: GolfBallState;
  dispatch: React.Dispatch<GolfBallAction>;
  activeTab: Tab;
  setActiveTab?: (tab: Tab) => void;
}

function sphericalToCartesian(azimuth: number, elevation: number, radius: number): [number, number, number] {
  const x = radius * Math.cos(elevation) * Math.cos(azimuth);
  const y = radius * Math.sin(elevation);
  const z = radius * Math.cos(elevation) * Math.sin(azimuth);
  return [x, y, z];
}

function textLinePosition(offsetY: number, azOffset: number = 0): [number, number, number] {
  // 0=top, 1=bottom → elevation +0.45 to -0.45 (within ±0.60 zone)
  const elevation = PRINT_ZONE.centerElevation + 0.45 - offsetY * 0.90;
  return sphericalToCartesian(PRINT_ZONE.centerAzimuth + azOffset, elevation, 1);
}

function textLineRotation(offsetY: number, azOffset: number = 0): [number, number, number] {
  const elevation = PRINT_ZONE.centerElevation + 0.45 - offsetY * 0.90;
  return [elevation, PRINT_ZONE.centerAzimuth + azOffset + Math.PI / 2, 0];
}

function PulsingGlow() {
  const matRef = useRef<THREE.MeshBasicMaterial>(null);
  useFrame(({ clock }) => {
    if (matRef.current) {
      matRef.current.opacity = 0.06 + Math.sin(clock.elapsedTime * 2) * 0.06;
    }
  });
  return (
    <mesh scale={1.03}>
      <sphereGeometry args={[1, 64, 64]} />
      <meshBasicMaterial
        ref={matRef}
        color="#6366f1"
        transparent
        opacity={0.06}
        depthWrite={false}
      />
    </mesh>
  );
}

export default function GolfBall({ state, dispatch, activeTab, setActiveTab }: GolfBallProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const tapStartRef = useRef<{ time: number; x: number; y: number } | null>(null);

  const normalMap = useMemo(() => getDimpleNormalMap(), []);
  const roughnessMap = useMemo(() => getDimpleRoughnessMap(), []);
  const displacementMap = useMemo(() => getDimpleDisplacementMap(), []);

  const textLine1Texture = useCanvasTextureLine(
    state.textLine1, state.textLine1Color, state.textLine1Size,
    state.textLine1Bold ? 'bold' : 'normal',
    state.textLine1Italic ? 'italic' : 'normal',
    state.textLine1Font
  );
  const textLine2Texture = useCanvasTextureLine(
    state.textLine2, state.textLine2Color, state.textLine2Size,
    state.textLine2Bold ? 'bold' : 'normal',
    state.textLine2Italic ? 'italic' : 'normal',
    state.textLine2Font
  );

  const { texture: logoTexture, aspectRatio: logoAspect } = useLogoTexture(state.logoUrl);
  const titleistTexture = useTitleistTexture();
  const printZoneTexture = usePrintZoneTexture();

  const hasLogo = !!state.logoUrl;
  const hasText = !!(state.textLine1 || state.textLine2);

  // Tap detection: quick tap toggles design mode, drag rotates the ball
  const onPointerDown = useCallback((event: ThreeEvent<PointerEvent>) => {
    if (hasLogo || hasText) {
      tapStartRef.current = {
        time: Date.now(),
        x: event.nativeEvent.clientX,
        y: event.nativeEvent.clientY,
      };
    }
  }, [hasLogo, hasText]);

  const onPointerUp = useCallback((event: ThreeEvent<PointerEvent>) => {
    if (!tapStartRef.current) return;
    const elapsed = Date.now() - tapStartRef.current.time;
    const dx = event.nativeEvent.clientX - tapStartRef.current.x;
    const dy = event.nativeEvent.clientY - tapStartRef.current.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    tapStartRef.current = null;

    if (elapsed < 300 && distance < 5) {
      if (state.designMode) {
        dispatch({ type: 'EXIT_DESIGN_MODE' });
      } else {
        dispatch({ type: 'ENTER_DESIGN_MODE' });
        if (setActiveTab) {
          setActiveTab(hasLogo ? 'logo' : 'text');
        }
      }
    }
  }, [state.designMode, hasLogo, setActiveTab, dispatch]);

  const onPointerLeave = useCallback(() => {
    tapStartRef.current = null;
  }, []);

  // Logo always at print zone center
  const logoPosition = sphericalToCartesian(PRINT_ZONE.centerAzimuth, PRINT_ZONE.centerElevation, 1);
  const printZonePosition = logoPosition;

  const logoRotation = useMemo((): [number, number, number] => {
    return [0, PRINT_ZONE.centerAzimuth + Math.PI / 2, 0];
  }, []);
  const printZoneRotation = logoRotation;

  // Text line positions
  const line1Position = useMemo(() => textLinePosition(state.textLine1OffsetY), [state.textLine1OffsetY]);
  const line2Position = useMemo(() => textLinePosition(state.textLine2OffsetY), [state.textLine2OffsetY]);
  const line1Rotation = useMemo(() => textLineRotation(state.textLine1OffsetY), [state.textLine1OffsetY]);
  const line2Rotation = useMemo(() => textLineRotation(state.textLine2OffsetY), [state.textLine2OffsetY]);

  const onPointerOver = useCallback(() => {
    if (hasLogo || hasText) {
      document.body.style.cursor = 'pointer';
    }
  }, [hasLogo, hasText]);

  const onPointerOut = useCallback(() => {
    document.body.style.cursor = '';
  }, []);

  // Aspect-aware logo decal scale
  const logoDecalScale = useMemo((): [number, number, number] => {
    const s = state.logoScale;
    if (logoAspect >= 1) {
      return [s, s / logoAspect, 1];
    }
    return [s * logoAspect, s, 1];
  }, [state.logoScale, logoAspect]);

  // Canvas is 512x128 (4:1), decal matches at [1.2, 0.3] (4:1)
  const TEXT_DECAL_SCALE: [number, number, number] = [1.2, 0.3, 1];

  // Titleist branding on the back of the ball (opposite the design area)
  const BACK_AZIMUTH = PRINT_ZONE.centerAzimuth + Math.PI; // π/2 + π = 3π/2
  const titleistPosition = useMemo(() => sphericalToCartesian(BACK_AZIMUTH, 0, 1), []);
  const titleistRotation = useMemo((): [number, number, number] => [0, BACK_AZIMUTH + Math.PI / 2, 0], []);

  return (
    <mesh
      ref={meshRef}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerLeave}
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
    >
      <sphereGeometry args={[1, 128, 128]} />
      <meshStandardMaterial
        color={state.ballColor}
        roughness={0.65}
        metalness={0}
        normalMap={normalMap}
        normalScale={new THREE.Vector2(1.5, 1.5)}
        roughnessMap={roughnessMap}
        displacementMap={displacementMap}
        displacementScale={0.025}
        envMapIntensity={0.3}
      />

      {/* Titleist branding on back of ball */}
      {titleistTexture && (
        <Decal
          position={titleistPosition}
          rotation={titleistRotation}
          scale={[0.5, 0.5, 1]}
        >
          <meshStandardMaterial
            map={titleistTexture}
            transparent
            depthTest={false}
            polygonOffset
            polygonOffsetFactor={-1}
          />
        </Decal>
      )}

      {/* Pulsing glow when not in design mode but content exists */}
      {!state.designMode && (hasLogo || hasText) && <PulsingGlow />}

      {/* Stencil mask — invisible, writes stencil=1 over print zone */}
      <Decal
        position={printZonePosition}
        rotation={printZoneRotation}
        scale={[1.2, 1.2, 1]}
        renderOrder={0}
      >
        <meshBasicMaterial
          colorWrite={false}
          depthWrite={false}
          stencilWrite={true}
          stencilRef={1}
          stencilFunc={THREE.AlwaysStencilFunc}
          stencilZPass={THREE.ReplaceStencilOp}
        />
      </Decal>

      {/* Logo decal — stencil-clipped */}
      {logoTexture && (
        <Decal
          position={logoPosition}
          rotation={logoRotation}
          scale={logoDecalScale}
          renderOrder={1}
        >
          <meshStandardMaterial
            map={logoTexture}
            transparent
            polygonOffset
            polygonOffsetFactor={-1}
            depthTest={false}
            stencilWrite={false}
            stencilRef={1}
            stencilFunc={THREE.EqualStencilFunc}
          />
        </Decal>
      )}

      {/* Text Line 1 decal — stencil-clipped */}
      {textLine1Texture && (
        <Decal
          position={line1Position}
          rotation={line1Rotation}
          scale={TEXT_DECAL_SCALE}
          renderOrder={1}
        >
          <meshStandardMaterial
            map={textLine1Texture}
            transparent
            polygonOffset
            polygonOffsetFactor={-1}
            depthTest={false}
            stencilWrite={false}
            stencilRef={1}
            stencilFunc={THREE.EqualStencilFunc}
          />
        </Decal>
      )}

      {/* Text Line 2 decal — stencil-clipped */}
      {textLine2Texture && (
        <Decal
          position={line2Position}
          rotation={line2Rotation}
          scale={TEXT_DECAL_SCALE}
          renderOrder={1}
        >
          <meshStandardMaterial
            map={textLine2Texture}
            transparent
            polygonOffset
            polygonOffsetFactor={-1}
            depthTest={false}
            stencilWrite={false}
            stencilRef={1}
            stencilFunc={THREE.EqualStencilFunc}
          />
        </Decal>
      )}

      {/* Print zone border — only in design mode */}
      {state.designMode && (
        <Decal
          position={printZonePosition}
          rotation={printZoneRotation}
          scale={[1.2, 1.2, 1]}
          map={printZoneTexture}
          depthTest={false}
          polygonOffsetFactor={-0.5}
          renderOrder={2}
        />
      )}
    </mesh>
  );
}

function useTitleistTexture(): THREE.Texture | null {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    const loader = new THREE.TextureLoader();
    loader.load('/moonballs/logos/titleist.png', (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      flipTextureForDecal(tex);
      setTexture(tex);
    });
  }, []);

  return texture;
}

function isSvgUrl(url: string): boolean {
  return url.endsWith('.svg') || url.startsWith('data:image/svg');
}

function useLogoTexture(url: string | null): { texture: THREE.Texture | null; aspectRatio: number } {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const [aspectRatio, setAspectRatio] = useState(1);

  useEffect(() => {
    if (!url) {
      setTexture(null);
      setAspectRatio(1);
      return;
    }

    if (isSvgUrl(url)) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d')!;
        flipCanvasForDecal(ctx, 512);
        ctx.drawImage(img, 0, 0, 512, 512);
        const tex = new THREE.CanvasTexture(canvas);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.needsUpdate = true;
        setTexture(tex);
        setAspectRatio(1);
      };
      img.src = url;
    } else {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const ar = img.naturalWidth / img.naturalHeight;
        const loader = new THREE.TextureLoader();
        loader.load(url, (tex) => {
          tex.colorSpace = THREE.SRGBColorSpace;
          flipTextureForDecal(tex);
          setTexture(tex);
          setAspectRatio(ar);
        });
      };
      img.src = url;
    }
  }, [url]);

  return { texture, aspectRatio };
}
