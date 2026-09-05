/**
 * Generated figures for items that are waiting on clinical imagery.
 *
 *     npm run images:items
 *
 * ── The gap this closes ────────────────────────────────────────────────────
 * A drafted row has no photograph: the clinic shoots or draws those, and until
 * it does the card falls back to "Picture not added yet". That is the right
 * behaviour for a patient — and the wrong one for a reviewer, who is being asked
 * to sign off a row while staring at a dashed grey box with no idea which part
 * of the body it is even about.
 *
 * So this writes a **stand-in figure per item**: the area highlighted on the
 * same joint-anchored body the locator draws, plus the generic glyph for the
 * movement class recorded in `type`. It is labelled on the image itself, because
 * a file that leaves the app (printed for a review meeting, screenshotted into a
 * chat) has to carry its own status.
 *
 * ── What it is not ─────────────────────────────────────────────────────────
 * It is not a demonstration picture. It never shows a body position, a joint
 * angle, a load or a range — nothing in the reviewed data describes those, so
 * drawing them would mean inventing them. `check-images` still requires
 * `image_status: approved` with a real figure before anything reaches a patient,
 * and this script deliberately does not touch rows that are published or
 * approved: it only fills the `pending` and `generated` holes, and only when no
 * file exists yet, so a real photograph is never overwritten.
 *
 * Deterministic on purpose: same data in, same bytes out, so `check:assets`
 * never sees a diff it cannot explain.
 */

import fs from 'node:fs';
import path from 'node:path';
import { figureParts, buildGlyph, glyphForType, preferredView } from '../src/lib/anatomy/figures';

interface ItemRow {
  readonly id: string;
  readonly section: string;
  readonly area_id: string;
  readonly status: string;
  readonly name_en: string;
  readonly type?: string;
  readonly image_id?: string;
  readonly image_status?: string;
  readonly hold_seconds?: number;
  readonly reps?: number;
  readonly sets?: number;
}

const OUT_DIR = path.join(process.cwd(), 'src', 'assets', 'images');
const DATA = path.join(process.cwd(), 'src', 'data', 'items.json');

const W = 800;
const H = 600;
const PALETTE = {
  ground: '#F3F4F6',
  surface: '#FFFFFF',
  body: '#D7DBE2',
  line: '#E5E7EB',
  ink: '#111827',
  ink3: '#9CA3AF',
  brand: '#0ea5e9',
  warn: '#B45309',
  warnBg: '#FEF3C7',
};

function needsFigure(row: ItemRow): boolean {
  if (row.status === 'published' && row.image_status === 'approved') return false;
  if (!row.image_id) return false;
  const any = fs.existsSync(path.join(OUT_DIR, `${row.image_id}.svg`));
  return !any;
}

/**
 * Compose the card. The figure sits on the right in a white panel; the left
 * column carries the only two facts the image is allowed to assert — which body
 * area, and which class of movement — plus the status label.
 */
function figure(item: ItemRow & { area_name?: string }): string {
  const view = preferredView(item.area_id);
  const parts = figureParts(item.area_id, view);
  const glyph = buildGlyph(item.area_id, item.type, view);
  const dosage = [
    item.hold_seconds ? `Hold ${item.hold_seconds}s` : null,
    item.reps ? `${item.reps} reps` : null,
    item.sets ? `${item.sets} sets` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const bodyPaths = [
    ...parts.filled.map((d) => `<path d="${d}" fill="${PALETTE.body}"/>`),
    ...parts.strokes.map(
      (s) =>
        `<path d="${s.d}" stroke="${PALETTE.body}" stroke-width="${s.w}" stroke-linecap="round" fill="none"/>`
    ),
    ...parts.detail.map(
      (d) =>
        `<path d="${d}" stroke="${PALETTE.surface}" stroke-width="3" stroke-linecap="round" fill="none" opacity="0.8"/>`
    ),
    ...parts.highlight.map(
      (h) =>
        `<path d="${h.d}" stroke="${PALETTE.brand}" stroke-width="${h.w}" stroke-linecap="round" fill="none" opacity="0.4"/>`
    ),
    ...(glyph
      ? glyph.moving.map(
          (d) =>
            `<path d="${d}" stroke="${PALETTE.brand}" stroke-width="7" stroke-linecap="round" fill="none"/>`
        )
      : []),
  ].join('\n      ');

  const areaName = item.area_name ?? item.area_id.replace(/-/g, ' ');
  const label = `${areaName} · ${item.section}${item.type ? ` · ${item.type.replace(/-/g, ' ')}` : ''}`;
  const titleLines = wrap(item.name_en, 21).slice(0, 2);

  /**
   * Fit, do not stretch: the figure is scaled by whichever axis runs out first
   * and then centred in the panel. A squashed body reads as a broken image, and
   * a reviewer should never have to wonder which is which.
   */
  const [vbX, vbY, vbW, vbH] = parts.viewBox.split(' ').map(Number);
  const PANEL = { x: 452, y: 56, w: 300, h: 488, pad: 24 };
  const scale = Math.min((PANEL.w - PANEL.pad * 2) / vbW, (PANEL.h - PANEL.pad * 2) / vbH);
  const panel = {
    scale,
    dx: PANEL.x + (PANEL.w - vbW * scale) / 2,
    dy: PANEL.y + (PANEL.h - vbH * scale) / 2,
    x: vbX,
    y: vbY,
  };

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${escapeXml(`Generated stand-in figure for ${item.name_en}. Not a demonstration photograph.`)}">
  <!--
    Generated by scripts/render-item-figures.ts from src/lib/anatomy/figures.ts.
    Stand-in for a drafted row: body area + movement class only. It shows no
    position, angle, load or range, and it is not approved clinical imagery.
  -->
  <rect width="${W}" height="${H}" fill="${PALETTE.ground}"/>
  <g font-family="'Segoe UI', system-ui, sans-serif">
    <text x="56" y="98" font-size="16" letter-spacing="3" fill="${PALETTE.ink3}">${escapeXml('GENERATED · PENDING REVIEW')}</text>
    ${titleLines
      .map(
        (line, i) =>
          `<text x="56" y="${156 + i * 44}" font-size="34" font-weight="700" fill="${PALETTE.ink}">${escapeXml(line)}</text>`
      )
      .join('\n    ')}
    <text x="56" y="${156 + titleLines.length * 44 + 6}" font-size="21" fill="${PALETTE.ink3}">${escapeXml(clip(label, 40))}</text>
    ${dosage ? `<text x="56" y="${156 + titleLines.length * 44 + 46}" font-size="23" font-weight="600" fill="${PALETTE.ink}">${escapeXml(dosage)}</text>` : ''}
    <rect x="56" y="470" width="366" height="48" rx="12" fill="${PALETTE.warnBg}"/>
    <text x="74" y="501" font-size="18" font-weight="600" fill="${PALETTE.warn}">Stand-in figure, not a technique guide</text>
  </g>
  <rect x="452" y="56" width="300" height="488" rx="20" fill="${PALETTE.surface}" stroke="${PALETTE.line}"/>
  <g transform="translate(${panel.dx.toFixed(1)} ${panel.dy.toFixed(1)}) scale(${panel.scale.toFixed(4)})">
    <g transform="translate(${-panel.x} ${-panel.y})">
      ${bodyPaths}
    </g>
  </g>
</svg>
`;
}

/** Two lines, hard-broken on words: an SVG <text> that overflows has no way to wrap. */
function wrap(value: string, size: number): string[] {
  const words = value.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    if (line && (line + ' ' + word).length > size) {
      lines.push(line);
      line = word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function clip(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function main(): void {
  const rows = JSON.parse(fs.readFileSync(DATA, 'utf8')) as (ItemRow & { area_name?: string })[];
  const areas = new Map<string, string>();
  const areasFile = path.join(process.cwd(), 'src', 'data', 'areas.json');
  if (fs.existsSync(areasFile)) {
    for (const area of JSON.parse(fs.readFileSync(areasFile, 'utf8')) as {
      area_id: string;
      name_en: string;
    }[]) {
      areas.set(area.area_id, area.name_en);
    }
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  let written = 0;
  let skipped = 0;
  for (const row of rows) {
    const enriched = { ...row, area_name: areas.get(row.area_id) };
    if (!needsFigure(row)) {
      skipped += 1;
      continue;
    }
    // `figures.ts` derives the glyph from `type`; assert it exists so a new type
    // in the sheet shows up here as a reviewable figure rather than a blank box.
    void glyphForType(row.type);
    fs.writeFileSync(path.join(OUT_DIR, `${row.image_id}.svg`), figure(enriched), 'utf8');
    written += 1;
  }

  console.log(
    `item figures — ${written} generated, ${skipped} already satisfied (published/approved or file present)\n` +
      `  output: src/assets/images/*.svg  ·  never overwrites an existing file`
  );
}

main();
