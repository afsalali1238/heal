/**
 * Deterministic demonstration figures for every published item — A-019 in production.
 *
 * ── What this is ─────────────────────────────────────────────────────────────
 * Each entry translates the clinician's OWN movement text for one item into a
 * start/end pair of joint angles for the pose rig (`lib/anatomy/geometry/pose.ts`).
 * Segment lengths come from the shared joint table, every angle is clamped to
 * an anatomical range, and `scripts/generate-figures.mjs` refuses to build when
 * any angle is out of range, non-finite, or outside the focus crop. A review
 * comment is an edit to one number here — never a regeneration.
 *
 * ── What this is not ─────────────────────────────────────────────────────────
 * Clinical content. The instruction is the item's reviewed text; the figure is
 * a schematic of the joint action inside it. Figures render with an honest
 * caption ("Illustration of the written steps · awaiting physiotherapist
 * picture check") and are logged in the media ledger as draft until the
 * physiotherapist gives visual sign-off (L5). Text remains authoritative.
 *
 * ── Rig limits, stated plainly ──────────────────────────────────────────────
 * The rig has no wrist, ankle, or spinal-rotation joints, and the front view
 * draws straight legs (hip/knee angles apply in the side view only). So:
 *  - ankle/wrist items show the limb in position with a direction arrow;
 *  - hip/knee/lying items use the side view, where leg angles work;
 *  - trunk rotation (str-lowerback-02) is shown as the tucked-knee position
 *    with a sideways arrow, not as rotation.
 * Where the rig cannot show something, the arrow and the written steps carry it.
 * Side-view entries MUST use the `*L` angle keys (the rig poses the left side).
 */

import type { PoseAngles, PoseView } from '../../lib/anatomy/geometry/pose.ts';

export type FigureSupport = 'none' | 'chair' | 'wall' | 'wall-front' | 'floor';

export interface FigureArrow {
  /** [x, y] in figure coordinates (standing space, viewBox "0 0 240 620"). */
  readonly from: readonly [number, number];
  readonly to: readonly [number, number];
  /** Double-headed (e.g. pump up AND down). */
  readonly double?: boolean;
}

export interface ExerciseFigureSpec {
  readonly view: PoseView;
  /** Start position, from the item's start_position_en. */
  readonly start: PoseAngles;
  /** End position, from the item's movement_en. Equal to start when the rig cannot travel. */
  readonly end: PoseAngles;
  /** SVG viewBox crop: [x, y, width, height]. Tight per-pose framing (A-019). */
  readonly focus: readonly [number, number, number, number];
  readonly arrow: FigureArrow | null;
  /** Soft highlight behind the working joint: [x, y, radius]. */
  readonly halo: readonly [number, number, number];
  readonly support: FigureSupport;
}

const ARROW_UP = (x: number, y0: number, y1: number): FigureArrow => ({
  from: [x, y0],
  to: [x, y1],
});

export const EXERCISE_FIGURES: Record<string, ExerciseFigureSpec> = {
  /* ── neck · side view reads; chin tuck ONLY reads from the side ── */
  'ex-neck-01': {
    view: 'side', start: { head: -18 }, end: { head: 26 },
    focus: [50, 30, 140, 170],
    arrow: { from: [158, 52], to: [158, 118], double: true },
    halo: [120, 100, 34], support: 'chair',
  },
  'ex-neck-02': {
    view: 'side', start: { chinSlide: 12 }, end: { chinSlide: -10 },
    focus: [56, 44, 128, 120],
    arrow: { from: [158, 84], to: [124, 84] },
    halo: [120, 104, 30], support: 'chair',
  },
  'str-neck-01': {
    view: 'front', start: {}, end: { head: -32 },
    focus: [52, 36, 136, 150],
    arrow: { from: [90, 58], to: [70, 88] },
    halo: [120, 100, 34], support: 'chair',
  },
  'str-neck-02': {
    view: 'front', start: {}, end: { head: -22 },
    focus: [52, 36, 136, 150],
    arrow: { from: [94, 54], to: [72, 82] },
    halo: [112, 100, 32], support: 'chair',
  },
  /* ── shoulder / elbow / wrist ── */
  'ex-shoulder-01': {
    view: 'front', start: { shoulderL: 10, shoulderR: 10, elbowL: 12, elbowR: 12 },
    end: { shoulderL: 62, shoulderR: 62, elbowL: 28, elbowR: 28 },
    focus: [30, 90, 180, 190],
    arrow: { from: [176, 158], to: [192, 112] },
    halo: [154, 150, 36], support: 'none',
  },
  'ex-elbow-01': {
    view: 'front', start: { shoulderR: 8, elbowR: 8 }, end: { shoulderR: 8, elbowR: 120 },
    focus: [84, 150, 140, 200],
    arrow: { from: [168, 300], to: [222, 196] },
    halo: [160, 230, 28], support: 'none',
  },
  'str-elbow-01': {
    view: 'front', start: { shoulderR: 150, elbowR: 110 }, end: { shoulderR: 163, elbowR: 130 },
    focus: [44, 0, 176, 220],
    arrow: { from: [196, 60], to: [184, 40] },
    halo: [166, 60, 30], support: 'none',
  },
  'ex-wrist-01': {
    // No wrist joint in the rig: arm forward, arrow carries the curl.
    view: 'side', start: { shoulderL: 90, elbowL: 10 }, end: { shoulderL: 90, elbowL: 10 },
    focus: [190, 50, 170, 150],
    arrow: ARROW_UP(299, 142, 104),
    halo: [292, 122, 26], support: 'none',
  },
  'str-wrist-01': {
    view: 'side', start: { shoulderL: 90, elbowL: 5 }, end: { shoulderL: 90, elbowL: 5 },
    focus: [190, 50, 170, 150],
    arrow: { from: [299, 122], to: [299, 162] },
    halo: [292, 126, 26], support: 'none',
  },
  /* ── ankle: no ankle joint — position + arrow ── */
  'ex-ankle-01': {
    view: 'side', start: {}, end: {},
    focus: [70, 460, 140, 140],
    arrow: { from: [150, 524], to: [150, 564], double: true },
    halo: [132, 548, 28], support: 'floor',
  },
  'ex-ankle-02': {
    view: 'side', start: {}, end: {},
    focus: [50, 450, 150, 150],
    arrow: ARROW_UP(132, 562, 524),
    halo: [128, 548, 28], support: 'floor',
  },
  'str-ankle-01': {
    view: 'side', start: { hipL: 12, kneeL: 8, trunk: 6 }, end: { hipL: 24, kneeL: 18, trunk: 12 },
    focus: [50, 250, 270, 320],
    arrow: { from: [250, 420], to: [272, 470] },
    halo: [150, 500, 34], support: 'wall-front',
  },
  /* ── hip ── */
  'ex-hip-01': {
    view: 'side', start: { hipL: 5 }, end: { hipL: 45 },
    focus: [90, 270, 220, 230],
    arrow: { from: [210, 380], to: [232, 330] },
    halo: [130, 312, 38], support: 'floor',
  },
  'ex-hip-02': {
    // Clamshell rotation is outside the rig; shown as a small opening.
    view: 'side', start: { hipL: 15, kneeL: 70 }, end: { hipL: 34, kneeL: 70 },
    focus: [30, 260, 200, 260],
    arrow: { from: [150, 400], to: [168, 366] },
    halo: [130, 312, 36], support: 'floor',
  },
  'ex-hip-03': {
    view: 'side', start: { hipL: 80, kneeL: 75 }, end: { hipL: 5, kneeL: 10 },
    focus: [70, 230, 240, 340],
    arrow: ARROW_UP(130, 330, 282),
    halo: [126, 302, 38], support: 'floor',
  },
  'str-hip-01': {
    view: 'side', start: { hipL: 55, kneeL: 65 }, end: { hipL: 72, kneeL: 82 },
    focus: [50, 230, 250, 310],
    arrow: { from: [220, 340], to: [244, 300] },
    halo: [130, 308, 36], support: 'floor',
  },
  'str-hip-02': {
    view: 'side', start: { hipL: 20, kneeL: 15 }, end: { hipL: 33, kneeL: 20 },
    focus: [50, 240, 260, 320],
    arrow: { from: [200, 380], to: [224, 340] },
    halo: [128, 308, 36], support: 'chair',
  },
  /* ── knee ── */
  'ex-knee-01': {
    view: 'side', start: { hipL: 5, kneeL: 5 }, end: { hipL: 45, kneeL: 0 },
    focus: [70, 250, 250, 310],
    arrow: { from: [220, 420], to: [244, 372] },
    halo: [126, 440, 34], support: 'floor',
  },
  'ex-knee-02': {
    view: 'side', start: { hipL: 85, kneeL: 85 }, end: { hipL: 85, kneeL: 5 },
    focus: [80, 220, 310, 230],
    arrow: { from: [300, 400], to: [352, 322] },
    halo: [258, 296, 32], support: 'chair',
  },
  'ex-knee-03': {
    view: 'side', start: {}, end: { hipL: 45, kneeL: 45 },
    focus: [30, 190, 330, 380],
    arrow: { from: [120, 300], to: [120, 348] },
    halo: [124, 440, 34], support: 'wall',
  },
  'str-knee-01': {
    view: 'side', start: { kneeL: 95 }, end: { kneeL: 125 },
    focus: [-14, 330, 220, 170],
    arrow: { from: [24, 440], to: [44, 396] },
    halo: [60, 430, 30], support: 'chair',
  },
  'str-knee-02': {
    view: 'side', start: { hipL: 65, kneeL: 8, trunk: 6 }, end: { hipL: 70, kneeL: 5, trunk: 16 },
    focus: [50, 190, 310, 290],
    arrow: { from: [150, 200], to: [168, 232] },
    halo: [200, 420, 34], support: 'chair',
  },
  /* ── lower back ── */
  'ex-lowerback-01': {
    // Pelvic tilt is centimetres; the figure shows the braced position.
    view: 'side', start: { trunk: 6 }, end: { trunk: -4 },
    focus: [30, 170, 180, 190],
    arrow: { from: [120, 250], to: [120, 272], double: true },
    halo: [120, 250, 40], support: 'floor',
  },
  'ex-lowerback-02': {
    view: 'side', start: { trunk: 55, shoulderL: 5, hipL: 85, kneeL: 85 },
    end: { trunk: 55, shoulderL: 150, hipL: 10, kneeL: 5 },
    focus: [30, 140, 350, 310],
    arrow: { from: [250, 200], to: [290, 170] },
    halo: [150, 240, 40], support: 'floor',
  },
  'str-lowerback-01': {
    view: 'side', start: { hipL: 45, kneeL: 65 }, end: { hipL: 70, kneeL: 90 },
    focus: [50, 220, 240, 310],
    arrow: { from: [200, 360], to: [224, 322] },
    halo: [128, 306, 36], support: 'floor',
  },
  'str-lowerback-02': {
    // Spinal rotation is outside the rig; tucked position + sideways arrow.
    view: 'side', start: { hipL: 55, kneeL: 65 }, end: { hipL: 55, kneeL: 65 },
    focus: [30, 240, 230, 260],
    arrow: { from: [200, 380], to: [160, 380], double: true },
    halo: [128, 306, 36], support: 'floor',
  },
};

/** Item ids without a figure spec — the figure gate fails the build on these. */
export function figuresMissing(ids: readonly string[]): string[] {
  return ids.filter((id) => !(id in EXERCISE_FIGURES));
}

/**
 * Two image_ids use the hyphenated area slug (`ex-lower-back-01`) while the
 * item ids do not (`ex-lowerback-01`). The specs are keyed by item id; this
 * maps an image_id to the item id whose spec illustrates it.
 */
const FIGURE_ALIASES: Record<string, string> = {
  'ex-lower-back-01': 'ex-lowerback-01',
  'ex-lower-back-02': 'ex-lowerback-02',
  'str-lower-back-01': 'str-lowerback-01',
  'str-lower-back-02': 'str-lowerback-02',
};

/** Item id whose figure illustrates `imageId`, or undefined. */
export function figureItemFor(imageId: string): string | undefined {
  if (imageId in EXERCISE_FIGURES) return imageId;
  const aliased = FIGURE_ALIASES[imageId];
  return aliased && aliased in EXERCISE_FIGURES ? aliased : undefined;
}
