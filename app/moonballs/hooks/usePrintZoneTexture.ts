import { useMemo } from 'react';
import * as THREE from 'three';

const WIDTH = 512;
const HEIGHT = 512;

export function usePrintZoneTexture(): THREE.CanvasTexture {
  return useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    const ctx = canvas.getContext('2d')!;

    ctx.clearRect(0, 0, WIDTH, HEIGHT);

    const pad = 16;
    const r = 24;
    const x = pad;
    const y = pad;
    const w = WIDTH - pad * 2;
    const h = HEIGHT - pad * 2;

    // Build the rounded rect path once
    const buildPath = () => {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.arcTo(x + w, y, x + w, y + r, r);
      ctx.lineTo(x + w, y + h - r);
      ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
      ctx.lineTo(x + r, y + h);
      ctx.arcTo(x, y + h, x, y + h - r, r);
      ctx.lineTo(x, y + r);
      ctx.arcTo(x, y, x + r, y, r);
      ctx.closePath();
    };

    // Subtle tinted fill so the zone is visible even on white balls
    buildPath();
    ctx.fillStyle = 'rgba(99, 102, 241, 0.06)';
    ctx.fill();

    // Dashed border
    buildPath();
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.35)';
    ctx.lineWidth = 3;
    ctx.setLineDash([12, 8]);
    ctx.stroke();

    // Corner brackets for extra clarity (solid, slightly brighter)
    ctx.setLineDash([]);
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.5)';
    ctx.lineWidth = 3;
    const bLen = 20; // bracket arm length

    // Top-left
    ctx.beginPath();
    ctx.moveTo(x, y + r + bLen);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.lineTo(x + r + bLen, y);
    ctx.stroke();

    // Top-right
    ctx.beginPath();
    ctx.moveTo(x + w - r - bLen, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + r + bLen);
    ctx.stroke();

    // Bottom-right
    ctx.beginPath();
    ctx.moveTo(x + w, y + h - r - bLen);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + w - r - bLen, y + h);
    ctx.stroke();

    // Bottom-left
    ctx.beginPath();
    ctx.moveTo(x + r + bLen, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + h - r - bLen);
    ctx.stroke();

    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }, []);
}
