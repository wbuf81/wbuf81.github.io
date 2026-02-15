'use client';

import { useMemo } from 'react';
import * as THREE from 'three';

export default function GolfTee() {
  const geometry = useMemo(() => {
    // Tee cross-section profile points (x = radius, y = height)
    // Starting from bottom tip, going up through the shaft to the cup
    const points = [
      new THREE.Vector2(0.01, -0.8),   // Bottom tip
      new THREE.Vector2(0.04, -0.75),   // Tip flare
      new THREE.Vector2(0.03, -0.7),    // Shaft start
      new THREE.Vector2(0.03, -0.1),    // Shaft top
      new THREE.Vector2(0.06, 0.0),     // Cup flare begin
      new THREE.Vector2(0.12, 0.05),    // Cup mid
      new THREE.Vector2(0.18, 0.08),    // Cup rim outer
      new THREE.Vector2(0.16, 0.1),     // Cup rim top
      new THREE.Vector2(0.10, 0.08),    // Cup inner
    ];
    return new THREE.LatheGeometry(points, 32);
  }, []);

  return (
    <mesh geometry={geometry} position={[0, -1.05, 0]}>
      <meshStandardMaterial
        color="#c4956a"
        roughness={0.7}
        metalness={0}
      />
    </mesh>
  );
}
