/**
 * The movement figures for published rows that have no real picture.
 *
 *     npm run images:movement              write the figures
 *     npm run images:movement -- --check   coverage + quote audit, write nothing
 *     npm run images:movement -- --frames  stills into /tmp, for looking at
 *
 * ── The gap this closes ────────────────────────────────────────────────────
 * 24 published rows carry `image_status: "approved"` on a 68-byte 1×1 PNG, so every
 * one of those cards tells a patient "Picture not added yet". The fix a patient wants
 * is a picture. The fix this project can stand behind is a picture derived from the
 * row's own reviewed sentence and checked against it on every build.
 *
 * The archived clinical sign-off (`docs/archive/legacy-2026-08-26/handoffs-v1/
 * H-CLINICAL-SIGNOFF.md`) is why it is not a photograph of a person: a photoreal
 * render of the chin tuck drew the head forward of the shoulders — the posture the
 * exercise exists to correct — and it survived review because it looked professional.
 * So these figures are geometry, drawn from `lib/anatomy/poses.ts`, which quotes each
 * row's `movement_en` / `start_position_en` / `direction_en` / `return_en` verbatim.
 * `scripts/check-poses.ts` fails the build when a quote stops matching the sheet: a
 * figure cannot go on illustrating words that were edited away underneath it.
 *
 * ── What a figure claims, and what it does not ─────────────────────────────
 * It claims: the posture, the joint, the direction, and that the movement runs
 * between the two states the sentence names. It does not claim a range, a load, a
 * speed or a count — amplitudes are drawing constants and no degrees are rendered
 * (the one exception is `ex-knee-03`, whose row itself says 45 degrees).
 *
 * It also has to survive being wrong-looking, because a clinician reviews it. So the
 * file is three layers — faded start state, solid end state, dashed arc between them —
 * with the animation sweeping exactly that arc, and the source sentence printed in
 * the image. Printed, screenshotted, animated off, or reduced-motion: same figure,
 * same information, and it carries its own label wherever it goes.
 *
 * A row that already has a real file is skipped, and the real file always wins the
 * lookup (`lib/images.ts`), so attaching a photograph retires the schematic by
 * itself. Deterministic output: same data in, same bytes out.
 */

import fs from 'node:fs';
import path from 'node:path';
import {
  BONES,
  CYCLE_SECONDS,
  POSTURES,
  actorBonesFor,
  arcFor,
  boneTimeline,
  fitFor,
  floorFor,
  frameAt,
  planFor,
  sceneFor,
  supportsFor,
  viewFor,
} from '../src/lib/anatomy/movement';
import { poseJoints } from '../src/lib/anatomy/movement';
import { PLANS, quotedFields, type MotionPlan } from '../src/lib/anatomy/poses';

const W = 420;
const H = 560;

const INK = {
  surface: '#FFFFFF',
  bone: '#5A6473',
  /** Scenery: present, quieter, never animated. */
  boneStill: '#ADB5C2',
  boneEnd: '#1D4ED8',
  ghost: '#C9CFDA',
  arc: '#1D4ED8',
  support: '#E2E5EB',
  focus: 'rgba(240, 190, 110, 0.45)',
  ink: '#111827',
  soft: '#4B5563',
  label: '#6B7280',
};

interface ItemRow {
  readonly id: string;
  readonly status: string;
  readonly name_en: string;
  readonly image_id?: string;
  readonly image_status?: string;
  readonly start_position_en?: string;
  readonly movement_en?: string;
  readonly direction_en?: string;
  readonly return_en?: string;
  readonly safety_en?: string;
  readonly [key: string]: unknown;
}

const r = (n: number) => Math.round(n * 10) / 10;

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** SVG has no text wrapping at all, so the caption is wrapped here. */
function wrap(text: string, perLine: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    if (`${line} ${word}`.trim().length > perLine && line) {
      lines.push(line);
      line = word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function bones(pose: ReturnType<typeof poseJoints>, color: string, opacity: number): string {
  return BONES.map((bone) => {
    if (bone.round) {
      const [cx, cy] = pose.joints[`${bone.name}:end`];
      return `<circle cx="${r(cx)}" cy="${r(cy)}" r="${r(bone.length * 0.82)}" fill="${color}" opacity="${opacity}" />`;
    }
    const a = pose.joints[`${bone.name}:start`];
    const b = pose.joints[`${bone.name}:end`];
    return `<path d="M${r(a[0])} ${r(a[1])} L${r(b[0])} ${r(b[1])}" stroke="${color}" stroke-opacity="${opacity}" stroke-width="${bone.width}" stroke-linecap="round" fill="none" />`;
  }).join('\n      ');
}

/**
 * The animated body as nested groups, one per bone, so a shin follows its thigh by
 * construction rather than by a second animation that could drift out of step with
 * the first. Rotation origins are the joint the bone hangs from, in viewBox units.
 */
function animatedBody(plan: MotionPlan): string {
  const pose = poseJoints(POSTURES[plan.posture], frameAt(plan, 0), viewFor(plan));
  const moving = boneTimeline(plan);
  const actors = actorBonesFor(plan);

  const build = (name: string): string => {
    const bone = BONES.find((entry) => entry.name === name)!;
    const children = BONES.filter((entry) => entry.parent === name).map((entry) =>
      build(entry.name)
    );
    const stops = moving.get(name);
    const origin = pose.joints[`${name}:start`];
    const shape = bone.round
      ? (() => {
          const [cx, cy] = pose.joints[`${name}:end`];
          const fill = actors.has(name) ? INK.bone : INK.boneStill;
          return `<circle cx="${r(cx)}" cy="${r(cy)}" r="${r(bone.length * 0.82)}" fill="${fill}" />`;
        })()
      : (() => {
          const [ax, ay] = pose.joints[`${name}:start`];
          const [bx, by] = pose.joints[`${name}:end`];
          const stroke = actors.has(name) ? INK.bone : INK.boneStill;
          return `<path d="M${r(ax)} ${r(ay)} L${r(bx)} ${r(by)}" stroke="${stroke}" stroke-width="${bone.width}" stroke-linecap="round" fill="none" />`;
        })();
    const style = stops
      ? ` style="transform-origin:${r(origin[0])}px ${r(origin[1])}px;transform-box:view-box;animation:mv-${name} ${CYCLE_SECONDS}s linear infinite"`
      : '';
    return `<g${stops ? ` class="mv"` : ''}${style}>${shape}${children.join('')}</g>`;
  };

  return BONES.filter((bone) => !bone.parent)
    .map((bone) => build(bone.name))
    .join('\n      ');
}

function keyframes(plan: MotionPlan): string {
  const posture = POSTURES[plan.posture];
  return [...boneTimeline(plan).entries()]
    .map(([bone, stops]) => {
      const base = posture.angles[bone] ?? 0;
      const body = stops
        .map((stop) => {
          const slide =
            stop.slide[0] || stop.slide[1]
              ? ` translate(${r(stop.slide[0])}px, ${r(stop.slide[1])}px)`
              : '';
          return `      ${stop.t}% { transform:${slide} rotate(${r(stop.deg)}deg); }`;
        })
        .join('\n');
      return `    @keyframes mv-${bone} {\n${body}\n    }`;
    })
    .join('\n');
}

/** The gap under the lower back, at both ends of the movement — a pelvic tilt is that gap. */
function gapMark(plan: MotionPlan, at: number): string {
  if (!plan.marks?.includes('lumbar-gap')) return '';
  const scene = sceneFor(plan, frameAt(plan, at));
  const waist = scene.focus[0];
  const floor = floorFor([scene]);
  const part = (point: readonly [number, number]) => {
    const x = r(point[0]);
    const y1 = r(point[1] + 12);
    const y2 = r(floor);
    return `<path d="M${x} ${y1} L${x} ${y2}" stroke="${INK.arc}" stroke-width="2.4" stroke-dasharray="4 4" /><path d="M${x - 9} ${y1} L${x + 9} ${y1} M${x - 9} ${y2} L${x + 9} ${y2}" stroke="${INK.arc}" stroke-width="2.4" />`;
  };
  return part(waist);
}

export function figureSvg(
  item: ItemRow,
  plan: MotionPlan,
  options: { animate?: boolean } = {}
): string {
  const animate = options.animate !== false;
  const posture = POSTURES[plan.posture];
  const view = viewFor(plan);
  const startFrame = frameAt(plan, 0);
  const endFrame = frameAt(plan, 1);
  const start = sceneFor(plan, startFrame);
  const end = sceneFor(plan, endFrame);
  const startPose = poseJoints(posture, startFrame, view);
  const endPose = poseJoints(posture, endFrame, view);
  const fit = fitFor([start, end], { x: 14, y: 70, w: W - 28, h: 330 });
  const floorY = floorFor([start, end]);
  const supports = supportsFor(plan, start, floorY);
  const arc = arcFor(plan);
  const caption = wrap(plan.from.move ?? '', 48);
  const note = wrap(
    plan.note ??
      'Range: as far as the words say. The picture shows which joint moves, not how far.',
    60
  );
  const quoteY = H - 24 - (caption.length + note.length - 1) * 15;

  const style = animate
    ? `  <style>
    .mv { will-change: transform; }
${keyframes(plan)}
    /* Reduced motion and print both fall back to the two states, which say the same
       thing without moving: the faded body is where it starts, the solid outline and
       the arc are where it ends. */
    @media (prefers-reduced-motion: reduce), print {
      .live { display: none; }
      .end { opacity: 1 !important; }
    }
  </style>`
    : '  <style>.mv { animation: none; }</style>';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-labelledby="fig-title-${item.id}">
  <title id="fig-title-${item.id}">${escapeXml(item.name_en)} — movement figure</title>
  <desc>${escapeXml(
    `Schematic movement figure. ${plan.from.move ?? ''} ${plan.note ?? ''} The range is whatever the words describe, not what this drawing shows.`
  )}</desc>
${style}
  <rect width="${W}" height="${H}" fill="${INK.surface}" />
  <g transform="${fit.transform}">
    ${supports.map((line) => `<path d="${line.d}" stroke="${INK.support}" stroke-width="${line.width}" stroke-linecap="round" fill="none" />`).join('\n    ')}
    <g class="ghost">
      ${bones(startPose, INK.ghost, 0.95)}
    </g>
    <g class="end" opacity="0.62">
      ${bones(endPose, INK.boneEnd, 0.72)}
    </g>
    <g class="focus">
      ${start.focus.map((point) => `<circle cx="${r(point[0])}" cy="${r(point[1])}" r="21" fill="${INK.focus}" />`).join('\n      ')}
      ${gapMark(plan, 0)}
      ${gapMark(plan, 1)}
    </g>
    <path d="${arc.d}" stroke="${INK.arc}" stroke-width="3" stroke-dasharray="7 6" fill="none" opacity="0.85" />
    <path d="${arc.head}" stroke="${INK.arc}" stroke-width="3" stroke-linecap="round" fill="none" opacity="0.85" />
    <g class="live">
      ${animatedBody(plan)}
    </g>
  </g>
  <g font-family="system-ui, -apple-system, Segoe UI, sans-serif">
    <text x="22" y="30" font-size="19" font-weight="600" fill="${INK.ink}">${escapeXml(item.name_en)}</text>
    <text x="22" y="50" font-size="13" fill="${INK.label}">Schematic drawn from the words below — not a photograph</text>
${[
  ...caption.map((line) => ({ text: line, small: false })),
  ...note.map((line) => ({ text: line, small: true })),
]
  .map(
    (entry, index) =>
      `    <text x="22" y="${quoteY + index * 15}" font-size="${entry.small ? 12 : 14}" fill="${entry.small ? INK.label : INK.soft}">${escapeXml(entry.text)}</text>`
  )
  .join('\n')}
  </g>
</svg>
`;
}

// ── The run ──────────────────────────────────────────────────────────────────
//
// `main()` only runs when this file is the entry point: `tests/movement.test.ts`
// imports `figureSvg` from here to prove the shipped file is byte-identical to what
// the code generates, and an import must never write to src/assets.

function main(): void {
  const args = process.argv.slice(2);
  const check = args.includes('--check');
  const frames = args.includes('--frames');
  const raw = JSON.parse(fs.readFileSync('src/data/items.json', 'utf8'));
  const items: ItemRow[] = Array.isArray(raw) ? raw : raw.items;
  const published = items.filter((item) => item.status === 'published');
  const imagesDir = 'src/assets/images';

  const written: string[] = [];
  const skipped: string[] = [];
  const unplanned: string[] = [];

  for (const item of published) {
    const plan = planFor(item.id);
    const imageId = item.image_id ?? item.id;
    if (!plan) {
      unplanned.push(item.id);
      continue;
    }
    const existing = fs
      .readdirSync(imagesDir)
      .filter((file) => file.replace(/\.[a-z]+$/, '') === imageId && !file.endsWith('.svg'));
    const real = existing.find((file) => fs.statSync(path.join(imagesDir, file)).size > 4096);
    if (real && !frames) {
      skipped.push(`${item.id} (${real})`);
      continue;
    }
    const svg = figureSvg(item, plan);
    if (check) continue;
    if (frames) {
      const dir = '/tmp/pose-frames';
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, `${item.id}.svg`), svg, 'utf8');
      fs.writeFileSync(
        path.join(dir, `${item.id}.static.svg`),
        figureSvg(item, plan, { animate: false }),
        'utf8'
      );
      written.push(item.id);
      continue;
    }
    fs.writeFileSync(path.join(imagesDir, `${imageId}.svg`), svg, 'utf8');
    written.push(`${imageId}.svg`);
  }

  console.log(`--- Movement figures (${published.length} published rows) ---`);
  if (written.length && !frames) console.log(`  wrote ${written.length}: ${written.join(', ')}`);
  if (frames) console.log(`  ${written.length} figures in /tmp/pose-frames`);
  if (skipped.length)
    console.log(`  skipped ${skipped.length} with a real file: ${skipped.join(', ')}`);
  if (unplanned.length) {
    console.log(
      `  unplanned (keep the honest slot): ${unplanned.join(', ')} — a row is unplanned when its sentence does not name a joint and a direction`
    );
  }

  if (check || !written.length) {
    const coverage = published.filter((item) => planFor(item.id));
    console.log(
      `  coverage: ${coverage.length}/${published.length} published rows have a derived figure`
    );
    const stale = coverage.flatMap((item) =>
      quotedFields(PLANS[item.id] as MotionPlan).flatMap(([field, text]) =>
        String((item as Record<string, unknown>)[field] ?? '').trim() === String(text).trim()
          ? []
          : [`${item.id}.${field}`]
      )
    );
    if (stale.length) {
      console.error(
        `  STALE: a figure quotes text the sheet no longer contains: ${stale.join(', ')}`
      );
      process.exitCode = 1;
    } else {
      console.log('  every figure quotes the row text it was drawn from');
    }
  }
}

const invokedDirectly =
  process.argv[1] !== undefined &&
  import.meta.url === new URL(`file://${path.resolve(process.argv[1])}`).href;
if (invokedDirectly) main();
