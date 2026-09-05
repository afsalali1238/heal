/**
 * Movement plans: one reviewed sentence → one drawing.
 *
 * ── Why this file exists ───────────────────────────────────────────────────
 * 24 published rows carry `image_status: "approved"` and a 68-byte 1×1 file, so
 * every one of those cards falls back to "Picture not added yet". The patient needs
 * a picture. What this project can stand behind is a picture that is *derived from
 * the reviewed words and cannot drift from them*.
 *
 * The alternative was already tried and rejected here. The archived clinical sign-off
 * (`docs/archive/legacy-2026-08-26/handoffs-v1/H-CLINICAL-SIGNOFF.md`, quoting the
 * image scorecard that is no longer in this tree) records a photoreal render of
 * `ex-neck-02` as "FAIL — worst of the set": the head
 * sat forward of the shoulders, which is the exact posture the chin tuck exists to
 * correct, and the reason it was dangerous is the reason it passed a casual look —
 * it looked professional. Realism is not correctness, and for a demonstration
 * picture only correctness matters.
 *
 * ── The contract ───────────────────────────────────────────────────────────
 * 1. Every plan quotes the row's own `start_position_en` / `movement_en` /
 *    `direction_en` / `return_en`. `scripts/check-poses.ts` fails the build when a
 *    quote no longer matches the sheet, so a figure can never go on illustrating
 *    instructions that were edited away underneath it. This is the drift class that
 *    killed the last image set.
 * 2. A plan may state: which posture, which joint, which direction, and that the
 *    movement goes between the two states the sentence names.
 * 3. A plan may NOT state: how far, how heavy, how long. Angles here are drawing
 *    constants — they are never printed as degrees, and the range the patient reads
 *    is the row's own words ("as far as comfortable"). Where a row would need an
 *    invented number to be drawable, it is left out of the table and keeps its
 *    honest placeholder slot.
 * 4. The figure has to survive being wrong-looking: it degrades to a still
 *    two-state diagram (faded start, solid end, an arc between), so print, a
 *    screenshot into a chat, and a reduced-motion patient all get the same
 *    information as the animation. Nothing is legible *only* in motion.
 */

import { J, type Point } from './geometry/skeleton';

// ── Chain ──────────────────────────────────────────────────────────────────

export type JointName = keyof typeof J;

/**
 * Bones, each hanging off another bone. Lengths are measured from the canonical
 * standing joint table in `geometry/skeleton.ts`, so a figure cannot be given arms
 * that disagree with the body map (A-006). Angles are **relative** to the parent
 * bone, in drawing space: 0° continues the parent's direction, positive turns
 * clockwise on screen. That is also how a clinician describes it — "bend the elbow"
 * is a change at one joint, not an absolute position.
 */
/**
 * A bone's angle is measured from a *baseline*, not from the parent's direction:
 * `base` is where the bone points when the body stands relaxed — limbs hanging
 * down, the head in line with the spine, the foot forward at the ankle. Posture
 * angles are then deviations from natural rest, which is how a clinician writes
 * them ("bend the knee 90°"), and it keeps an unmentioned arm hanging instead of
 * sticking out along its parent.
 */
export interface BoneDef {
  readonly name: string;
  /** Degrees from the parent's direction at rest. */
  readonly base: number;
  /** null means this bone hangs off the body root. */
  readonly parent: string | null;
  /** Length in canonical units, or the bone whose far end this one starts from. */
  readonly from: 'root' | { readonly bone: string; readonly at: 'start' | 'end' };
  readonly length: number;
  /** Line width when drawn. */
  readonly width: number;
  /**
   * Which canonical joint each end of the bone is. The figure highlights the joint
   * a row is about, and it has to do it at the *posed* position — a marker parked at
   * the standing coordinate floats off the body the moment the posture changes,
   * which is how the first version of this rendered three halos in thin air.
   */
  readonly at?: { readonly start?: JointName; readonly end?: JointName };
  readonly round?: boolean;
}

const d = (a: Point, b: Point) => Math.hypot(b[0] - a[0], b[1] - a[1]);

const LEN = {
  torso: d(J.pelvis, J.neckBase),
  neck: d(J.neckBase, J.chin),
  upperArm: d(J.shoulderR, J.elbowR),
  foreArm: d(J.elbowR, J.wristR),
  hand: d(J.wristR, J.handTipR),
  thigh: d(J.hipR, J.kneeR),
  shin: d(J.kneeR, J.ankleR),
  foot: d(J.ankleR, J.toeR),
};

/** How far apart the two sides of the body are, for the front-facing pairs. */
const SPREAD = Math.abs(J.shoulderR[0] - J.shoulderL[0]);

/** Radius the head circle is drawn at, so the fitted box can allow for it. */
export const LEN_HEAD = Math.round(d(J.neckBase, J.chin) * 0.82);

const bone = (
  name: string,
  parent: string | null,
  length: number,
  width: number,
  base: number,
  opts: {
    round?: boolean;
    anchor?: 'start' | 'end';
    at?: { start?: JointName; end?: JointName };
  } = {}
): BoneDef => ({
  name,
  parent,
  from: parent ? { bone: parent, at: opts.anchor ?? 'end' } : 'root',
  length,
  width,
  base,
  ...(opts.at ? { at: opts.at } : {}),
  ...(opts.round ? { round: true } : {}),
});

export const BONES: readonly BoneDef[] = [
  // The torso points up out of the root; everything else is measured from that.
  bone('torso', null, LEN.torso, 26, 0, { at: { start: 'pelvis', end: 'neckBase' } }),
  bone('head', 'torso', LEN.neck, 30, 0, { round: true, at: { start: 'neckBase', end: 'headC' } }),
  // Arms hang from the shoulder, legs from the pelvis: 180° from an upright torso.
  bone('armL', 'torso', LEN.upperArm, 13, 180, {
    anchor: 'end',
    at: { start: 'shoulderL', end: 'elbowL' },
  }),
  bone('foreL', 'armL', LEN.foreArm, 11, 0, { at: { start: 'elbowL', end: 'wristL' } }),
  bone('handL', 'foreL', LEN.hand, 10, 0, { at: { start: 'wristL', end: 'handTipL' } }),
  bone('armR', 'torso', LEN.upperArm, 13, 180, {
    anchor: 'end',
    at: { start: 'shoulderR', end: 'elbowR' },
  }),
  bone('foreR', 'armR', LEN.foreArm, 11, 0, { at: { start: 'elbowR', end: 'wristR' } }),
  bone('handR', 'foreR', LEN.hand, 10, 0, { at: { start: 'wristR', end: 'handTipR' } }),
  bone('legL', 'torso', LEN.thigh, 17, 180, {
    anchor: 'start',
    at: { start: 'hipL', end: 'kneeL' },
  }),
  bone('shinL', 'legL', LEN.shin, 14, 0, { at: { start: 'kneeL', end: 'ankleL' } }),
  // The foot sits at a right angle to the shin at rest, so a neutral foot is 0.
  bone('footL', 'shinL', LEN.foot, 11, 90, { at: { start: 'ankleL', end: 'toeL' } }),
  bone('legR', 'torso', LEN.thigh, 17, 180, {
    anchor: 'start',
    at: { start: 'hipR', end: 'kneeR' },
  }),
  bone('shinR', 'legR', LEN.shin, 14, 0, { at: { start: 'kneeR', end: 'ankleR' } }),
  bone('footR', 'shinR', LEN.foot, 11, 90, { at: { start: 'ankleR', end: 'toeR' } }),
];

export const BONE_BY_NAME: Record<string, BoneDef> = Object.fromEntries(
  BONES.map((bone) => [bone.name, bone])
);

/** The lateral offset applied to the "R" limb so two sides read as two sides. */
export const SIDE_SPREAD = SPREAD / 2;

// ── Postures ───────────────────────────────────────────────────────────────

/**
 * A posture is the root placement plus one relative angle per bone. Every angle
 * below is a *drawing* choice: it makes the figure readable, it is not a range of
 * motion, and no number here is shown to a patient.
 */
export interface Posture {
  /** What is drawn under or beside the body, because the row names it. */
  readonly support: 'floor' | 'wall-back' | 'wall-front' | 'chair' | 'counter' | 'table' | 'none';
  readonly root: Point;
  /** 0 = head above the root. Rotates the whole body for a lying figure. */
  readonly tilt: number;
  readonly angles: Record<string, number>;
  /** Both sides visible and stacked (`front`) or overlapped (`side`). */
  readonly view?: 'side' | 'front';
}

const hang = { armL: 0, foreL: 0, handL: 0, armR: 0, foreR: 0, handR: 0 };
const legsDown = { legL: 0, shinL: 0, footL: 0, legR: 0, shinR: 0, footR: 0 };

const pose = (over: Partial<Posture> & { angles?: Record<string, number> }): Posture => {
  const { angles, ...rest } = over;
  return {
    support: 'none',
    root: [120, 168],
    tilt: 0,
    ...rest,
    // Every bone starts hanging; a posture only names the ones it changes. That is
    // what keeps an omitted arm from becoming `undefined` and vanishing.
    angles: { ...hang, ...legsDown, head: 0, ...(angles ?? {}) },
  };
};

export const POSTURES: Record<string, Posture> = {
  /** Upright, arms at the sides. The body root sits at the pelvis. */
  STAND: pose({}),
  /** Upright, one hand resting forward on a chair back or counter. */
  STAND_HELD: pose({
    support: 'counter',
    angles: { armL: -34, foreL: -26, handL: -6, armR: -30, foreR: -20 },
  }),
  /** Facing a wall with both hands on it — the calf stretch and the wall push. */
  STAND_WALL: pose({
    support: 'wall-front',
    angles: { armL: -78, foreL: -4, armR: -78, foreR: -4, legR: 16, shinR: 10, footR: -14 },
  }),
  /** Back against the wall, feet out in front: the wall-sit. */
  /**
   * Back against the wall, feet out in front, *standing* — the slide down is the
   * movement, so it cannot already be in the start pose. Angles are authored in the
   * tilted frame this posture uses, which is why a hanging arm is not 0 here: the
   * tilt has already turned the body, and applying it once (not per bone) is what
   * makes that consistent.
   */
  STAND_WALL_BACK: pose({
    support: 'wall-back',
    root: [138, 214],
    angles: { armL: 6, foreL: 4, armR: 6, foreR: 4 },
  }),

  /** Upright seated: thighs forward, shins down. */
  SIT: pose({
    support: 'chair',
    root: [126, 214],
    angles: { legL: -86, shinL: 84, footL: 4, legR: -86, shinR: 84, footR: 4, armL: 6, armR: 6 },
  }),
  /** Seated with one leg out straight, heel on the floor. */
  SIT_LEG_OUT: pose({
    support: 'chair',
    root: [126, 214],
    angles: {
      legL: -104,
      shinL: 8,
      footL: 74,
      legR: -86,
      shinR: 84,
      footR: 4,
      armL: 6,
      armR: 6,
    },
  }),
  /** Lying on the back, knees bent, feet flat. */
  SUPINE: pose({
    support: 'floor',
    root: [150, 452],
    tilt: -90,
    // Hips flexed, shins back down to the floor, toes up: "knees bent and feet
    // flat". A shin left along the floor reads as legs-out-straight, which is a
    // different exercise.
    angles: {
      legL: -34,
      shinL: 124,
      footL: 92,
      legR: -34,
      shinR: 124,
      footR: 92,
      armL: 4,
      armR: 4,
    },
  }),
  /** Lying on the back, both legs straight. */
  SUPINE_STRAIGHT: pose({
    support: 'floor',
    root: [150, 452],
    tilt: -90,
    angles: { legL: 0, shinL: 0, footL: 92, legR: 0, shinR: 0, footR: 92, armL: 4, armR: 4 },
  }),
  /** Lying on the back, one knee bent and the other leg straight. */
  SUPINE_ONE_BENT: pose({
    support: 'floor',
    root: [150, 452],
    tilt: -90,
    angles: { legL: -34, shinL: 124, footL: 92, legR: 0, shinR: 0, footR: 92, armL: 4, armR: 4 },
  }),
  /**
   * On the side with the top leg long: the row says the bottom leg is bent and the
   * top leg stays straight. A
   * separate posture, not a flag: a clamshell stacks both knees, an abduction keeps the
   * working leg straight and lifts it. Two rows, two start positions.
   */
  SIDE_LYING_TOP_STRAIGHT: pose({
    support: 'floor',
    root: [150, 452],
    tilt: -90,
    view: 'side',
    angles: { legL: 0, shinL: 0, footL: 92, legR: -34, shinR: 124, footR: 92, armL: 4, armR: 4 },
  }),
  /**
   * Supine with the knee supported on a roll: thigh resting slightly raised, heel on
   * the floor, extending the knee lifts the heel. Anything written as "towel under the
   * knee" starts here, because on the feet-flat supine baseline the same numbers read
   * as a bridging leg, which is a different exercise.
   */
  SUPINE_KNEE_SUPPORT: pose({
    support: 'floor',
    root: [150, 452],
    tilt: -90,
    angles: {
      legL: -16,
      shinL: 58,
      footL: 92,
      legR: -16,
      shinR: 58,
      footR: 92,
      armL: 4,
      armR: 4,
    },
  }),
  /** On the side, knees stacked. The near leg is the working one. */
  SIDE_LYING: pose({
    support: 'floor',
    root: [150, 452],
    tilt: -90,
    view: 'side',
    // Stacked knees, both shins angled so the near leg can open like a lid.
    angles: {
      legL: -34,
      shinL: 124,
      footL: 92,
      legR: -34,
      shinR: 124,
      footR: 92,
    },
  }),
  /** On hands and knees. */
  /**
   * On hands and knees, head to the left. Because `tilt` turns the whole body, every
   * limb angle below is measured in the turned frame: 90 is "straight down to the
   * floor", not "hanging". Getting that wrong draws a table, not a person — which is
   * what the first version of this figure produced.
   */
  QUADRUPED: pose({
    support: 'floor',
    root: [128, 356],
    tilt: -90,
    angles: {
      armL: 90,
      foreL: 0,
      handL: 90,
      armR: 90,
      foreR: 0,
      handR: 90,
      legL: 90,
      shinL: -90,
      footL: -90,
      legR: 90,
      shinR: -90,
      footR: -90,
    },
  }),

  /** Sitting, one arm out straight in front, palm up. */
  SIT_ARM_OUT: pose({
    support: 'chair',
    root: [126, 214],
    angles: {
      legL: -86,
      shinL: 84,
      legR: -86,
      shinR: 84,
      armL: -88,
      foreL: -2,
      handL: 0,
      armR: -84,
      foreR: -30,
    },
  }),
  /** Forearm resting on a table, wrist hanging off the edge. */
  TABLE_FOREARM: pose({
    support: 'table',
    root: [104, 210],
    angles: {
      legL: -86,
      shinL: 84,
      legR: -86,
      shinR: 84,
      armL: -80,
      foreL: -8,
      handL: 62,
      armR: 8,
      foreR: 6,
    },
  }),
};

export type PostureName = keyof typeof POSTURES;

// ── Steps ──────────────────────────────────────────────────────────────────

/**
 * One move: a bone turning at its joint, relative to where the posture puts it.
 * `from`/`to` are drawing amplitudes, never shown as numbers.
 *
 * `dwell` is the share of the cycle spent arriving and staying, so a hold row reads
 * as "get there, be there" instead of a bounce. It is timing *shape*, not timing:
 * seconds come from the guide, never from a picture.
 *
 * `bothSides` moves the R limb with the L limb for rows that are explicitly
 * bilateral ("lift both heels", "let both knees fall").
 */
export interface Step {
  readonly bone: string;
  readonly from: number;
  readonly to: number;
  readonly dwell?: number;
  readonly label?: string;
  readonly bothSides?: boolean;
  /**
   * Slide instead of turn, for the rows whose whole point is that the part does NOT
   * tip: `ex-neck-02` ("draw your chin straight back") drawn as a rotation would
   * illustrate the error the exercise removes. `[dx, dy]` in drawing units.
   */
  readonly slide?: { readonly from: Point; readonly to: Point };
}

export interface Quote {
  readonly start?: string;
  readonly move?: string;
  readonly direction?: string;
  readonly return?: string;
  readonly safety?: string;
}

/** Which sheet column each quote came from. Explicit: `move` is not `move_en`. */
export const QUOTE_FIELDS: Record<keyof Quote, string> = {
  start: 'start_position_en',
  move: 'movement_en',
  direction: 'direction_en',
  return: 'return_en',
  safety: 'safety_en',
};

export interface MotionPlan {
  readonly posture: PostureName;
  readonly steps: readonly Step[];
  readonly from: Quote;
  /** Joints marked as the part the row is about, straight from `target_muscles_en`. */
  readonly focus: readonly JointName[];
  /** Which limb the sentence names, when it names one ("top leg", "right ear"). */
  readonly side?: 'left' | 'right' | 'both';
  /**
   * `front` separates the two hips, so a sideways movement of *both* limbs reads as
   * sideways rather than up. Only needed where the sentence moves both limbs in the
   * same direction ("let both knees fall to one side").
   */
  readonly view?: 'side' | 'front';
  /** A row may be about a movement the drawing must not guess at. */
  readonly note?: string;
  /**
   * `lumbar-gap` draws the space between the lower back and the floor, because a
   * pelvic tilt is exactly that gap closing and a limb-only figure cannot show it.
   */
  readonly marks?: readonly ('lumbar-gap' | 'planted-heel')[];
}

// ── The table, row by row ──────────────────────────────────────────────────

export const PLANS: Record<string, MotionPlan> = {
  'ex-ankle-01': {
    posture: 'SUPINE_STRAIGHT',
    side: 'both',
    focus: ['ankleL', 'ankleR', 'toeL', 'toeR'],
    from: {
      start: 'Sit or lie down with your legs straight.',
      move: 'Point your toes away from you as far as comfortable, then pull them back towards you.',
      return: 'Return to a neutral position.',
    },
    steps: [
      { bone: 'footL', from: 92, to: 58, bothSides: true, dwell: 0.16, label: 'point away' },
      { bone: 'footL', from: 58, to: 124, bothSides: true, dwell: 0.16, label: 'pull back' },
      { bone: 'footL', from: 124, to: 92, bothSides: true, label: 'neutral' },
    ],
  },
  'ex-ankle-02': {
    posture: 'STAND_HELD',
    side: 'both',
    focus: ['ankleL', 'ankleR', 'toeL', 'toeR'],
    from: {
      start: 'Stand straight and hold onto a chair or counter for balance.',
      move: 'Slowly lift both heels off the floor to stand on your toes.',
      return: 'Slowly lower your heels back to the floor.',
    },
    steps: [
      { bone: 'footL', from: 0, to: -30, bothSides: true, dwell: 0.3, label: 'heels up' },
      { bone: 'footL', from: -30, to: 0, bothSides: true, dwell: 0.14, label: 'lower' },
    ],
  },
  'ex-elbow-01': {
    posture: 'SIT',
    side: 'left',
    focus: ['elbowL', 'wristL'],
    from: {
      start: 'Sit or stand with your arm hanging by your side, palm facing forward.',
      move: 'Slowly bend your elbow to bring your hand towards your shoulder.',
      return: 'Slowly lower your hand back to the start.',
      safety: 'Move only your elbow. Keep your shoulder still.',
    },
    steps: [
      { bone: 'foreL', from: 0, to: -128, dwell: 0.26, label: 'bend' },
      { bone: 'foreL', from: -128, to: 0, dwell: 0.14, label: 'lower' },
    ],
  },
  'ex-hip-01': {
    posture: 'SIDE_LYING_TOP_STRAIGHT',
    side: 'left',
    focus: ['hipL', 'kneeL'],
    from: {
      start: 'Lie on your side with your bottom leg bent and top leg straight.',
      move: 'Slowly lift your top leg straight up toward the ceiling.',
      return: 'Slowly lower the leg back down.',
      safety: 'Do not roll your hips backward as you lift.',
    },
    steps: [
      { bone: 'legL', from: 0, to: -42, dwell: 0.32, label: 'lift the straight leg' },
      { bone: 'legL', from: -42, to: 0, dwell: 0.14, label: 'lower' },
    ],
  },
  'ex-hip-02': {
    posture: 'SIDE_LYING',
    side: 'left',
    focus: ['hipL', 'kneeL'],
    from: {
      start: 'Lie on your side with both knees bent and your heels together.',
      move: 'Keep your heels touching and slowly open your top knee like a clamshell.',
      return: 'Slowly close the knee back to the start.',
    },
    steps: [
      { bone: 'shinL', from: 124, to: 66, dwell: 0.32, label: 'open knee' },
      { bone: 'shinL', from: 66, to: 124, dwell: 0.14, label: 'close' },
    ],
  },
  'ex-hip-03': {
    posture: 'SUPINE',
    side: 'both',
    focus: ['pelvis', 'hipL', 'hipR'],
    from: {
      start: 'Lie on your back with knees bent and feet flat on the floor.',
      move: 'Squeeze your buttocks and lift your hips off the floor until your body forms a straight line.',
      return: 'Slowly lower your hips back to the floor.',
      safety: 'Do not overarch your lower back at the top.',
    },
    steps: [
      // The chain pivots a bone at its own joint, so "lift the hips" is drawn as
      // what the body actually does around a planted foot: the trunk tilts and the
      // thighs level out until shoulder, hip and knee share one line.
      { bone: 'torso', from: 0, to: 16, dwell: 0.34, label: 'hips up' },
      { bone: 'legL', from: -34, to: -14, bothSides: true, dwell: 0.34, label: 'straight line' },
      { bone: 'shinL', from: 124, to: 108, bothSides: true, dwell: 0.34 },
      { bone: 'torso', from: 16, to: 0, dwell: 0.16, label: 'lower' },
      { bone: 'legL', from: -14, to: -34, bothSides: true, dwell: 0.16 },
      { bone: 'shinL', from: 108, to: 124, bothSides: true, dwell: 0.16 },
    ],
  },
  'ex-knee-01': {
    posture: 'SUPINE_ONE_BENT',
    side: 'right',
    focus: ['kneeR', 'hipR'],
    from: {
      start: 'Lie on your back with one knee bent and the other straight.',
      move: 'Tighten the thigh muscle of your straight leg and lift it to the height of your bent knee.',
      return: 'Slowly lower the leg back to the floor.',
    },
    steps: [
      { bone: 'legR', from: 0, to: -44, dwell: 0.34, label: 'lift' },
      { bone: 'legR', from: -44, to: 0, dwell: 0.16, label: 'lower' },
    ],
  },
  'ex-knee-02': {
    posture: 'SUPINE_KNEE_SUPPORT',
    side: 'left',
    focus: ['kneeL', 'ankleL'],
    from: {
      start: 'Lie on your back or sit with a rolled towel under your knee.',
      move: 'Straighten your knee fully by tightening your thigh muscle.',
      return: 'Slowly lower your heel back to the resting position.',
      safety: 'Keep the back of your knee firmly against the towel.',
    },
    steps: [
      { bone: 'shinL', from: 58, to: 12, dwell: 0.4, label: 'straighten' },
      { bone: 'shinL', from: 12, to: 58, dwell: 0.14, label: 'relax' },
    ],
  },
  'ex-knee-03': {
    posture: 'STAND_WALL_BACK',
    side: 'both',
    focus: ['kneeL', 'kneeR'],
    from: {
      start: 'Stand with your back against a wall and feet shoulder-width apart.',
      move: 'Slowly slide down the wall until your knees are bent to a 45-degree angle.',
      return: 'Push through your heels to slide back up to a standing position.',
      safety: 'Do not let your knees go past your toes.',
    },
    // The row names 45°, so the end pose is drawn at 45° — the one place an angle
    // is copied rather than chosen. It is the sheet's number, not mine.
    steps: [
      { bone: 'legL', from: 0, to: -46, bothSides: true, dwell: 0.36, label: 'slide down' },
      { bone: 'shinL', from: 0, to: 46, bothSides: true, dwell: 0.36 },
      // The pelvis is the root, so "slide down the wall" is a travel, not a turn.
      {
        bone: 'torso',
        from: 0,
        to: 0,
        slide: { from: [0, 0], to: [0, 34] },
        dwell: 0.36,
      },
      { bone: 'torso', from: 0, to: 0, slide: { from: [0, 34], to: [0, 0] }, dwell: 0.16 },
      { bone: 'legL', from: -46, to: 0, bothSides: true, dwell: 0.16, label: 'slide up' },
      { bone: 'shinL', from: 46, to: 0, bothSides: true, dwell: 0.16 },
    ],
  },
  'ex-lowerback-01': {
    posture: 'SUPINE',
    side: 'both',
    focus: ['pelvis', 'waist'],
    from: {
      start: 'Lie on your back with knees bent and feet flat.',
      move: 'Flatten your lower back against the floor by tightening your stomach muscles.',
      return: 'Relax your stomach muscles.',
      safety: 'Breathe normally. Do not hold your breath.',
    },
    // A pelvic tilt is a small rotation with nothing to see in the limbs, so the
    // floor gap is what the figure marks: the arch closing against the floor.
    marks: ['lumbar-gap'],
    note: 'The space under the lower back closes; nothing in the limbs moves.',
    steps: [{ bone: 'torso', from: 0, to: -7, dwell: 0.5, label: 'flatten' }],
  },
  'ex-lowerback-02': {
    posture: 'QUADRUPED',
    side: 'both',
    focus: ['shoulderR', 'hipL'],
    from: {
      start: 'Kneel on all fours with your hands under your shoulders and knees under your hips.',
      move: 'Straighten one arm forward and the opposite leg backward.',
      return: 'Lower your arm and leg back to the start.',
      safety: 'Keep your back straight. Do not let your lower back sag.',
    },
    steps: [
      { bone: 'armL', from: 90, to: 180, dwell: 0.34, label: 'arm forward' },
      { bone: 'legR', from: 90, to: 0, dwell: 0.34, label: 'leg back' },
      { bone: 'shinR', from: -90, to: 0, dwell: 0.34 },
      { bone: 'armL', from: 180, to: 90, dwell: 0.12, label: 'lower both' },
      { bone: 'legR', from: 0, to: 90, dwell: 0.12 },
      { bone: 'shinR', from: 0, to: -90, dwell: 0.12 },
    ],
  },
  'ex-neck-01': {
    posture: 'SIT',
    side: 'both',
    focus: ['neckBase', 'headC', 'chin'],
    from: {
      start: 'Sit upright on a chair with your feet flat on the floor.',
      move: 'Slowly move your head in one direction at a time: forward, back, to each side, then turn to each side.',
      return: 'Return to the middle and pause before the next direction.',
    },
    steps: [
      { bone: 'head', from: 0, to: 16, dwell: 0.1, label: 'forward' },
      { bone: 'head', from: 16, to: 0, dwell: 0.06 },
      { bone: 'head', from: 0, to: -14, dwell: 0.1, label: 'back' },
      { bone: 'head', from: -14, to: 0, dwell: 0.06 },
      { bone: 'head', from: 0, to: 13, dwell: 0.1, label: 'each side' },
      { bone: 'head', from: 13, to: 0, dwell: 0.06 },
      { bone: 'head', from: 0, to: -10, dwell: 0.1, label: 'turn' },
      { bone: 'head', from: -10, to: 0, dwell: 0.06 },
    ],
    note: 'One direction per rep — the row says one at a time.',
  },
  'ex-neck-02': {
    posture: 'SIT',
    side: 'both',
    focus: ['neckBase', 'chin'],
    from: {
      start: 'Sit upright with your feet flat on the floor and your shoulders relaxed.',
      move: 'Draw your chin straight back, as if making a double chin. Keep your eyes level.',
      return: 'Release slowly and return your head to a comfortable position.',
    },
    // Slid, not tipped: the eyes stay level because the row says so. This is the row
    // the rejected photoreal set got backwards.
    steps: [
      {
        bone: 'head',
        from: 0,
        to: 0,
        slide: { from: [0, 0], to: [-13, 2] },
        dwell: 0.36,
        label: 'chin back',
      },
      {
        bone: 'head',
        from: 0,
        to: 0,
        slide: { from: [-13, 2], to: [0, 0] },
        dwell: 0.14,
        label: 'release',
      },
    ],
  },
  'ex-shoulder-01': {
    posture: 'STAND',
    side: 'both',
    focus: ['shoulderL', 'shoulderR'],
    from: {
      start: 'Stand or sit comfortably.',
      move: 'Roll your shoulders up, back, and down in a smooth circular motion.',
      return: 'Return to resting position.',
    },
    // The circle is what the row describes, so the three waypoints are up, back,
    // down — a path, not a range.
    steps: [
      { bone: 'armL', from: 0, to: -16, bothSides: true, dwell: 0.1, label: 'up' },
      { bone: 'armL', from: -16, to: 14, bothSides: true, dwell: 0.1, label: 'back' },
      { bone: 'armL', from: 14, to: 0, bothSides: true, dwell: 0.1, label: 'down' },
    ],
  },
  'ex-wrist-01': {
    posture: 'TABLE_FOREARM',
    side: 'left',
    focus: ['wristL', 'handTipL'],
    from: {
      start:
        'Rest your forearm on a table with your wrist hanging off the edge, holding a light weight palm up.',
      move: 'Slowly curl your wrist upward.',
      return: 'Slowly lower your wrist back down.',
      safety: 'Keep your forearm flat on the table.',
    },
    steps: [
      { bone: 'handL', from: 62, to: -18, dwell: 0.3, label: 'curl up' },
      { bone: 'handL', from: -18, to: 62, dwell: 0.14, label: 'lower' },
    ],
  },
  'str-ankle-01': {
    posture: 'STAND_WALL',
    side: 'right',
    focus: ['ankleR', 'toeR'],
    from: {
      start: 'Stand facing a wall with one foot back and both hands on the wall.',
      move: 'Lean forward and bend your front knee until you feel a stretch in your back calf.',
      direction: 'Keep your back heel flat on the floor.',
    },
    steps: [
      { bone: 'torso', from: 0, to: 14, dwell: 0.44, label: 'lean in' },
      { bone: 'legR', from: 16, to: 24, dwell: 0.44, label: 'front knee bends' },
      { bone: 'torso', from: 14, to: 0, dwell: 0.14, label: 'come up' },
      { bone: 'legR', from: 24, to: 16, dwell: 0.14 },
    ],
  },
  'str-elbow-01': {
    posture: 'SIT',
    side: 'left',
    focus: ['elbowL', 'shoulderL'],
    from: {
      start: 'Sit or stand upright.',
      move: 'Raise one arm, bend the elbow to reach behind your neck, and use your other hand to gently push the elbow backward.',
      direction: 'Keep your head up and do not push your neck forward.',
    },
    steps: [
      { bone: 'armL', from: 6, to: -160, dwell: 0.2, label: 'raise' },
      { bone: 'foreL', from: 0, to: -120, dwell: 0.34, label: 'hand behind neck' },
      { bone: 'armL', from: -160, to: -176, dwell: 0.34, label: 'elbow back' },
      { bone: 'armL', from: -176, to: -160, dwell: 0.1 },
      { bone: 'foreL', from: -120, to: 0, dwell: 0.1 },
      { bone: 'armL', from: -160, to: 6, dwell: 0.1 },
    ],
  },
  'str-hip-01': {
    posture: 'SUPINE',
    side: 'right',
    focus: ['hipR', 'kneeR'],
    from: {
      start: 'Lie on your back with knees bent and feet flat on the floor.',
      move: 'Cross one ankle over the opposite knee and gently pull the bottom leg towards your chest.',
      direction: 'Keep your lower back flat on the floor.',
    },
    steps: [
      { bone: 'legR', from: -34, to: -78, dwell: 0.2, label: 'ankle over knee' },
      { bone: 'legL', from: -34, to: -98, dwell: 0.44, label: 'pull the bottom leg in' },
      { bone: 'legL', from: -98, to: -34, dwell: 0.14 },
      { bone: 'legR', from: -78, to: -34, dwell: 0.14 },
    ],
  },
  'str-hip-02': {
    posture: 'STAND_HELD',
    side: 'both',
    focus: ['pelvis', 'hipR', 'waist'],
    from: {
      start: 'Stand tall with one foot forward and one foot back, holding a chair for balance.',
      move: 'Bend your front knee slightly and tuck your pelvis under until you feel a stretch in the front of your back hip.',
      direction: 'Keep your torso upright and do not lean back.',
    },
    steps: [
      { bone: 'legR', from: 0, to: 12, dwell: 0.24, label: 'front knee bends' },
      { bone: 'torso', from: 0, to: 8, dwell: 0.44, label: 'pelvis tucks under' },
      { bone: 'torso', from: 8, to: 0, dwell: 0.14 },
      { bone: 'legR', from: 12, to: 0, dwell: 0.14 },
    ],
  },
  'str-knee-01': {
    posture: 'STAND_HELD',
    side: 'left',
    focus: ['kneeL', 'ankleL'],
    from: {
      start: 'Stand straight and hold onto a chair or wall for balance.',
      move: 'Bend one knee and hold your ankle, pulling your heel towards your buttocks.',
      direction: 'Keep your knees close together and your back straight.',
    },
    steps: [
      { bone: 'shinL', from: 0, to: -104, dwell: 0.46, label: 'heel to buttock' },
      { bone: 'shinL', from: -104, to: 0, dwell: 0.16, label: 'let down' },
    ],
  },
  'str-knee-02': {
    posture: 'SIT_LEG_OUT',
    side: 'left',
    focus: ['kneeL', 'ankleL'],
    from: {
      start: 'Sit on the edge of a chair with one leg straight in front of you, heel on the floor.',
      move: 'Lean forward slightly until you feel a stretch in the back of your straight leg.',
      direction: 'Keep your back straight and hinge from your hips.',
    },
    steps: [
      { bone: 'torso', from: 0, to: 22, dwell: 0.46, label: 'hinge from the hips' },
      { bone: 'torso', from: 22, to: 0, dwell: 0.16 },
    ],
  },
  'str-lowerback-01': {
    posture: 'SUPINE_STRAIGHT',
    side: 'left',
    focus: ['hipL', 'kneeL'],
    from: {
      start: 'Lie on your back with both legs straight.',
      move: 'Bend one knee and hold it with both hands.',
      direction: 'Pull your knee gently towards your chest.',
    },
    steps: [
      { bone: 'legL', from: 0, to: -80, dwell: 0.3, label: 'knee up' },
      { bone: 'shinL', from: 0, to: 74, dwell: 0.46, label: 'hold it' },
      { bone: 'shinL', from: 74, to: 0, dwell: 0.14 },
      { bone: 'legL', from: -80, to: 0, dwell: 0.14 },
    ],
  },
  'str-lowerback-02': {
    posture: 'SUPINE',
    view: 'front',
    side: 'both',
    focus: ['pelvis', 'kneeL', 'kneeR'],
    from: {
      start: 'Lie on your back with knees bent and feet flat.',
      move: 'Let both knees fall slowly to one side.',
      direction: 'Keep your shoulders flat on the floor.',
    },
    steps: [
      { bone: 'legL', from: -34, to: -72, bothSides: true, dwell: 0.44, label: 'knees fall' },
      { bone: 'legL', from: -72, to: -34, bothSides: true, dwell: 0.16 },
    ],
  },
  'str-neck-01': {
    posture: 'SIT',
    side: 'left',
    focus: ['neckBase', 'headC', 'shoulderR'],
    from: {
      start: 'Sit upright on a chair with both feet flat on the floor.',
      move: 'Let your right ear drop slowly towards your right shoulder.',
      direction: 'Keep your left shoulder relaxed and down. Do not turn your head.',
    },
    steps: [
      { bone: 'head', from: 0, to: 20, dwell: 0.5, label: 'ear towards shoulder' },
      { bone: 'head', from: 20, to: 0, dwell: 0.16, label: 'come back up' },
    ],
  },
  'str-neck-02': {
    posture: 'SIT',
    side: 'left',
    focus: ['neckBase', 'headC', 'shoulderR'],
    from: {
      start: 'Sit upright. Turn your head about 45 degrees to the right.',
      move: 'Look down towards your right armpit until you feel a stretch on the left side of your neck.',
      direction: 'Keep your left shoulder down. You can hold the chair with your left hand.',
    },
    // 45° is quoted from the row; the downward look is drawn small because the row
    // says "until you feel a stretch", which no picture can show.
    steps: [
      { bone: 'head', from: 0, to: 45, dwell: 0.1, label: 'turn 45° (as the row says)' },
      { bone: 'head', from: 45, to: 62, dwell: 0.46, label: 'look down to the armpit' },
      { bone: 'head', from: 62, to: 45, dwell: 0.12 },
      { bone: 'head', from: 45, to: 0, dwell: 0.12 },
    ],
  },
  'str-wrist-01': {
    posture: 'SIT_ARM_OUT',
    side: 'left',
    focus: ['wristL', 'handTipL'],
    from: {
      start: 'Extend one arm straight out in front of you with the palm facing up.',
      move: 'Use your other hand to gently pull your fingers down towards the floor.',
      direction: 'Keep your elbow straight.',
    },
    steps: [
      { bone: 'handL', from: 0, to: 46, dwell: 0.48, label: 'fingers down' },
      { bone: 'handL', from: 46, to: 0, dwell: 0.16 },
    ],
  },
};

export function planFor(itemId: string): MotionPlan | null {
  return PLANS[itemId] ?? null;
}

export const PLANNED_IDS = Object.keys(PLANS);

/** The quote a figure was drawn from, in the order the sheet fields appear. */
export function quotedFields(plan: MotionPlan): [string, string][] {
  const out: [string, string][] = [];
  for (const key of ['start', 'move', 'direction', 'return', 'safety'] as const) {
    const value = plan.from[key];
    if (value) out.push([QUOTE_FIELDS[key], value]);
  }
  return out;
}
