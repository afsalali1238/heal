/**
 * Deterministic body figures — the drawing layer under every illustration the
 * app shows (area pages, the movement guide, share images, print handouts).
 *
 * ── Why this file exists instead of an image folder ────────────────────────
 * Every anatomy picture this product has ever shipped from a hand-drawn source
 * has eventually disagreed with the map: the wrist floating off the arm, the
 * lower back tappable over the abdomen, the head sitting forward of the
 * shoulders in a chin-tuck illustration (IMAGE-TEST-VERDICT.md). Those are not
 * cosmetic problems — a patient reads the picture, not the paragraph.
 *
 * So figures are **generated from the one joint table the locator already
 * validates** (`geometry/skeleton.ts`, A-006). A figure cannot drift from the
 * map because it *is* the map, redrawn. That also buys three things a bitmap
 * cannot do: it scales to any text size without blurring, it inherits the CSS
 * colour tokens (dark mode free), and it weighs about 2 KB.
 *
 * ── What this module deliberately does not do ─────────────────────────────
 * It draws no skeleton, no muscles, no organs and no technique. It marks which
 * body area a page is about and gives a generic directional glyph for the class
 * of movement the sheet already recorded in `type`. It never depicts a joint
 * angle, a load, or a body position, because nothing in the reviewed data
 * describes those — inventing them would be inventing clinical content.
 */

import { DETAIL, SILHOUETTE, VIEWBOX, type Point } from './geometry/skeleton';
import { GEOMETRY_REGIONS, bbox, type BodyView, type GeometryRegion } from './geometry/regions';

export interface FigureParts {
  /** Filled paths (head, torso) — same paint as the strokes, so overlaps read as one body. */
  filled: readonly string[];
  /** Round-capped limb strokes, each with its own width. */
  strokes: readonly { d: string; w: number }[];
  /** Interior lines that tell front from back at a glance. */
  detail: readonly string[];
  /** The region capsules for this area, already view-filtered. */
  highlight: readonly { d: string; w: number }[];
  /** Tight framing for the highlighted area, or the whole body when there is none. */
  viewBox: string;
  /** Whether anything was highlighted — false means "show the whole body". */
  focused: boolean;
}

/** Regions belonging to one content area (`area_id`), for one view. */
export function regionsForArea(areaId: string, view: BodyView): GeometryRegion[] {
  return GEOMETRY_REGIONS.filter(
    (region) => region.areaId === areaId && region.views.includes(view)
  );
}

/**
 * Which view to draw for an area. `lower-back` only has back geometry, and a
 * figure that highlighted nothing because the front view has no capsule for it
 * would be worse than showing the back — so the choice follows the geometry,
 * never a hand-written table.
 */
export function preferredView(areaId: string): BodyView {
  const front = regionsForArea(areaId, 'front');
  return front.length > 0 ? 'front' : 'back';
}

/**
 * Build the parts. `zoom` frames the figure on the highlighted area; without it
 * the full body is shown so a patient can see where the area sits in the whole.
 */
export function figureParts(areaId: string, view?: BodyView, zoom = false): FigureParts {
  const chosen = view ?? preferredView(areaId);
  const regions = regionsForArea(areaId, chosen);
  const highlight = regions.flatMap((region) => region.shapes.map((s) => ({ d: s.d, w: s.w })));

  let viewBox = VIEWBOX;
  if (zoom && regions.length > 0) {
    const boxes = regions.map((region) => bbox(region));
    const x0 = Math.min(...boxes.map((b) => b.x0));
    const y0 = Math.min(...boxes.map((b) => b.y0));
    const x1 = Math.max(...boxes.map((b) => b.x1));
    const y1 = Math.max(...boxes.map((b) => b.y1));
    // Same aspect lock as focusViewBox(): a distorted body reads as a broken image.
    const target = 240 / 620;
    let w = x1 - x0 + 150;
    let h = y1 - y0 + 150;
    if (w / h > target) h = w / target;
    else w = h * target;
    const x = Math.max(-30, Math.min(x0 - (w - (x1 - x0)) / 2, 270 - w));
    const y = Math.max(-20, Math.min(y0 - (h - (y1 - y0)) / 2, 640 - h));
    viewBox = [x, y, w, h].map((n) => Math.round(n)).join(' ');
  }

  return {
    filled: SILHOUETTE.filled,
    strokes: SILHOUETTE.strokes,
    detail: DETAIL[chosen],
    highlight,
    viewBox,
    focused: highlight.length > 0,
  };
}

/* ── Movement glyphs ─────────────────────────────────────────────────────── */

/**
 * The glyph family. Each one is a *class* of movement recorded in the sheet's
 * `type` column, not a description of a specific joint action, which is why
 * adding a type here requires the column to exist first.
 */
export type MotionGlyph =
  /** Sweeps through a range: range-of-motion, mobility. */
  | 'arc'
  /** Holds still against a load: isometric, stabilisation. */
  | 'pulse'
  /** Moves the area away from and back towards rest: strengthening, concentric, eccentric. */
  | 'linear'
  /** Slow release and return: stretching, offloading, functional, and anything untyped. */
  | 'release';

const GLYPH_BY_TYPE: Readonly<Record<string, MotionGlyph>> = {
  'range-of-motion': 'arc',
  mobility: 'arc',
  isometric: 'pulse',
  stabilisation: 'pulse',
  activation: 'pulse',
  concentric: 'linear',
  eccentric: 'linear',
  isokinetic: 'linear',
  strengthening: 'linear',
  'off-loading': 'release',
  offloading: 'release',
  functional: 'release',
};

export function glyphForType(type?: string): MotionGlyph {
  if (!type) return 'release';
  return GLYPH_BY_TYPE[type] ?? 'release';
}

/** Midpoint of a region's capsules — where a glyph is anchored. */
function anchorOf(regions: GeometryRegion[]): Point | null {
  const boxes = regions.map((region) => bbox(region));
  if (boxes.length === 0) return null;
  return [
    (Math.min(...boxes.map((b) => b.x0)) + Math.max(...boxes.map((b) => b.x1))) / 2,
    (Math.min(...boxes.map((b) => b.y0)) + Math.max(...boxes.map((b) => b.y1))) / 2,
  ];
}

/** Spread of a region, used to size the glyph to the body part instead of the page. */
function spreadOf(regions: GeometryRegion[]): number {
  const boxes = regions.map((region) => bbox(region));
  if (boxes.length === 0) return 90;
  const w = Math.max(...boxes.map((b) => b.x1)) - Math.min(...boxes.map((b) => b.x0));
  const h = Math.max(...boxes.map((b) => b.y1)) - Math.min(...boxes.map((b) => b.y0));
  return Math.max(52, Math.min(150, Math.max(w, h)));
}

export interface Glyph {
  /** Static paths, drawn for the no-JS and reduced-motion states. */
  static: readonly string[];
  /** Paths that animate (translate/rotate/scale is done in CSS by class). */
  moving: readonly string[];
  /** CSS animation name to apply to `.moving`, per glyph family. */
  animation: string;
  /** transform-origin in user units, so rotation pivots at the joint, not the page corner. */
  origin: Point;
}

/** A small arrowhead as a path at (x, y) pointing along angle a (radians). */
function head(x: number, y: number, a: number, size = 11): string {
  const spread = 0.42;
  const p1 = [x + Math.cos(a + Math.PI - spread) * size, y + Math.sin(a + Math.PI - spread) * size];
  const p2 = [x + Math.cos(a + Math.PI + spread) * size, y + Math.sin(a + Math.PI + spread) * size];
  return `M${p1[0].toFixed(1)} ${p1[1].toFixed(1)} L${x.toFixed(1)} ${y.toFixed(1)} L${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
}

/**
 * Build the glyph for one area. Pure geometry in, pure geometry out — no
 * randomness, so two builds of the same content draw the identical figure and a
 * reviewer only has to check a picture once.
 */
export function buildGlyph(areaId: string, type?: string, view?: BodyView): Glyph | null {
  const chosen = view ?? preferredView(areaId);
  const regions = regionsForArea(areaId, chosen);
  if (regions.length === 0) return null;
  const [cx, cy] = anchorOf(regions)!;
  const r = spreadOf(regions) * 0.62;
  const kind = glyphForType(type);

  if (kind === 'arc') {
    // A swept arc with heads at both ends: "there and back through a range".
    const start = Math.PI * 0.78;
    const end = Math.PI * 0.22;
    const p0: Point = [cx + Math.cos(start) * r, cy + Math.sin(start) * r];
    const p1: Point = [cx + Math.cos(end) * r, cy + Math.sin(end) * r];
    const d = `M${p0[0].toFixed(1)} ${p0[1].toFixed(1)} A${r.toFixed(1)} ${r.toFixed(1)} 0 0 1 ${p1[0].toFixed(1)} ${p1[1].toFixed(1)}`;
    return {
      static: [],
      moving: [
        d,
        head(p1[0], p1[1], end - Math.PI / 2 + Math.PI * 0.5),
        head(p0[0], p0[1], start + Math.PI / 2 - Math.PI * 0.5),
      ],
      animation: 'glyph-arc',
      origin: [cx, cy],
    };
  }

  if (kind === 'pulse') {
    // Two concentric rings: hold and breathe, load with no joint movement.
    return {
      static: [],
      moving: [
        `M${cx - r} ${cy} a${r} ${r} 0 1 0 ${r * 2} 0 a${r} ${r} 0 1 0 ${-r * 2} 0`,
        `M${cx - r * 0.62} ${cy} a${r * 0.62} ${r * 0.62} 0 1 0 ${r * 1.24} 0 a${r * 0.62} ${r * 0.62} 0 1 0 ${-r * 1.24} 0`,
      ],
      animation: 'glyph-pulse',
      origin: [cx, cy],
    };
  }

  if (kind === 'linear') {
    // A straight out-and-back with heads at both ends.
    const d = `M${cx - r * 0.8} ${cy} L${cx + r * 0.8} ${cy}`;
    return {
      static: [],
      moving: [d, head(cx + r * 0.8, cy, 0), head(cx - r * 0.8, cy, Math.PI)],
      animation: 'glyph-linear',
      origin: [cx, cy],
    };
  }

  // release: a slow vertical ease, down-and-back, for stretch and offload work.
  const d = `M${cx} ${cy - r * 0.72} L${cx} ${cy + r * 0.72}`;
  return {
    static: [],
    moving: [d, head(cx, cy + r * 0.72, Math.PI / 2), head(cx, cy - r * 0.72, -Math.PI / 2)],
    animation: 'glyph-release',
    origin: [cx, cy],
  };
}

/**
 * Full standalone SVG for one area, used by the print handout, the raster share
 * images and the `scripts/render-share-images.mjs` generator.
 *
 * Colours are literal here (this output leaves the page and its CSS), but they
 * are the same values as the tokens in `styles/tokens.css`, and the token file
 * is the thing to edit if the palette changes.
 */
export function standaloneFigure(
  areaId: string,
  opts: {
    view?: BodyView;
    width?: number;
    background?: string;
    body?: string;
    accent?: string;
    glyph?: MotionGlyph | null;
  } = {}
): string {
  const { view, width = 480, background = '#F3F4F6', body = '#D7DBE2', accent = '#0ea5e9' } = opts;
  const parts = figureParts(areaId, view);
  const viewBox = parts.viewBox;
  const glyph = opts.glyph ? buildGlyph(areaId, undefined, view) : null;

  const paths: string[] = [];
  for (const d of parts.filled) paths.push(`<path d="${d}" fill="${body}"/>`);
  for (const s of parts.strokes)
    paths.push(
      `<path d="${s.d}" stroke="${body}" stroke-width="${s.w}" stroke-linecap="round" fill="none"/>`
    );
  for (const d of parts.detail)
    paths.push(
      `<path d="${d}" stroke="${background}" stroke-width="3" stroke-linecap="round" fill="none" opacity="0.75"/>`
    );
  for (const h of parts.highlight)
    paths.push(
      `<path d="${h.d}" stroke="${accent}" stroke-width="${h.w}" stroke-linecap="round" fill="none" opacity="0.35"/>`
    );
  if (glyph) {
    for (const d of [...glyph.static, ...glyph.moving])
      paths.push(
        `<path d="${d}" stroke="${accent}" stroke-width="7" stroke-linecap="round" fill="none"/>`
      );
  }

  const height = Math.round(
    (width * Number(viewBox.split(' ')[3])) / Number(viewBox.split(' ')[2])
  );
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="${width}" height="${height}" role="img">${paths.join('')}</svg>`;
}
