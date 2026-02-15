// Print zone: the rectangular area on the ball where logos/text can be printed
// Centered on the front face (azimuth = π/2)

export const PRINT_ZONE = {
  centerAzimuth: Math.PI / 2,
  centerElevation: 0,
  halfAzimuth: 0.60,   // ~34° each side (1.5x)
  halfElevation: 0.60, // ~34° each side (1.5x)
} as const;

export const NUDGE_STEP = 0.05; // radians

// Extra padding beyond the visual border so elements can be dragged partially off-edge
// The stencil mask handles visual clipping, so this just makes dragging feel natural
const DRAG_PADDING = 0;

export function clampAzimuth(azimuth: number): number {
  const min = PRINT_ZONE.centerAzimuth - PRINT_ZONE.halfAzimuth - DRAG_PADDING;
  const max = PRINT_ZONE.centerAzimuth + PRINT_ZONE.halfAzimuth + DRAG_PADDING;
  return Math.max(min, Math.min(max, azimuth));
}

export function clampElevation(elevation: number): number {
  const min = PRINT_ZONE.centerElevation - PRINT_ZONE.halfElevation - DRAG_PADDING;
  const max = PRINT_ZONE.centerElevation + PRINT_ZONE.halfElevation + DRAG_PADDING;
  return Math.max(min, Math.min(max, elevation));
}

export function clampToZone(azimuth: number, elevation: number): { azimuth: number; elevation: number } {
  return {
    azimuth: clampAzimuth(azimuth),
    elevation: clampElevation(elevation),
  };
}
