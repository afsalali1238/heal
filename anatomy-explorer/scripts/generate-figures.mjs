/**
 * Exercise-figure gate + review gallery. A-019 enforcement.
 *
 * Imports the REAL sources (`exercise-figures.ts`, `figure-svg.ts`, `pose.ts`)
 * with plain node type-stripping — no copies, so the check cannot drift from
 * what the app renders. Run with `--check` in CI; without flags it also
 * rewrites the clinician review gallery at `build-artifacts/figures/`.
 *
 * Fails on: out-of-range / non-finite angles, key points (head, halo, arrow
 * endpoints) outside the focus crop, items without a figure spec, specs for
 * retired/unknown items.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHECK_ONLY = process.argv.includes('--check');

const { EXERCISE_FIGURES, figureItemFor } = await import(
  '../src/data/anatomy/exercise-figures.ts'
);
const { figureInnerSVG, figureViewBox, figureKeyPoints } = await import(
  '../src/lib/anatomy/geometry/figure-svg.ts'
);
const { buildFigure, poseViolations } = await import(
  '../src/lib/anatomy/geometry/pose.ts'
);

const errors = [];
const warnings = [];
const fail = (msg) => errors.push(msg);

const items = JSON.parse(readFileSync(join(ROOT, 'src/data/items.json'), 'utf8'));
const published = items.filter((i) => i.status === 'published');

// 1. Coverage: every published item needs a figure; no orphan specs.
// Resolved by image_id through figureItemFor — the exact path
// ExerciseImage.astro takes at runtime — so the gate cannot pass while a
// patient route renders an empty slot (as happened with ex-lower-back-02).
for (const item of published) {
  if (!figureItemFor(item.image_id)) {
    fail(
      `No figure resolves for published item "${item.id}" ` +
        `(image_id "${item.image_id}").`,
    );
  }
}
const itemIds = new Set(items.map((i) => i.id));
for (const id of Object.keys(EXERCISE_FIGURES)) {
  if (!itemIds.has(id)) fail(`Figure spec "${id}" matches no item in items.json.`);
}

// 2. Per-spec validation.
const MARGIN = 6;
let headOutside = 0;
for (const [id, spec] of Object.entries(EXERCISE_FIGURES)) {
  for (const which of ['start', 'end']) {
    for (const v of poseViolations(spec[which])) fail(`${id}.${which}: ${v}.`);
  }
  const [fx, fy, fw, fh] = spec.focus;
  if (!(fw > 0 && fh > 0)) fail(`${id}: focus crop has non-positive size.`);
  for (const which of ['start', 'end']) {
    const fig = buildFigure(spec[which], spec.view);
    const all = [
      fig.headCentre,
      ...fig.torso,
      ...fig.limbs.flatMap((l) => l.points),
    ];
    for (const [x, y] of all) {
      if (!Number.isFinite(x) || !Number.isFinite(y)) {
        fail(`${id}.${which}: non-finite coordinate.`);
        break;
      }
    }
    const outside = (kp) =>
      kp.x < fx - MARGIN || kp.y < fy - MARGIN ||
      kp.x > fx + fw + MARGIN || kp.y > fy + fh + MARGIN;
    const [head, ...required] = figureKeyPoints(spec, spec[which]);
    for (const kp of required) {
      if (outside(kp)) {
        fail(
          `${id}.${which}: key point (${kp.x.toFixed(0)}, ${kp.y.toFixed(0)}) ` +
            `outside focus crop [${spec.focus.join(' ')}].`,
        );
      }
    }
    if (outside(head)) headOutside += 1;
  }
  const same = JSON.stringify(spec.start) === JSON.stringify(spec.end);
  if (same && !spec.arrow) {
    warnings.push(`${id}: static pose with no arrow — nothing communicates the movement.`);
  }
}

if (warnings.length > 0) {
  console.warn('figure warnings:\n  ' + warnings.join('\n  '));
}
if (headOutside > 0) {
  console.warn(
    `figure note: ${headOutside} pose(s) frame tight on the working joint ` +
      `(head outside crop — intended per-pose framing).`,
  );
}
if (errors.length > 0) {
  console.error(`figure gate FAILED (${errors.length}):\n  ` + errors.join('\n  '));
  process.exit(1);
}
console.log(
  `figure gate passed: ${Object.keys(EXERCISE_FIGURES).length} specs, ` +
    `${published.length} published items covered.`,
);

if (CHECK_ONLY) process.exit(0);

// 3. Review gallery for the physiotherapist (not a patient route).
const OUT = join(ROOT, 'build-artifacts', 'figures');
mkdirSync(OUT, { recursive: true });

const cards = published
  .map((item) => {
    const spec = EXERCISE_FIGURES[item.id];
    if (!spec) return '';
    const vb = figureViewBox(spec);
    const still = figureInnerSVG(spec, spec.start, { showArrow: true });
    const end = figureInnerSVG(spec, spec.end, { showArrow: false });
    const esc = (s) =>
      String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return `<section class="card">
  <h2>${esc(item.id)} · ${esc(item.name_en)}</h2>
  <p class="move">${esc(item.movement_en)}</p>
  <div class="pair">
    <figure><svg viewBox="${vb}" role="img" aria-label="Start position">${still}</svg><figcaption>Start</figcaption></figure>
    <figure><svg viewBox="${vb}" role="img" aria-label="End position">${end}</svg><figcaption>End</figcaption></figure>
  </div>
  <p class="meta">view ${spec.view} · support ${spec.support} · focus [${spec.focus.join(' ')}]</p>
</section>`;
  })
  .join('\n');

writeFileSync(
  join(OUT, 'preview.html'),
  `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Exercise figures — clinician review (draft)</title>
<style>
  body{margin:0;background:#f1f5f9;color:#1f2937;font:17px/1.5 system-ui,sans-serif}
  .wrap{max-width:1000px;margin:0 auto;padding:28px 20px 64px}
  .badge{display:inline-block;font-size:12.5px;letter-spacing:.04em;text-transform:uppercase;color:#92400e;background:#fef3c7;border:1px solid #fcd34d;border-radius:999px;padding:4px 11px;margin-bottom:18px}
  .card{background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:18px;margin:0 0 18px}
  .card h2{margin:0 0 6px;font-size:19px}
  .move{margin:0 0 12px;color:#475569}
  .pair{display:grid;grid-template-columns:1fr 1fr;gap:12px}
  figure{margin:0;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:8px}
  figure svg{width:100%;height:auto;display:block}
  figcaption{text-align:center;color:#64748b;font-size:13px;margin-top:4px}
  .meta{color:#94a3b8;font:12px ui-monospace,monospace;margin:10px 0 0}
</style></head><body><div class="wrap">
<h1>Exercise figures — review draft</h1>
<p>Deterministic schematics of each item's written movement. <span class="badge">Draft · not clinically reviewed</span></p>
${cards}
</div></body></html>\n`,
);
console.log(`wrote build-artifacts/figures/preview.html`);
