export interface MotionAsset {
  readonly exerciseId: string;
  readonly motionPath: string;
  readonly posterPath: string;
  readonly durationSeconds: number;
  readonly loop: boolean;
  readonly cameraView: 'front' | 'side' | 'three-quarter';
  readonly status: 'prototype' | 'draft' | 'approved' | 'retired';
  readonly sourceUrl: string;
  readonly generationMethod: 'manual' | 'mocap' | 'licensed-footage' | 'ai-prototype';
  readonly license: string;
  readonly attribution: string;
  readonly replacementRequired: boolean;
  readonly referenceSources: readonly string[];
  readonly fileHash: string;
  readonly reviewedBy: string;
  readonly reviewedDate: string;
}

export const MOTION_ASSETS: readonly MotionAsset[] = [
  {
    exerciseId: 'ex-neck-02',
    motionPath: '/exercise-media/prototypes/ex-neck-02/ex-neck-02-motion.mp4',
    posterPath: '/exercise-media/prototypes/ex-neck-02/ex-neck-02-poster.png',
    durationSeconds: 4,
    loop: false,
    cameraView: 'side',
    status: 'prototype',
    sourceUrl: 'Deterministic pose interpolation from the internal joint-angle figure',
    generationMethod: 'manual',
    license: 'Internal prototype only',
    attribution: 'Anatomy Explorer prototype production',
    replacementRequired: true,
    referenceSources: [],
    fileHash: '6414de80a073ec08f9a63548abadcae82881ccef18721310ccd4c48687da5dec',
    reviewedBy: '',
    reviewedDate: '',
  },
];

/** Patient surfaces may request only independently reviewed motion. */
export function getApprovedMotion(exerciseId: string): MotionAsset | undefined {
  return MOTION_ASSETS.find(
    (asset) => asset.exerciseId === exerciseId && asset.status === 'approved'
  );
}

/** Prototype motion is deliberately available only to explicit preview routes. */
export function getPreviewMotion(exerciseId: string): MotionAsset | undefined {
  return MOTION_ASSETS.find(
    (asset) => asset.exerciseId === exerciseId && asset.status !== 'retired'
  );
}
