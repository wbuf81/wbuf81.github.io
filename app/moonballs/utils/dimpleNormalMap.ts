import * as THREE from 'three';

let cachedNormalMap: THREE.CanvasTexture | null = null;
let cachedRoughnessMap: THREE.CanvasTexture | null = null;
let cachedDisplacementMap: THREE.CanvasTexture | null = null;

const MAP_WIDTH = 2048;
const MAP_HEIGHT = 1024;
const NUM_DIMPLES = 392;
const DIMPLE_ANGULAR_RADIUS = 0.08;

interface Vec3 {
  x: number;
  y: number;
  z: number;
}

function fibonacciSphere(n: number): Vec3[] {
  const points: Vec3[] = [];
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2;
    const radius = Math.sqrt(1 - y * y);
    const theta = goldenAngle * i;
    points.push({
      x: Math.cos(theta) * radius,
      y,
      z: Math.sin(theta) * radius,
    });
  }
  return points;
}

function uvToSphere(u: number, v: number): Vec3 {
  const theta = u * Math.PI * 2;
  const phi = v * Math.PI;
  return {
    x: Math.sin(phi) * Math.cos(theta),
    y: Math.cos(phi),
    z: Math.sin(phi) * Math.sin(theta),
  };
}

function dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function normalize(v: Vec3): Vec3 {
  const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  if (len === 0) return { x: 0, y: 0, z: 0 };
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

function generateMaps(): { normalMap: THREE.CanvasTexture; roughnessMap: THREE.CanvasTexture; displacementMap: THREE.CanvasTexture } {
  const dimpleCenters = fibonacciSphere(NUM_DIMPLES);

  // Normal map canvas
  const normalCanvas = document.createElement('canvas');
  normalCanvas.width = MAP_WIDTH;
  normalCanvas.height = MAP_HEIGHT;
  const normalCtx = normalCanvas.getContext('2d')!;
  const normalData = normalCtx.createImageData(MAP_WIDTH, MAP_HEIGHT);

  // Roughness map canvas
  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = MAP_WIDTH;
  roughCanvas.height = MAP_HEIGHT;
  const roughCtx = roughCanvas.getContext('2d')!;
  const roughData = roughCtx.createImageData(MAP_WIDTH, MAP_HEIGHT);

  // Displacement map canvas
  const dispCanvas = document.createElement('canvas');
  dispCanvas.width = MAP_WIDTH;
  dispCanvas.height = MAP_HEIGHT;
  const dispCtx = dispCanvas.getContext('2d')!;
  const dispData = dispCtx.createImageData(MAP_WIDTH, MAP_HEIGHT);

  for (let py = 0; py < MAP_HEIGHT; py++) {
    const v = py / MAP_HEIGHT;
    for (let px = 0; px < MAP_WIDTH; px++) {
      const u = px / MAP_WIDTH;
      const pos = uvToSphere(u, v);
      const idx = (py * MAP_WIDTH + px) * 4;

      // Find nearest dimple
      let maxDot = -1;
      let nearestCenter: Vec3 = dimpleCenters[0];
      for (let i = 0; i < dimpleCenters.length; i++) {
        const d = dot(pos, dimpleCenters[i]);
        if (d > maxDot) {
          maxDot = d;
          nearestCenter = dimpleCenters[i];
        }
      }

      const angularDist = Math.acos(Math.min(1, maxDot));
      const t = angularDist / DIMPLE_ANGULAR_RADIUS;

      if (t < 1) {
        // Inside a dimple — compute parabolic depression normal perturbation
        const toCenter: Vec3 = {
          x: nearestCenter.x - pos.x * maxDot,
          y: nearestCenter.y - pos.y * maxDot,
          z: nearestCenter.z - pos.z * maxDot,
        };
        const tangent = normalize(toCenter);

        // Stronger perturbation with a sharper edge profile
        // Use a steeper curve that creates a more defined bowl shape
        const edgeSharpness = t < 0.15 ? t / 0.15 : 1; // sharp rim transition
        const strength = Math.sin(t * Math.PI) * 0.7 * edgeSharpness;

        const phi = v * Math.PI;
        const theta = u * Math.PI * 2;
        const sinPhi = Math.sin(phi);

        // dP/du (tangent)
        const tu: Vec3 = {
          x: -Math.sin(theta) * sinPhi,
          y: 0,
          z: Math.cos(theta) * sinPhi,
        };
        // dP/dv (bitangent)
        const tv: Vec3 = {
          x: Math.cos(theta) * Math.cos(phi),
          y: -Math.sin(phi),
          z: Math.sin(theta) * Math.cos(phi),
        };

        const tuNorm = normalize(tu);
        const tvNorm = normalize(tv);

        const perturbU = dot(tangent, tuNorm) * strength;
        const perturbV = dot(tangent, tvNorm) * strength;

        // Normal map: tangent space
        normalData.data[idx + 0] = Math.round(Math.min(255, Math.max(0, (perturbU * 0.5 + 0.5) * 255)));
        normalData.data[idx + 1] = Math.round(Math.min(255, Math.max(0, (perturbV * 0.5 + 0.5) * 255)));
        normalData.data[idx + 2] = Math.round(Math.sqrt(Math.max(0, 1 - perturbU * perturbU - perturbV * perturbV)) * 255);
        normalData.data[idx + 3] = 255;

        // Dimple interior: slightly less rough than ridges for subtle sheen variation
        const smoothness = 0.5 + 0.1 * (1 - t);
        roughData.data[idx + 0] = Math.round(smoothness * 255);
        roughData.data[idx + 1] = Math.round(smoothness * 255);
        roughData.data[idx + 2] = Math.round(smoothness * 255);
        roughData.data[idx + 3] = 255;

        // Displacement: spherical bowl depression
        // Cosine profile for smooth bowl: deepest at center (t=0), flush at rim (t=1)
        const depth = (Math.cos(t * Math.PI) + 1) * 0.5; // 1 at center, 0 at edge
        const dispValue = Math.round((1 - depth * 0.35) * 255); // darken = inward
        dispData.data[idx + 0] = dispValue;
        dispData.data[idx + 1] = dispValue;
        dispData.data[idx + 2] = dispValue;
        dispData.data[idx + 3] = 255;
      } else {
        // Flat surface (ridge between dimples)
        normalData.data[idx + 0] = 128;
        normalData.data[idx + 1] = 128;
        normalData.data[idx + 2] = 255;
        normalData.data[idx + 3] = 255;

        // Ridge is rougher — matte urethane finish
        roughData.data[idx + 0] = Math.round(0.65 * 255);
        roughData.data[idx + 1] = Math.round(0.65 * 255);
        roughData.data[idx + 2] = Math.round(0.65 * 255);
        roughData.data[idx + 3] = 255;

        // No displacement on ridges (white = full height)
        dispData.data[idx + 0] = 255;
        dispData.data[idx + 1] = 255;
        dispData.data[idx + 2] = 255;
        dispData.data[idx + 3] = 255;
      }
    }
  }

  normalCtx.putImageData(normalData, 0, 0);
  roughCtx.putImageData(roughData, 0, 0);
  dispCtx.putImageData(dispData, 0, 0);

  const normalMap = new THREE.CanvasTexture(normalCanvas);
  normalMap.wrapS = THREE.RepeatWrapping;
  normalMap.wrapT = THREE.RepeatWrapping;

  const roughnessMap = new THREE.CanvasTexture(roughCanvas);
  roughnessMap.wrapS = THREE.RepeatWrapping;
  roughnessMap.wrapT = THREE.RepeatWrapping;

  const displacementMap = new THREE.CanvasTexture(dispCanvas);
  displacementMap.wrapS = THREE.RepeatWrapping;
  displacementMap.wrapT = THREE.RepeatWrapping;

  return { normalMap, roughnessMap, displacementMap };
}

function ensureMaps() {
  if (!cachedNormalMap) {
    const maps = generateMaps();
    cachedNormalMap = maps.normalMap;
    cachedRoughnessMap = maps.roughnessMap;
    cachedDisplacementMap = maps.displacementMap;
  }
}

export function getDimpleNormalMap(): THREE.CanvasTexture {
  ensureMaps();
  return cachedNormalMap!;
}

export function getDimpleRoughnessMap(): THREE.CanvasTexture {
  ensureMaps();
  return cachedRoughnessMap!;
}

export function getDimpleDisplacementMap(): THREE.CanvasTexture {
  ensureMaps();
  return cachedDisplacementMap!;
}
