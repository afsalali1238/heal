export interface BodyRegionVisual {
  readonly regionId: string;
  readonly meshNames: readonly string[];
  readonly hitMeshNames: readonly string[];
  readonly cameraPreset: 'neck' | 'shoulder-left' | 'shoulder-right';
}

/** Stable application IDs mapped to the current prototype GLB. */
export const BODY_REGION_VISUALS: readonly BodyRegionVisual[] = [
  {
    regionId: 'neck',
    meshNames: ['region-neck'],
    hitMeshNames: ['region-neck'],
    cameraPreset: 'neck',
  },
  {
    regionId: 'shoulder-l',
    meshNames: ['region-shoulder-l'],
    hitMeshNames: ['region-shoulder-l'],
    cameraPreset: 'shoulder-left',
  },
  {
    regionId: 'shoulder-r',
    meshNames: ['region-shoulder-r'],
    hitMeshNames: ['region-shoulder-r'],
    cameraPreset: 'shoulder-right',
  },
];

export const CAMERA_PRESETS = {
  // Keep the head and both shoulder landmarks in frame so a patient can read
  // the selected area as a location on a body, not as an isolated mesh.
  neck: { position: [0, 1.75, 4.35], target: [0, 1.55, 0] },
  'shoulder-left': { position: [-0.55, 1.5, 4.1], target: [-0.35, 1.25, 0] },
  'shoulder-right': { position: [0.55, 1.5, 4.1], target: [0.35, 1.25, 0] },
  full: { position: [0, 1.2, 5.5], target: [0, 0.45, 0] },
} as const;
