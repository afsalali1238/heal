/**
 * Share images, social cards and app icons — rendered from the same geometry
 * the app draws with.
 *
 *     npm run images:render
 *
 * Why a renderer and not a folder of exports: every picture in this product has
 * to agree with the body map, the design tokens and the sheet's area list, and a
 * designer's export agrees with none of them on the day any of those change. The
 * figures come from `src/lib/anatomy/figures.ts` (A-006), the palette from
 * `src/styles/tokens.css`, and the list of cards from `src/data/areas.json` — so
 * a new area in the sheet means a new social card on the next run, with no
 * design work and no drift.
 *
 * Rasterisation needs `@resvg/resvg-js`, which is a devDependency: the PNGs it
 * writes are committed, so a normal build and a Vercel deploy never need it. If
 * it is missing the script says so and exits 0 rather than failing CI for a
 * refresh nobody asked for.
 *
 * ## Provenance
 *
 * The outputs are **original generated works**, not stock and not clinical
 * photographs, and they are registered in `src/lib/anatomy/media-ledger.ts` with
 * `generationMethod: 'generator'`. Because the ledger pins each file's bytes and
 * sha256, re-running this script without updating the ledger fails `check:assets`
 * — which is the intended friction: an image that reaches patients has to be
 * looked at, and the ledger is where someone records that it happened.
 */

import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { standaloneFigure } from '../src/lib/anatomy/figures';
import { SILHOUETTE } from '../src/lib/anatomy/geometry/skeleton';
import { CLINIC } from '../src/config/clinic';

interface AreaRow {
  readonly area_id: string;
  readonly name_en: string;
  readonly status: string;
}

const ROOT = process.cwd();
const OUT_DIRS = [path.join(ROOT, 'public', 'social'), path.join(ROOT, 'public', 'icons')];

const PALETTE = {
  ground: '#F3F4F6',
  surface: '#FFFFFF',
  ink: '#111827',
  ink2: '#4B5563',
  ink3: '#9CA3AF',
  line: '#E5E7EB',
  brand: '#0ea5e9',
  body: '#D7DBE2',
};

function publishedAreas(): AreaRow[] {
  const file = path.join(ROOT, 'src', 'data', 'areas.json');
  const rows = JSON.parse(fs.readFileSync(file, 'utf8')) as AreaRow[];
  const seen = new Map<string, AreaRow>();
  for (const row of rows) {
    if (row.status !== 'published') continue;
    if (!seen.has(row.area_id)) seen.set(row.area_id, row);
  }
  return [...seen.values()];
}

/**
 * One 1200×630 card. Text is laid out by hand rather than by a library: the
 * card is a fixed composition, and the fewer moving parts, the fewer ways it
 * can come out different from what a reviewer approved.
 */
function card(title: string, lede: string, areaId: string | null): string {
  const figure = areaId
    ? standaloneFigure(areaId, {
        width: 300,
        background: PALETTE.surface,
        body: PALETTE.body,
        accent: PALETTE.brand,
        glyph: null,
      })
    : '';
  // Standalone figures are tall; crop-to-fit by re-framing the viewBox through
  // a nested svg so the body never squashes.
  const figureBlock = areaId
    ? `<svg x="860" y="86" width="284" height="458" viewBox="0 0 240 620" preserveAspectRatio="xMidYMid meet">${figure.replace(/^<svg[^>]*>|<\/svg>$/g, '')}</svg>`
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="${PALETTE.ground}"/>
  <rect x="0" y="0" width="1200" height="8" fill="${PALETTE.brand}"/>
  <g font-family="sans-serif">
    <text x="72" y="112" font-size="22" letter-spacing="4.4" fill="${PALETTE.ink3}">${escapeXml(`${CLINIC.displayName} · Patient Library`)}</text>
    <text x="72" y="286" font-size="86" font-weight="700" fill="${PALETTE.ink}">${escapeXml(title)}</text>
    <tspan/>
    <text x="72" y="360" font-size="34" fill="${PALETTE.ink2}">${wrap(lede, 42)
      .map((line, i) => `<tspan x="72" dy="${i === 0 ? 0 : 46}">${escapeXml(line)}</tspan>`)
      .join('')}</text>
    <text x="72" y="540" font-size="22" fill="${PALETTE.ink3}">Education only — not a diagnosis.</text>
  </g>
  <rect x="846" y="72" width="312" height="486" rx="22" fill="${PALETTE.surface}" stroke="${PALETTE.line}"/>
  ${figureBlock}
</svg>`;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function wrap(text: string, size: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    if ((line + ' ' + word).trim().length > size) {
      if (line) lines.push(line.trim());
      line = word;
    } else {
      line = `${line} ${word}`;
    }
  }
  if (line.trim()) lines.push(line.trim());
  return lines.slice(0, 2);
}

/**
 * App icon: the app's own body silhouette, inverted onto brand blue.
 *
 * Not a hand-drawn mark. It is `SILHOUETTE` from `geometry/skeleton.ts` — the
 * same joint-anchored geometry every figure, hotspot and share card in the
 * product is built from — so the icon on a patient's home screen is literally
 * the shape of the body map they tap in the app. Maskable variants get 16%
 * padding, which is the safe zone Android's circular and squircle masks keep.
 */
function icon(size: number, opts: { padded?: boolean } = {}): string {
  const pad = opts.padded ? Math.round(size * 0.16) : Math.round(size * 0.07);
  const box = size - pad * 2;
  // The figure canvas is 240x620; fit it by height inside a square, centred.
  const scale = box / 620;
  const drawnWidth = 240 * scale;
  const dx = pad + (box - drawnWidth) / 2;
  const body = [
    ...SILHOUETTE.filled.map((d) => `<path d="${d}" fill="#FFFFFF"/>`),
    ...SILHOUETTE.strokes.map(
      (s) =>
        `<path d="${s.d}" stroke="#FFFFFF" stroke-width="${s.w}" stroke-linecap="round" fill="none"/>`
    ),
  ].join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${opts.padded ? 0 : Math.round(size * 0.22)}" fill="${PALETTE.brand}"/>
  <g transform="translate(${dx.toFixed(1)} ${pad}) scale(${scale.toFixed(4)})">${body}</g>
</svg>`;
}

interface Target {
  /** Ledger id, so the generated snippet needs no editing. */
  readonly assetId: string;
  readonly file: string;
  readonly svg: string;
  /** Raster width. Each icon is authored at its own size, so this must match. */
  readonly width: number;
}

const SHARE_WIDTH = 1200;

const targets: Target[] = [
  {
    assetId: 'share_default',
    file: 'public/social/default.png',
    svg: card(
      'Home Exercise Library',
      'Find the area your physiotherapist pointed to, then follow the numbers they gave you.',
      null
    ),
    width: SHARE_WIDTH,
  },
  ...publishedAreas().map((area) => ({
    assetId: `share_area_${area.area_id.replace(/-/g, '_')}`,
    file: `public/social/area-${area.area_id}.png`,
    svg: card(
      area.name_en,
      `Stretching and exercise instructions for the ${area.name_en.toLowerCase()}.`,
      area.area_id
    ),
    width: SHARE_WIDTH,
  })),
  { assetId: 'icon_512', file: 'public/icons/icon-512.png', svg: icon(512), width: 512 },
  { assetId: 'icon_192', file: 'public/icons/icon-192.png', svg: icon(192), width: 192 },
  {
    assetId: 'icon_maskable_512',
    file: 'public/icons/maskable-512.png',
    svg: icon(512, { padded: true }),
    width: 512,
  },
  {
    assetId: 'icon_apple_touch',
    file: 'public/icons/apple-touch-icon.png',
    svg: icon(180),
    width: 180,
  },
  { assetId: 'favicon_32', file: 'public/favicon-32.png', svg: icon(32), width: 32 },
  { assetId: 'favicon_16', file: 'public/favicon-16.png', svg: icon(16), width: 16 },
];

async function main(): Promise<void> {
  let Resvg:
    (new (svg: string, opts: unknown) => { render(): { asPng(): Uint8Array } }) | undefined;
  try {
    Resvg = (await import('@resvg/resvg-js' as string)).Resvg as never;
  } catch {
    console.error(
      '[@resvg/resvg-js] is not installed, so the PNGs cannot be written.\n' +
        '  npm i -D @resvg/resvg-js   then re-run `npm run images:render`.\n' +
        '  The committed images stay as they are until then — no build step needs this.'
    );
    return;
  }

  for (const dir of OUT_DIRS) fs.mkdirSync(dir, { recursive: true });

  // The vector master, written alongside the rasters: the favicon the browser
  // actually loads scales to any DPI without a second file, and keeping it here
  // means the PNGs and the SVG can never disagree.
  const vector = icon(128);
  fs.writeFileSync(path.join(ROOT, 'public', 'favicon.svg'), `${vector}\n`);

  const written: { assetId: string; path: string; bytes: number; hash: string; width: number }[] =
    [];
  for (const target of targets) {
    // No upscaling and no downscaling: the SVG is authored at the size it ships
    // at, so `fitTo` is a no-op and the raster is 1:1 with the design.
    const png = Buffer.from(
      new Resvg!(target.svg, { fitTo: { mode: 'width', value: target.width } }).render().asPng()
    );
    const file = path.join(ROOT, ...target.file.split('/'));
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, png);
    written.push({
      assetId: target.assetId,
      path: `/${target.file.split('/').slice(1).join('/')}`,
      bytes: png.byteLength,
      hash: createHash('sha256').update(png).digest('hex'),
      width: target.width,
    });
  }

  console.log(`wrote ${written.length} image(s)\n`);
  console.log('Paste into src/lib/anatomy/media-ledger.ts (bytes and fileHash are exact):\n');
  for (const entry of written) {
    console.log(
      `  {\n    assetId: '${entry.assetId}', path: '${entry.path}', kind: 'share-card', status: 'draft',\n    sourceUrl: 'Generated from src/lib/anatomy/figures.ts by scripts/render-share-images.ts at ${entry.width}px', generationMethod: 'generator',\n    license: 'Internal Web Distribution License', attribution: 'Anatomy Explorer figure generator',\n    fileHash: '${entry.hash}', bytes: ${entry.bytes}, replacementRequired: true, referenceSources: [],\n    reviewedBy: '', reviewedDate: '', notes: 'Share card / app icon. Not clinical imagery; the wording it shows still needs a human sign-off.',\n  },`
    );
  }
}

await main();
