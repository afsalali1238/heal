/**
 * A posable figure, driven by joint ANGLES rather than coordinates.
 *
 * Not used by the build. The patient-facing figures come from
 * `src/lib/anatomy/poses.ts` + `movement.ts` and are gated by `scripts/check-poses.ts`;
 * this module is the earlier prototype, kept because the geometry it derives is still
 * the clearest way to eyeball a joint chain. Do not author shipped poses here.
 *
 * ── Why angles, and why this exists ────────────────────────────────────────
 * D-015 rejected AI-generated demonstration images after five of nine came back
 * clinically wrong — and, the part that matters, **all nine looked professional**.
 * The chin tuck was rendered in the exact forward-head posture the exercise
 * corrects. A photoreal generator produces confident, plausible, wrong anatomy,
 * and no amount of prompt work makes that failure mode visible.
 *
 * This is the other approach. A pose is a small set of joint angles. Segment
 * lengths come from the same joint table that draws the body map (A-006), so:
 *
 *   - a limb cannot change length, because length is not an input;
 *   - a joint cannot bend further than a person can, because every angle is
 *     clamped to a documented range;
 *   - the figure is identical across all ~110 items by construction, which is
 *     what `PRD.md` §8 actually asks for ("consistency matters more than any
 *     single image being beautiful");
 *   - a review comment becomes an edit to one number, not a regeneration.
 *
 * It also dissolves D2 — the unanswered question about demonstrator gender and
 * clothing that has blocked all ~100 images since 2026-08-23. A neutral
 * stylised figure has neither.
 *
 * ── What this deliberately cannot do ───────────────────────────────────────
 * Fine hand placement, soft-tissue contact, facial cues, and anything where the
 * *texture* of the position carries the instruction. Those items need a
 * photograph. This rig is for the 80% where the instruction is "which way does
 * the joint move, and how far".
 */

import { J, type Point } from './skeleton.ts';

/** Sagittal is the side view. Many neck and spine exercises are only legible there. */
export type PoseView = 'front' | 'side';

/** Degrees, measured from the segment's neutral direction. Positive is documented per joint. */
export interface PoseAngles {
  /** Head tilt. Front: + tilts toward the patient's left ear. Side: + looks down. */
  head?: number;
  /** Cervical translation, side view only. + is chin forward, − is chin tucked. */
  chinSlide?: number;
  /** Trunk lean. Front: + leans left. Side: + leans forward. */
  trunk?: number;
  /** Shoulder elevation, patient's left. + raises the arm away from the body. */
  shoulderL?: number;
  shoulderR?: number;
  /** Elbow flexion. 0 straight, + bends. Clamped at 150. */
  elbowL?: number;
  elbowR?: number;
  /** Hip flexion. 0 standing, + raises the thigh forward. */
  hipL?: number;
  hipR?: number;
  /** Knee flexion. 0 straight, + bends the heel back. Clamped at 140. */
  kneeL?: number;
  kneeR?: number;
}

/** Anatomical limits. A pose outside these is a typo, not a position. */
const LIMITS: Record<keyof PoseAngles, readonly [number, number]> = {
  head: [-55, 55],
  chinSlide: [-14, 18],
  trunk: [-40, 60],
  shoulderL: [-20, 180],
  shoulderR: [-20, 180],
  elbowL: [0, 150],
  elbowR: [0, 150],
  hipL: [-25, 120],
  hipR: [-25, 120],
  kneeL: [0, 140],
  kneeR: [0, 140],
};

export function clampPose(pose: PoseAngles): PoseAngles {
  const out: PoseAngles = {};
  for (const [key, value] of Object.entries(pose) as [keyof PoseAngles, number][]) {
    if (value === undefined) continue;
    const [lo, hi] = LIMITS[key];
    out[key] = Math.max(lo, Math.min(hi, value));
  }
  return out;
}

/** Which angles in a pose were out of range — used by `check:figures`. */
export function poseViolations(pose: PoseAngles): string[] {
  const out: string[] = [];
  for (const [key, value] of Object.entries(pose) as [keyof PoseAngles, number][]) {
    if (value === undefined) continue;
    const [lo, hi] = LIMITS[key];
    if (value < lo || value > hi)
      out.push(`${key}=${value}° is outside the anatomical range ${lo}..${hi}`);
  }
  return out;
}

// ── segment lengths, measured once from the shared joint table ──────────────
const dist = (a: Point, b: Point) => Math.hypot(b[0] - a[0], b[1] - a[1]);

const SEG = {
  neck: dist(J.neckBase, J.neckTop),
  headR: 37,
  spine: dist(J.pelvis, J.neckBase),
  upperArm: dist(J.shoulderL, J.elbowL),
  foreArm: dist(J.elbowL, J.wristL),
  hand: dist(J.wristL, J.handTipL),
  thigh: dist(J.hipL, J.kneeL),
  shank: dist(J.kneeL, J.ankleL),
  foot: 26,
  shoulderHalf: (J.shoulderR[0] - J.shoulderL[0]) / 2,
  hipHalf: (J.hipR[0] - J.hipL[0]) / 2,
};

const rad = (deg: number) => (deg * Math.PI) / 180;

/** Walk `len` from `origin` at `deg`, where 0° points down the page. */
function step(origin: Point, deg: number, len: number): Point {
  return [origin[0] + Math.sin(rad(deg)) * len, origin[1] + Math.cos(rad(deg)) * len];
}

export interface PosedFigure {
  readonly view: PoseView;
  readonly headCentre: Point;
  readonly headRadius: number;
  /** Ordered chains, each drawn as a round-capped polyline. */
  readonly limbs: readonly { readonly points: readonly Point[]; readonly width: number }[];
  readonly torso: readonly Point[];
}

/**
 * Build the figure for a pose. Everything downstream of a joint moves with it,
 * so there is no way to draw a forearm detached from its elbow.
 */
export function buildFigure(rawPose: PoseAngles, view: PoseView): PosedFigure {
  const p = clampPose(rawPose);
  const side = view === 'side';

  // Angle convention: 0° points DOWN the page, positive swings toward +x.
  // A hanging arm is therefore ~0°, an arm out to the side is ~90°, overhead
  // ~170°. Getting this backwards is what made the first render draw a figure
  // with both arms in the air.
  const pelvis: Point = [120, 300];

  const trunkAngle = 180 + (p.trunk ?? 0) * (side ? 1 : -1);
  const neckBase = step(pelvis, trunkAngle, SEG.spine);
  const headAngle = trunkAngle + (p.head ?? 0) * (side ? 1 : -1);
  const neckTop = step(neckBase, headAngle, SEG.neck);

  // Chin slide is a translation, not a rotation — that is exactly what makes a
  // chin tuck a chin tuck rather than a nod, and it only reads from the side.
  const slide = side ? (p.chinSlide ?? 0) : 0;
  const headCentre: Point = step(neckTop, headAngle, SEG.headR * 0.62);
  const head: Point = [headCentre[0] + slide, headCentre[1]];

  const limbs: { points: Point[]; width: number }[] = [];

  // Neck is its own segment so the head is never a blob floating off a stick.
  limbs.push({ points: [neckBase, neckTop], width: 22 });

  const shoulderHalf = side ? 0 : 34;
  const hipHalf = side ? 0 : 22;

  const arm = (sign: -1 | 1, shoulderDeg: number, elbowDeg: number) => {
    const shoulder: Point = [neckBase[0] + sign * shoulderHalf, neckBase[1] + 10];
    const dir = side ? 1 : sign;
    const upper = dir * shoulderDeg;
    const elbow = step(shoulder, upper, SEG.upperArm);
    const fore = upper + dir * elbowDeg;
    const wrist = step(elbow, fore, SEG.foreArm);
    const tip = step(wrist, fore, SEG.hand);
    limbs.push({ points: [shoulder, elbow, wrist, tip], width: 15 });
  };

  const leg = (sign: -1 | 1, hipDeg: number, kneeDeg: number) => {
    const hip: Point = [pelvis[0] + sign * hipHalf, pelvis[1] + 4];
    const thighDeg = side ? hipDeg : sign * 3;
    const knee = step(hip, thighDeg, SEG.thigh);
    const shankDeg = thighDeg - (side ? kneeDeg : sign * 1);
    const ankle = step(knee, shankDeg, SEG.shank);
    limbs.push({ points: [hip, knee, ankle], width: 19 });
    // Foot points forward in the side view, outward at the front.
    const toe: Point = [ankle[0] + (side ? SEG.foot : sign * SEG.foot * 0.7), ankle[1] + 9];
    limbs.push({ points: [ankle, toe], width: 13 });
  };

  // Side view draws one arm and one leg; two would overlap into a smear.
  if (side) {
    arm(1, p.shoulderL ?? p.shoulderR ?? 6, p.elbowL ?? p.elbowR ?? 8);
    leg(1, p.hipL ?? 0, p.kneeL ?? 0);
  } else {
    arm(-1, p.shoulderL ?? 7, p.elbowL ?? 5);
    arm(1, p.shoulderR ?? 7, p.elbowR ?? 5);
    leg(-1, p.hipL ?? 0, p.kneeL ?? 0);
    leg(1, p.hipR ?? 0, p.kneeR ?? 0);
  }

  // Torso: shoulder line down to hip line, only mildly tapered. The first
  // version used the full shoulder-to-hip ratio from the joint table and drew a
  // wedge that read as a dress.
  const sw = side ? 15 : 30;
  const hw = side ? 14 : 23;
  const sx = neckBase[0],
    sy = neckBase[1] + 6;
  const hx = pelvis[0],
    hy = pelvis[1] + 4;
  const torso: Point[] = [
    [sx - sw, sy],
    [sx + sw, sy],
    [hx + hw, hy],
    [hx - hw, hy],
  ];

  return { view, headCentre: head, headRadius: SEG.headR * 0.6, limbs, torso };
}

/** SVG path for one limb chain. */
export function limbPath(points: readonly Point[]): string {
  return points
    .map((pt, i) => `${i === 0 ? 'M' : 'L'}${pt[0].toFixed(1)} ${pt[1].toFixed(1)}`)
    .join(' ');
}

export function torsoPath(points: readonly Point[]): string {
  return `${limbPath(points)} Z`;
}

/**
 * Interpolate between two poses. This is what makes motion nearly free: a
 * movement is already two poses, and the in-between frames are the same
 * function that positions a joint in the first place.
 */
export function tweenPose(from: PoseAngles, to: PoseAngles, t: number): PoseAngles {
  const keys = new Set([...Object.keys(from), ...Object.keys(to)] as (keyof PoseAngles)[]);
  const out: PoseAngles = {};
  for (const key of keys) {
    const a = from[key] ?? 0;
    const b = to[key] ?? 0;
    out[key] = a + (b - a) * t;
  }
  return out;
}
