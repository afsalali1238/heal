/**
 * The kinematics of a movement figure, in one place, for both outputs.
 *
 * A figure is drawn twice in this project: once by `scripts/render-item-figures.ts`,
 * which writes the standalone animated SVG that a print or a screenshot gets, and
 * once by `components/exercise/MovementFigure.astro`, which is live on the page at
 * the size the card actually is. Those two must not own separate arithmetic — a
 * duplicated `solve()` is how an animation and its own print fallback disagree.
 *
 * So this module answers three questions and nothing else:
 *   - `frameAt(plan, t)`   — what does the body look like at time `t` of the cycle?
 *   - `boneTimeline(plan)` — when does each bone move, and how far? (the keyframes)
 *   - `sceneFor(plan, t)`  — what strokes and dots draw that frame?
 * The renderer serialises them to SVG. The component animates between them. Same
 * numbers, one source.
 */

import {
  BONES,
  POSTURES,
  planFor,
  type JointName,
  type MotionPlan,
  type Posture,
  type Step,
} from './poses';
import type { Point } from './geometry/skeleton';

export interface Frame {
  /** Bone → angle relative to its posture baseline. */
  readonly angles: Record<string, number>;
  /** Bone → translation, for the moves that must not be drawn as a tip. */
  readonly slides: Record<string, Point>;
}

/** Which bones a step moves. `bothSides` mirrors a limb onto its partner. */
export function bonesFor(step: Step): string[] {
  const base = step.bone;
  if (!step.bothSides) return [base];
  const partner = base.endsWith('L') ? `${base.slice(0, -1)}R` : `${base.slice(0, -1)}L`;
  const names = new Set([base, partner]);
  return [...names].filter((name) => BONES.some((bone) => bone.name === name));
}

/** Cycle length in seconds. Presentation only — dosage lives in the guide. */
export const CYCLE_SECONDS = 4.4;

interface Mark {
  readonly start: number;
  readonly end: number;
  readonly hold: number;
  readonly step: Step;
}

/**
 * Where each step sits on the cycle. `dwell` is the share of the cycle spent holding
 * the far end, so a row that says "hold" reads as arriving and staying rather than
 * bouncing. No seconds are encoded: the fraction is a shape, not a dosage.
 */
export function marksFor(plan: MotionPlan): Mark[] {
  const total = plan.steps.reduce((sum, step) => sum + 1 + (step.dwell ?? 0.1), 0) || 1;
  const marks: Mark[] = [];
  let cursor = 0;
  for (const step of plan.steps) {
    const move = 1 / total;
    const dwell = (step.dwell ?? 0.1) / total;
    marks.push({ start: cursor, end: cursor + move, hold: cursor + move + dwell, step });
    cursor += move + dwell;
  }
  return marks;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * The pose at time `t` (0–1 of the cycle). Triangular interpolation inside a step,
 * flat between steps: the body is only ever where the reviewed words put it.
 */
export function frameAt(plan: MotionPlan, t: number): Frame {
  const posture = POSTURES[plan.posture];
  const angles: Record<string, number> = { ...posture.angles };
  const slides: Record<string, Point> = {};
  const time = Math.min(Math.max(t, 0), 1);

  for (const mark of marksFor(plan)) {
    for (const bone of bonesFor(mark.step)) {
      const step = mark.step;
      const base = posture.angles[bone] ?? 0;
      if (time <= mark.start) {
        angles[bone] = angles[bone] ?? base;
        continue;
      }
      if (time >= mark.hold) {
        angles[bone] = step.to;
        if (step.slide) slides[bone] = step.slide.to;
        continue;
      }
      if (time <= mark.end) {
        const k = mark.end === mark.start ? 1 : (time - mark.start) / (mark.end - mark.start);
        angles[bone] = lerp(step.from, step.to, k);
        if (step.slide) {
          slides[bone] = [
            lerp(step.slide.from[0], step.slide.to[0], k),
            lerp(step.slide.from[1], step.slide.to[1], k),
          ];
        }
      } else {
        angles[bone] = step.to;
        if (step.slide) slides[bone] = step.slide.to;
      }
    }
  }
  return { angles, slides };
}

export interface Stop {
  readonly t: number;
  readonly deg: number;
  readonly slide: Point;
}

/**
 * Per-bone keyframes, as fractions of the cycle. The renderer turns these into CSS
 * `@keyframes`; the component hands them to `Element.animate`. One table, both uses.
 */
export function boneTimeline(plan: MotionPlan): Map<string, Stop[]> {
  const posture = POSTURES[plan.posture];
  const bones = [...new Set(plan.steps.flatMap((step) => bonesFor(step)))];
  const result = new Map<string, Stop[]>();

  for (const bone of bones) {
    const base = posture.angles[bone] ?? 0;
    const stops: Stop[] = [{ t: 0, deg: base, slide: [0, 0] }];
    for (const mark of marksFor(plan)) {
      if (!bonesFor(mark.step).includes(bone)) {
        const last = stops[stops.length - 1];
        stops.push({ t: mark.hold, deg: last.deg, slide: last.slide });
        continue;
      }
      const { step } = mark;
      stops.push({ t: mark.start, deg: step.from, slide: step.slide ? step.slide.from : [0, 0] });
      stops.push({ t: mark.end, deg: step.to, slide: step.slide ? step.slide.to : [0, 0] });
      if (mark.hold > mark.end) {
        stops.push({ t: mark.hold, deg: step.to, slide: step.slide ? step.slide.to : [0, 0] });
      }
    }
    const first = stops[0];
    stops.push({ t: 1, deg: first.deg, slide: first.slide });

    // Percentages are quantised to 0.1% so the same plan always writes the same
    // bytes; without this a float tail makes regenerated files look hand-edited.
    const merged = new Map<number, Stop>();
    for (const stop of stops) {
      const t = Math.round(Math.min(1, Math.max(0, stop.t)) * 1000) / 10;
      merged.set(t, stop);
    }
    result.set(
      bone,
      [...merged.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([t, stop]) => ({ t, deg: stop.deg - base, slide: stop.slide }))
    );
  }
  return result;
}

// ── Geometry ───────────────────────────────────────────────────────────────

export interface Pose {
  readonly abs: Record<string, number>;
  readonly joints: Record<string, Point>;
}

const rad = (deg: number) => (deg * Math.PI) / 180;
const rnd = (n: number) => Math.round(n * 10) / 10;

/** Front-facing plans separate the two hips; side views keep them stacked. */
const HIP_SPREAD = 31;
const SIDE_STACK = 5;

export function poseJoints(posture: Posture, frame: Frame, view: 'side' | 'front' = 'side'): Pose {
  const abs: Record<string, number> = {};
  const joints: Record<string, Point> = {};

  for (const bone of BONES) {
    const anchor =
      bone.parent && bone.from !== 'root' && 'bone' in bone.from
        ? (joints[`${bone.from.bone}:${bone.from.at}`] ?? posture.root)
        : posture.root;
    const spread = view === 'front' ? HIP_SPREAD : SIDE_STACK;
    const lateral = bone.name.endsWith('R') ? spread : bone.name.endsWith('L') ? -spread : 0;
    const slide = frame.slides[bone.name] ?? [0, 0];
    // `posture.tilt` belongs to the root only. Adding it per bone is how a lying
    // figure ended up with every limb spun a further quarter turn — and the output
    // still looked plausible, which is why it took a render to notice.
    const parentAbs = bone.parent ? (abs[bone.parent] ?? 0) : -90 + posture.tilt;
    const own = parentAbs + bone.base + (frame.angles[bone.name] ?? 0);
    abs[bone.name] = own;
    const start: Point = [round2(anchor[0] + lateral + slide[0]), round2(anchor[1] + slide[1])];
    const end: Point = [
      round2(start[0] + Math.cos(rad(own)) * bone.length),
      round2(start[1] + Math.sin(rad(own)) * bone.length),
    ];
    joints[`${bone.name}:start`] = start;
    joints[`${bone.name}:end`] = end;
  }
  return { abs, joints };
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function viewFor(plan: MotionPlan): 'side' | 'front' {
  return plan.view ?? POSTURES[plan.posture].view ?? 'side';
}

export interface Scene {
  readonly bones: readonly {
    readonly name: string;
    readonly d?: string;
    readonly circle?: { cx: number; cy: number; r: number };
    readonly width: number;
  }[];
  readonly focus: readonly Point[];
  readonly bounds: { minX: number; maxX: number; minY: number; maxY: number };
}

/** Canonical joint names → the posed point, so highlights ride the moving body. */
export function posedJoint(pose: Pose, joint: string): Point | null {
  for (const bone of BONES) {
    if (!bone.at) continue;
    if (bone.at.end === joint) return pose.joints[`${bone.name}:end`];
    if (bone.at.start === joint) return pose.joints[`${bone.name}:start`];
  }
  const torso = pose.joints['torso:start'];
  const neck = pose.joints['torso:end'];
  const along = (t: number): Point => [
    round2(torso[0] + (neck[0] - torso[0]) * t),
    round2(torso[1] + (neck[1] - torso[1]) * t),
  ];
  if (joint === 'chest') return along(0.36);
  if (joint === 'waist') return along(0.74);
  if (joint === 'neckTop') return along(0.92);
  if (joint === 'pelvis') return torso;
  if (joint === 'headTop' || joint === 'chin' || joint === 'headC') {
    const head = pose.joints['head:end'];
    const base = pose.joints['head:start'];
    const t = joint === 'headTop' ? 1.6 : joint === 'chin' ? 0.4 : 1;
    return [round2(base[0] + (head[0] - base[0]) * t), round2(base[1] + (head[1] - base[1]) * t)];
  }
  return null;
}

export function sceneFor(plan: MotionPlan, frame: Frame): Scene {
  const posture = POSTURES[plan.posture];
  const pose = poseJoints(posture, frame, viewFor(plan));
  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;
  for (const name of Object.keys(pose.joints)) {
    const [x, y] = pose.joints[name];
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }
  const bones = BONES.map((bone) => {
    if (bone.round) {
      const [cx, cy] = pose.joints[`${bone.name}:end`];
      return { name: bone.name, circle: { cx, cy, r: rnd(bone.length * 0.82) }, width: bone.width };
    }
    const a = pose.joints[`${bone.name}:start`];
    const b = pose.joints[`${bone.name}:end`];
    return {
      name: bone.name,
      d: `M${rnd(a[0])} ${rnd(a[1])} L${rnd(b[0])} ${rnd(b[1])}`,
      width: bone.width,
    };
  });
  const focus = plan.focus
    .map((joint) => posedJoint(pose, String(joint) as JointName))
    .filter((point): point is Point => Boolean(point));
  return { bones, focus, bounds: { minX, maxX, minY, maxY } };
}

/**
 * The path the moving end travels: start state to end state, about the joint that
 * turns. Drawn as the arc between the two states, so the same figure explains the
 * movement with the animation switched off, printed, or screenshotted.
 */
export function arcFor(plan: MotionPlan): { d: string; head: string } {
  const posture = POSTURES[plan.posture];
  const from = poseJoints(posture, frameAt(plan, 0), viewFor(plan));
  const to = poseJoints(posture, frameAt(plan, 1), viewFor(plan));
  const primary = plan.steps[0]?.bone ?? 'torso';
  const a = from.joints[`${primary}:end`] ?? from.joints[`${primary}:start`];
  const b = to.joints[`${primary}:end`] ?? to.joints[`${primary}:start`];
  const pivot = from.joints[`${primary}:start`];
  if (!a || !b || !pivot) return { d: '', head: '' };

  const r = Math.hypot(b[0] - pivot[0], b[1] - pivot[1]);
  const a1 = Math.atan2(a[1] - pivot[1], a[0] - pivot[0]);
  const a2 = Math.atan2(b[1] - pivot[1], b[0] - pivot[0]);
  let delta = a2 - a1;
  while (delta > Math.PI) delta -= 2 * Math.PI;
  while (delta < -Math.PI) delta += 2 * Math.PI;

  if (r < 4 || Math.abs(delta) < 0.03) {
    const angle = Math.atan2(b[1] - a[1], b[0] - a[0]);
    return {
      d: `M${rnd(a[0])} ${rnd(a[1])} L${rnd(b[0])} ${rnd(b[1])}`,
      head: headAt(b, angle),
    };
  }
  const sweep = delta > 0 ? 1 : 0;
  return {
    d: `M${rnd(a[0])} ${rnd(a[1])} A${rnd(r)} ${rnd(r)} 0 0 ${sweep} ${rnd(b[0])} ${rnd(b[1])}`,
    head: headAt(b, a2 + (delta > 0 ? Math.PI / 2 : -Math.PI / 2)),
  };
}

function headAt(at: Point, angle: number): string {
  const size = 9;
  const back = (offset: number): Point => [
    at[0] + Math.cos(angle + offset) * size,
    at[1] + Math.sin(angle + offset) * size,
  ];
  const [x1, y1] = back(2.6);
  const [x2, y2] = back(-2.6);
  return `M${rnd(at[0])} ${rnd(at[1])} L${rnd(x1)} ${rnd(y1)} M${rnd(at[0])} ${rnd(at[1])} L${rnd(x2)} ${rnd(y2)}`;
}

/**
 * A floor, a wall, a seat, a counter — always measured from the drawn body, never
 * from a remembered coordinate. Supports that do not move with the figure are how a
 * "lean into the wall" ends up leaning into empty air.
 */
export function supportsFor(
  plan: MotionPlan,
  scene: Scene,
  floorY: number
): { d: string; width: number }[] {
  const posture = POSTURES[plan.posture];
  const { minX, maxX } = scene.bounds;
  const out: { d: string; width: number }[] = [];
  const line = (x1: number, y1: number, x2: number, y2: number) => ({
    d: `M${rnd(x1)} ${rnd(y1)} L${rnd(x2)} ${rnd(y2)}`,
    width: 9,
  });
  out.push(line(minX - 34, floorY, maxX + 34, floorY));
  if (posture.support === 'wall-front') {
    out.push(line(maxX + 8, scene.bounds.minY - 10, maxX + 8, floorY));
  }
  if (posture.support === 'wall-back') {
    out.push(line(minX - 8, scene.bounds.minY - 10, minX - 8, floorY));
  }
  if (posture.support === 'chair') {
    const seat = scene.bones.find((bone) => bone.name === 'torso');
    const anchor = seat?.d ? parseStart(seat.d) : null;
    if (anchor) {
      out.push(line(anchor[0] - 46, anchor[1] + 8, anchor[0] + 54, anchor[1] + 8));
      out.push(line(anchor[0] - 46, anchor[1] + 8, anchor[0] - 46, anchor[1] - 76));
      out.push(line(anchor[0] - 40, floorY, anchor[0] - 40, anchor[1] + 8));
      out.push(line(anchor[0] + 46, floorY, anchor[0] + 46, anchor[1] + 8));
    }
  }
  if (posture.support === 'counter') {
    const hand = scene.bones.find((bone) => bone.name === 'foreL');
    const anchor = hand?.d ? parseEnd(hand.d) : null;
    if (anchor) {
      out.push(line(anchor[0] - 50, anchor[1] + 12, maxX + 28, anchor[1] + 12));
      out.push(line(maxX + 20, anchor[1] + 12, maxX + 20, floorY));
    }
  }
  if (posture.support === 'table') {
    const elbow = scene.bones.find((bone) => bone.name === 'foreL');
    const anchor = elbow?.d ? parseStart(elbow.d) : null;
    if (anchor) {
      out.push(line(anchor[0] - 60, anchor[1] + 8, maxX + 40, anchor[1] + 8));
      out.push(line(maxX + 24, anchor[1] + 8, maxX + 24, floorY));
    }
  }
  return out;
}

function parseStart(d: string): Point | null {
  const m = /^M(-?[\d.]+) (-?[\d.]+)/.exec(d);
  return m ? [Number(m[1]), Number(m[2])] : null;
}
function parseEnd(d: string): Point | null {
  const m = /L(-?[\d.]+) (-?[\d.]+)$/.exec(d);
  return m ? [Number(m[1]), Number(m[2])] : null;
}

/**
 * Fit a set of scenes into a frame. The standalone SVG and the in-page figure use the
 * same call, so the printed handout and the animation are the same drawing at the
 * same scale — a figure that only looks right at one of the two sizes is a bug that
 * shows up as a clipped limb on a phone.
 */
export interface Fit {
  readonly transform: string;
  readonly scale: number;
}

export function fitFor(
  scenes: readonly Scene[],
  frame: { x: number; y: number; w: number; h: number },
  headPad = 26
): Fit {
  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;
  for (const scene of scenes) {
    minX = Math.min(minX, scene.bounds.minX);
    maxX = Math.max(maxX, scene.bounds.maxX);
    minY = Math.min(minY, scene.bounds.minY);
    maxY = Math.max(maxY, scene.bounds.maxY);
  }
  minX -= headPad;
  maxX += headPad;
  minY -= headPad;
  maxY += headPad;
  const w = maxX - minX;
  const h = maxY - minY;
  const scale = Math.min(frame.w / w, frame.h / h, 1.5);
  const dx = frame.x + (frame.w - w * scale) / 2 - minX * scale;
  const dy = frame.y + (frame.h - h * scale) / 2 - minY * scale;
  return { transform: `translate(${rnd(dx)} ${rnd(dy)}) scale(${rnd(scale)})`, scale };
}

/** The floor, placed under the whole figure rather than under one frame of it. */
export function floorFor(scenes: readonly Scene[]): number {
  return rnd(Math.max(...scenes.map((scene) => scene.bounds.maxY)) + 8);
}

/** The bones a plan drives directly. */
export function movingBonesFor(plan: MotionPlan): Set<string> {
  return new Set(boneTimeline(plan).keys());
}

/**
 * Moving bones, plus everything hanging off them. A hand attached to a moving forearm
 * is part of the movement; a torso with a moving arm on it is scenery.
 *
 * This exists because a supine figure is mostly leg: with every bone inked the same
 * weight, a reader cannot tell which limb the row is about. Both the file writer and
 * the page dim the complement of this set, from this definition.
 */
export function actorBonesFor(plan: MotionPlan): Set<string> {
  const actors = new Set<string>();
  const mark = (name: string): void => {
    actors.add(name);
    for (const child of BONES) if (child.parent === name) mark(child.name);
  };
  for (const bone of movingBonesFor(plan)) mark(bone);
  return actors;
}

export { planFor, POSTURES, BONES };
export type { MotionPlan };
