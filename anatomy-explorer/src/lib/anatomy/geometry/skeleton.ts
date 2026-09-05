/**
 * Parametric body skeleton — the single joint table.
 *
 * Ported from `reference/body-geometry/skeleton.mjs`, which was rendered and
 * visually verified against `reference/body-geometry/verification.png` before
 * being committed. **This file is now the canonical copy** and the reference
 * harness imports it, so there is only ever one joint table (A-006).
 *
 * Every silhouette part and every region hotspot derives from `J` below. Never
 * hand-author a hotspot coordinate: that is how the previous map ended up with
 * the wrist floating off the arm and the lower back tappable over the abdomen.
 * If you change a number here, re-render and look at it:
 *
 *     node reference/body-geometry/render.mjs && open reference/body-geometry/out.html
 *
 * Coordinate space: viewBox "0 0 240 620", centre line x = 120, 8-head canon.
 * head top y=20 · chin y=92 · shoulder y=134 · waist y=238 · crotch y=300
 * knee y=442 · sole y=582
 */

export type Point = readonly [number, number];

export const VIEWBOX = '0 0 240 620';
export const CX = 120;

/**
 * Joints, named anatomically. `L`/`R` are the PATIENT's left and right.
 *
 * On the FRONT view the patient's right appears on the viewer's left (x < 120);
 * on the BACK view that flips, which is handled by mirroring at render time.
 */
export const J = {
  headTop: [120, 20],
  headC: [120, 57],
  chin: [120, 92],
  neckTop: [120, 96],
  neckBase: [120, 122],

  shoulderL: [58, 134],
  shoulderR: [182, 134],
  elbowL: [46, 228],
  elbowR: [194, 228],
  wristL: [40, 314],
  wristR: [200, 314],
  handTipL: [37, 358],
  handTipR: [203, 358],

  chest: [120, 180],
  waist: [120, 238],
  pelvis: [120, 296],

  hipL: [96, 302],
  hipR: [144, 302],
  kneeL: [94, 442],
  kneeR: [146, 442],
  ankleL: [93, 552],
  ankleR: [147, 552],
  toeL: [68, 578],
  toeR: [172, 578],

  /**
   * Outer hip landmark (greater trochanter). The hip hotspot belongs here, on
   * the SIDE of the pelvis — not at the leg root, which sits near the midline
   * where the two sides collide and a patient cannot tell left from right.
   */
  trochL: [80, 296],
  trochR: [160, 296],
} as const satisfies Record<string, Point>;

/** A round-capped capsule between two joints. A zero-length capsule is a disc. */
export const cap = (a: Point, b: Point): string => `M${a[0]} ${a[1]} L${b[0]} ${b[1]}`;

/** Mid-point, optionally biased `t` along a→b. */
export const lerp = (a: Point, b: Point, t = 0.5): Point => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
];

export interface Stroke {
  readonly d: string;
  readonly w: number;
}

/**
 * The body outline: round-capped strokes plus two filled shapes, all the same
 * fill colour so the overlaps read as one body.
 */
export const SILHOUETTE: {
  readonly filled: readonly string[];
  readonly strokes: readonly Stroke[];
} = {
  filled: [
    // head
    'M120 20 C137 20 151 36 151 57 C151 79 137 94 120 94 C103 94 89 79 89 57 C89 36 103 20 120 20 Z',
    // torso: shoulder yoke → chest → waist → pelvis. Symmetric about x=120.
    'M74 134 C96 124 144 124 166 134 L170 182 L158 238 L162 268 L160 300 C150 314 90 314 80 300 L78 268 L82 238 L70 182 Z',
  ],
  strokes: [
    { d: cap(J.neckTop, J.neckBase), w: 32 }, // neck
    { d: cap(J.shoulderL, J.elbowL), w: 30 }, // upper arm
    { d: cap(J.shoulderR, J.elbowR), w: 30 },
    { d: cap(J.elbowL, J.wristL), w: 24 }, // forearm
    { d: cap(J.elbowR, J.wristR), w: 24 },
    { d: cap(J.wristL, J.handTipL), w: 22 }, // hand
    { d: cap(J.wristR, J.handTipR), w: 22 },
    { d: cap(J.hipL, J.kneeL), w: 44 }, // thigh
    { d: cap(J.hipR, J.kneeR), w: 44 },
    { d: cap(J.kneeL, J.ankleL), w: 32 }, // shank
    { d: cap(J.kneeR, J.ankleR), w: 32 },
    { d: cap(J.ankleL, J.toeL), w: 21 }, // foot
    { d: cap(J.ankleR, J.toeR), w: 21 },
  ],
};

/**
 * Interior detail lines — decorative only, and deliberately different front vs
 * back so a patient can tell the two views apart at a glance without reading
 * the label.
 */
export const DETAIL: { readonly front: readonly string[]; readonly back: readonly string[] } = {
  front: [
    'M120 140 L120 292', // sternum / linea alba
    'M96 178 C108 190 132 190 144 178', // pectoral line
    'M100 248 C110 256 130 256 140 248', // navel line
    'M100 440 L114 440 M126 440 L140 440', // knee creases
  ],
  back: [
    'M120 132 L120 300', // spine
    'M92 150 L120 142 L148 150', // scapular spine
    'M96 186 C108 176 132 176 144 186', // inferior scapula
    'M92 292 C106 306 134 306 148 292', // gluteal fold
    'M100 452 L114 452 M126 452 L140 452', // popliteal creases
  ],
};
