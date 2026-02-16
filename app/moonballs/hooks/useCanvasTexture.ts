import { useMemo, useEffect, useState } from 'react';
import * as THREE from 'three';
import { flipCanvasForDecal } from '../utils/decalTexture';

const CANVAS_WIDTH = 512;
const CANVAS_HEIGHT = 128;

export function useCanvasTextureLine(
  text: string,
  color: string,
  fontSize: number = 48,
  fontWeight: string = 'bold',
  fontStyle: string = 'normal',
  fontFamily: string = 'Outfit'
): THREE.CanvasTexture | null {
  const [fontReady, setFontReady] = useState(false);

  useEffect(() => {
    document.fonts.ready.then(() => setFontReady(true));
  }, []);

  const texture = useMemo(() => {
    if (!fontReady) return null;
    if (!text) return null;

    const canvas = document.createElement('canvas');
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    const ctx = canvas.getContext('2d')!;

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    flipCanvasForDecal(ctx, CANVAS_WIDTH);

    ctx.fillStyle = color;
    ctx.textBaseline = 'middle';
    ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}, sans-serif`;

    // Always center text on canvas; alignment is handled by shifting the decal
    // position on the sphere, which avoids inverted curvature distortion
    ctx.textAlign = 'center';
    ctx.fillText(text, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, CANVAS_WIDTH - 64);

    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }, [text, color, fontSize, fontWeight, fontStyle, fontFamily, fontReady]);

  return texture;
}
