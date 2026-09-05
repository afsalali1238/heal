/**
 * Region hotspots, derived from the joint table in `skeleton.ts`.
 *
 * Ported from `reference/body-geometry/regions.mjs` (A-006). Every capsule is
 * anchored to two named joints, so a hotspot cannot drift off the limb it names.
 *
 * Two decisions here are bug fixes and must survive any edit:
 *
 *  - **Hip anchors on the trochanter**, not the leg root. At the leg root the
 *    two sides collide across the midline and the patient cannot tell left from
 *    right.
 *  - **`lower-back` is back-view only.** It was previously tappable on the front
 *    of the body, over the abdomen.
 *
 * `areaId` is the join to the content library — it must match an `area_id` in
 * `src/data/areas.json`. Nothing in this file decides which regions a patient
 * actually sees; that is `body-regions.ts`, from the published content (A-005).
 */

import { J, cap, lerp, type Point } from './skeleton';

export type BodyView = 'front' | 'back';
/** Patient's left, patient's right, or centre. */
export type RegionSide = 'l' | 'r' | 'c';

export interface RegionShape {
  readonly d: string;
  readonly w: number;
}

export interface GeometryRegion {
  readonly id: string;
  /** Joins to `area_id` in areas.json. Several regions may share one area. */
  readonly areaId: string;
  readonly views: readonly BodyView[];
  readonly side: RegionSide;
  readonly label: string;
  readonly shapes: readonly RegionShape[];
  readonly zones: readonly string[];
}

const A = (a: Point, b: Point, t: number): Point => lerp(a, b, t);

const NECK_ZONES = ['Back of neck', 'Side of neck', 'Base of neck and top of shoulders'];
const SHOULDER_ZONES = [
  'Front of shoulder',
  'Top of shoulder',
  'Back of shoulder',
  'Outside of the upper arm',
];
const ELBOW_ZONES = ['Outer elbow', 'Inner elbow', 'Point of the elbow'];
const WRIST_ZONES = ['Back of wrist', 'Palm side of wrist', 'Thumb side of wrist'];
const LOWBACK_ZONES = [
  'Centre of lower back',
  'One side of lower back',
  'Low down, towards the buttock',
];
const HIP_ZONES = ['Front of hip and groin', 'Side of hip', 'Back of hip and buttock'];
const KNEE_ZONES = [
  'Front of knee and kneecap',
  'Inner side of knee',
  'Outer side of knee',
  'Back of knee',
];
const ANKLE_ZONES = ['Outer ankle', 'Inner ankle', 'Front of ankle', 'Back of ankle and heel cord'];

const limb = (side: 'l' | 'r') =>
  side === 'l'
    ? {
        sh: J.shoulderL,
        el: J.elbowL,
        wr: J.wristL,
        hip: J.hipL,
        tr: J.trochL,
        kn: J.kneeL,
        an: J.ankleL,
      }
    : {
        sh: J.shoulderR,
        el: J.elbowR,
        wr: J.wristR,
        hip: J.hipR,
        tr: J.trochR,
        kn: J.kneeR,
        an: J.ankleR,
      };

function sided(side: 'l' | 'r'): GeometryRegion[] {
  const p = limb(side);
  const s = side === 'l' ? 'Left' : 'Right';
  return [
    {
      id: `shoulder-${side}`,
      areaId: 'shoulder',
      views: ['front', 'back'],
      side,
      label: `${s} shoulder`,
      zones: SHOULDER_ZONES,
      shapes: [{ d: cap(p.sh, A(p.sh, p.el, 0.24)), w: 40 }],
    },
    {
      id: `elbow-${side}`,
      areaId: 'elbow',
      views: ['front', 'back'],
      side,
      label: `${s} elbow`,
      zones: ELBOW_ZONES,
      shapes: [{ d: cap(A(p.sh, p.el, 0.86), A(p.el, p.wr, 0.16)), w: 34 }],
    },
    {
      id: `wrist-${side}`,
      areaId: 'wrist',
      views: ['front', 'back'],
      side,
      label: `${s} wrist`,
      zones: WRIST_ZONES,
      shapes: [{ d: cap(A(p.el, p.wr, 0.88), p.wr), w: 30 }],
    },
    {
      id: `hip-${side}`,
      areaId: 'hip',
      views: ['front', 'back'],
      side,
      label: `${s} hip`,
      zones: HIP_ZONES,
      shapes: [{ d: cap(p.tr, A(p.hip, p.kn, 0.1)), w: 44 }],
    },
    {
      id: `knee-${side}`,
      areaId: 'knee',
      views: ['front', 'back'],
      side,
      label: `${s} knee`,
      zones: KNEE_ZONES,
      shapes: [{ d: cap(A(p.hip, p.kn, 0.9), A(p.kn, p.an, 0.11)), w: 44 }],
    },
    {
      id: `ankle-${side}`,
      areaId: 'ankle',
      views: ['front', 'back'],
      side,
      label: `${s} ankle`,
      zones: ANKLE_ZONES,
      shapes: [{ d: cap(A(p.kn, p.an, 0.9), p.an), w: 34 }],
    },
  ];
}

export const GEOMETRY_REGIONS: readonly GeometryRegion[] = [
  {
    id: 'neck',
    areaId: 'neck',
    views: ['front', 'back'],
    side: 'c',
    label: 'Neck',
    zones: NECK_ZONES,
    shapes: [{ d: cap([120, 102], [120, 126]), w: 40 }],
  },
  {
    // BACK ONLY — see the header. Do not give this a front path.
    id: 'lower-back',
    areaId: 'lower-back',
    views: ['back'],
    side: 'c',
    label: 'Lower back',
    zones: LOWBACK_ZONES,
    shapes: [{ d: cap([120, 236], [120, 278]), w: 56 }],
  },
  ...sided('l'),
  ...sided('r'),
];

/** Bounding box of a region's capsules, in viewBox units. */
export function bbox(region: GeometryRegion): { x0: number; y0: number; x1: number; y1: number } {
  let x0 = Infinity,
    y0 = Infinity,
    x1 = -Infinity,
    y1 = -Infinity;
  for (const s of region.shapes) {
    const nums = (s.d.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
    for (let i = 0; i < nums.length; i += 2) {
      const x = nums[i],
        y = nums[i + 1],
        r = s.w / 2;
      x0 = Math.min(x0, x - r);
      y0 = Math.min(y0, y - r);
      x1 = Math.max(x1, x + r);
      y1 = Math.max(y1, y + r);
    }
  }
  return { x0, y0, x1, y1 };
}

/** A zoom viewBox framing the region with breathing room, clamped to the canvas. */
export function focusViewBox(region: GeometryRegion, pad = 58): string {
  const b = bbox(region);
  let w = b.x1 - b.x0 + pad * 2;
  let h = b.y1 - b.y0 + pad * 2;
  // Keep the 240:620 aspect so the figure never distorts.
  const target = 240 / 620;
  if (w / h > target) h = w / target;
  else w = h * target;
  let x = b.x0 - (w - (b.x1 - b.x0)) / 2;
  let y = b.y0 - (h - (b.y1 - b.y0)) / 2;
  x = Math.max(-30, Math.min(x, 270 - w));
  y = Math.max(-20, Math.min(y, 640 - h));
  return [x, y, w, h].map((n) => Math.round(n)).join(' ');
}
