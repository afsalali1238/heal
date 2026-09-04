/**
 * Server- AND client-safe SVG renderer for the deterministic exercise figures.
 *
 * ── Single implementation, three callers ─────────────────────────────────────
 *  1. `ExerciseFigure.astro` renders the still at build time (no client JS).
 *  2. The motion player re-renders per animation frame in the browser by
 *     importing `buildFigure`/`tweenPose` from `pose.ts` and this module.
 *  3. `scripts/generate-figures.mjs` imports this file with plain node
 *     (type-stripping) to validate every spec and to render the review gallery.
 * There is no second figure implementation. If these drift, that is the bug.
 *
 * Styling is via CSS custom properties with fallbacks, so figures follow the
 * light/dark themes without a second palette:
 *   --fig-body, --fig-line, --fig-support, --fig-floor, --fig-accent, --fig-halo
 */

import {
  buildFigure,
  limbPath,
  torsoPath,
  type PoseAngles,
} from './pose.ts';
import type { ExerciseFigureSpec } from '../../../data/anatomy/exercise-figures.ts';

export interface FigureRenderOpts {
  /** Show the movement-direction arrow (hidden while the motion plays). */
  readonly showArrow?: boolean;
}

const f1 = (n: number): string => String(Math.round(n * 10) / 10);

/** Triangle arrowhead at `tip`, pointing along (tip - tail). */
function arrowhead(
  tail: readonly [number, number],
  tip: readonly [number, number],
  size: number,
): string {
  const dx = tip[0] - tail[0];
  const dy = tip[1] - tail[1];
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const px = -uy;
  const py = ux;
  const base = 0.42 * size;
  const p1 = [tip[0] - ux * size + px * base, tip[1] - uy * size + py * base];
  const p2 = [tip[0] - ux * size - px * base, tip[1] - uy * size - py * base];
  return `M${f1(tip[0])} ${f1(tip[1])} L${f1(p1[0])} ${f1(p1[1])} L${f1(p2[0])} ${f1(p2[1])} Z`;
}

function supportSVG(spec: ExerciseFigureSpec): string {
  const s = 'style="fill:var(--fig-support,#b9c6d8)"';
  const floorLine = (x0: number, x1: number, y: number): string =>
    `<rect x="${x0}" y="${y}" width="${x1 - x0}" height="5" rx="2.5" style="fill:var(--fig-floor,#cdd7e4)"/>`;
  switch (spec.support) {
    case 'floor':
      return (
        `${floorLine(-60, 340, 568)}` +
        `<ellipse cx="120" cy="566" rx="48" ry="7" style="fill:var(--fig-floor,#cdd7e4)" opacity="0.55"/>`
      );
    case 'chair': {
      const back =
        spec.view === 'side'
          ? `<rect x="62" y="150" width="17" height="172" rx="8" ${s}/>`
          : `<rect x="142" y="150" width="25" height="182" rx="9" ${s}/>`;
      const seat =
        spec.view === 'side'
          ? `<rect x="62" y="312" width="110" height="17" rx="7" ${s}/>`
          : `<rect x="58" y="318" width="124" height="17" rx="7" ${s}/>`;
      const legs =
        spec.view === 'side'
          ? `<rect x="70" y="329" width="10" height="150" ${s}/><rect x="150" y="329" width="10" height="150" ${s}/>`
          : '';
      return back + seat + legs;
    }
    case 'wall':
      // Behind the back (wall slide).
      return `<rect x="56" y="120" width="17" height="452" rx="8" ${s}/>`;
    case 'wall-front':
      // Ahead of the figure (hands-on-wall calf stretch).
      return `<rect x="302" y="180" width="17" height="392" rx="8" ${s}/>`;
    case 'none':
    default:
      return '';
  }
}

function arrowSVG(spec: ExerciseFigureSpec): string {
  if (!spec.arrow) return '';
  const { from, to, double } = spec.arrow;
  const color = 'style="stroke:var(--fig-accent,#0284c7)"';
  const fill = 'style="fill:var(--fig-accent,#0284c7)"';
  const line = `<line x1="${f1(from[0])}" y1="${f1(from[1])}" x2="${f1(to[0])}" y2="${f1(to[1])}" ${color} stroke-width="5" stroke-linecap="round"/>`;
  const heads =
    `<path d="${arrowhead(from, to, 17)}" ${fill}/>` +
    (double ? `<path d="${arrowhead(to, from, 17)}" ${fill}/>` : '');
  return `<g opacity="0.95">${line}${heads}</g>`;
}

/**
 * Inner SVG markup for one pose of a figure spec. The caller owns the outer
 * `<svg>` element (viewBox comes from `figureViewBox`).
 */
export function figureInnerSVG(
  spec: ExerciseFigureSpec,
  pose: PoseAngles,
  opts: FigureRenderOpts = {},
): string {
  const fig = buildFigure(pose, spec.view);
  // One style attribute: duplicate style attributes are invalid and browsers
  // keep only the first, which would silently drop the outline.
  const paint = 'style="fill:var(--fig-body,#8ea3c0);stroke:var(--fig-line,#3d5370)"';

  const [hx, hy, hr] = spec.halo;
  const halo = `<circle cx="${hx}" cy="${hy}" r="${hr}" style="fill:var(--fig-halo,#0284c7)" opacity="0.14"/>`;

  // Outlines are drawn as slightly wider dark strokes underneath the body
  // strokes: one technique, no masks, no filters (cheap on old phones).
  const limbsDrawn = fig.limbs
    .map(
      (l) =>
        `<path d="${limbPath(l.points)}" fill="none" ` +
        `style="stroke:var(--fig-body,#8ea3c0);stroke-width:${l.width};stroke-linecap:round;stroke-linejoin:round"/>`,
    )
    .join('');
  const limbsOutline = fig.limbs
    .map(
      (l) =>
        `<path d="${limbPath(l.points)}" fill="none" ` +
        `style="stroke:var(--fig-line,#3d5370);stroke-width:${l.width + 3.5};stroke-linecap:round;stroke-linejoin:round" opacity="0.9"/>`,
    )
    .join('');

  const head =
    `<circle cx="${f1(fig.headCentre[0])}" cy="${f1(fig.headCentre[1])}" r="${f1(fig.headRadius)}" ${paint} stroke-width="2.5"/>`;

  // Torso sits above the limb outlines (shoulders/hips tuck under it) and
  // below the limb bodies and head.
  const torso = `<path d="${torsoPath(fig.torso)}" ${paint} stroke-width="2.5" stroke-linejoin="round"/>`;

  return (
    halo +
    supportSVG(spec) +
    limbsOutline +
    torso +
    limbsDrawn +
    head +
    (opts.showArrow === false ? '' : arrowSVG(spec))
  );
}

/** The spec's focus crop as an SVG viewBox string. */
export function figureViewBox(spec: ExerciseFigureSpec): string {
  return spec.focus.join(' ');
}

/**
 * Key points the figure gate checks against the focus crop: head centre, halo
 * disc and arrow endpoints must all land inside the frame (with margin).
 */
export function figureKeyPoints(
  spec: ExerciseFigureSpec,
  pose: PoseAngles,
): { readonly x: number; readonly y: number; readonly r: number }[] {
  const fig = buildFigure(pose, spec.view);
  const pts = [
    { x: fig.headCentre[0], y: fig.headCentre[1], r: fig.headRadius },
    { x: spec.halo[0], y: spec.halo[1], r: spec.halo[2] },
  ];
  if (spec.arrow) {
    pts.push({ x: spec.arrow.from[0], y: spec.arrow.from[1], r: 12 });
    pts.push({ x: spec.arrow.to[0], y: spec.arrow.to[1], r: 12 });
  }
  return pts;
}
