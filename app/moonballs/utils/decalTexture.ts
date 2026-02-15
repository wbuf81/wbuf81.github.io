import * as THREE from 'three';

/**
 * Three.js Decals project textures mirrored (flipped horizontally).
 * All textures used with <Decal> must be counter-flipped so they
 * appear correctly on the ball surface.
 *
 * For loaded textures (PNG/JPG): call flipTextureForDecal().
 * For canvas-rendered textures: call flipCanvasForDecal(ctx, width)
 * before drawing, which applies a horizontal mirror transform.
 */

/** Flip a loaded THREE.Texture horizontally for use with Decal components. */
export function flipTextureForDecal(tex: THREE.Texture): void {
  tex.repeat.x = -1;
  tex.offset.x = 1;
  tex.needsUpdate = true;
}

/** Apply a horizontal mirror transform to a canvas context for Decal use.
 *  Call this BEFORE drawing anything on the canvas. */
export function flipCanvasForDecal(ctx: CanvasRenderingContext2D, width: number): void {
  ctx.translate(width, 0);
  ctx.scale(-1, 1);
}
