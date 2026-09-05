/**
 * Deprecated prototype, kept for eyeballing only. Superseded by `src/lib/anatomy/poses.ts`
 * (per-row movement plans), `src/lib/anatomy/movement.ts` (the kinematics) and
 * `scripts/render-movement-figures.ts`, which `scripts/check-poses.ts` gates against the sheet.
 * Nothing in the build reads either file. Do not author poses here: a second pose table is how
 * a figure starts disagreeing with the sentence printed underneath it.
 */
// Prototype harness: render the real published items as posed figures and look at them.
// Not part of the build. A-006's rule — render it and look at it.
import { writeFileSync } from 'node:fs';
import { register } from 'node:module';

const { buildFigure, limbPath, torsoPath, tweenPose } =
  await import('../src/lib/anatomy/geometry/pose.ts');

// Poses drafted from the clinician's OWN movement text for each published item.
const ITEMS = [
  {
    id: 'ex-neck-02',
    name: 'Chin Tuck',
    view: 'side',
    movement: 'Draw your chin straight back, as if making a double chin.',
    start: { chinSlide: 14, trunk: 2 },
    end: { chinSlide: -10, trunk: 2 },
  },
  {
    id: 'str-neck-01',
    name: 'Side Neck Stretch',
    view: 'front',
    movement: 'Let your right ear drop slowly towards your right shoulder.',
    start: { head: 0 },
    end: { head: -34 },
  },
  {
    id: 'ex-neck-01',
    name: 'Neck Range of Motion',
    view: 'side',
    movement: 'Slowly move your head in one direction at a time.',
    start: { head: 0 },
    end: { head: 32 },
  },
  {
    id: 'ex-shoulder-01',
    name: 'Shoulder Rolls',
    view: 'front',
    movement: 'Roll your shoulders up, back and down in a smooth circle.',
    start: { shoulderL: 8, shoulderR: 8 },
    end: { shoulderL: 34, shoulderR: 34, elbowL: 22, elbowR: 22 },
  },
  {
    id: 'str-neck-02',
    name: 'Levator Scapulae Stretch',
    view: 'front',
    movement: 'Look down towards your right armpit.',
    start: { head: 0 },
    end: { head: -26, shoulderL: 88, elbowL: 128 },
  },
];

const INK = '#334155';
const GHOST = '#cbd5e1';
const ACCENT = '#0ea5e9';

function figureSvg(pose, view, colour, opacity = 1) {
  const f = buildFigure(pose, view);
  const limbs = f.limbs
    .map(
      (l) =>
        `<path d="${limbPath(l.points)}" stroke="${colour}" stroke-width="${l.width}" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`
    )
    .join('');
  return `<g opacity="${opacity}">
    ${limbs}
    <path d="${torsoPath(f.torso)}" fill="${colour}"/>
    <circle cx="${f.headCentre[0].toFixed(1)}" cy="${f.headCentre[1].toFixed(1)}" r="${f.headRadius.toFixed(1)}" fill="${colour}"/>
  </g>`;
}

// Ghosted start + solid end + motion arrow: the classic physio-handout form.
function card(item) {
  const mid = tweenPose(item.start, item.end, 0.55);
  const a = buildFigure(item.start, item.view);
  const b = buildFigure(item.end, item.view);
  const arrow = `<defs><marker id="ah-${item.id}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="${ACCENT}"/></marker></defs>
    <path d="M${a.headCentre[0].toFixed(1)} ${(a.headCentre[1] - 46).toFixed(1)} Q ${((a.headCentre[0] + b.headCentre[0]) / 2).toFixed(1)} ${(Math.min(a.headCentre[1], b.headCentre[1]) - 74).toFixed(1)} ${b.headCentre[0].toFixed(1)} ${(b.headCentre[1] - 46).toFixed(1)}"
      stroke="${ACCENT}" stroke-width="4" fill="none" stroke-linecap="round" marker-end="url(#ah-${item.id})"/>`;

  return `<figure style="margin:0">
    <svg viewBox="20 30 200 570" width="200" role="img" aria-label="${item.name}">
      ${arrow}
      ${figureSvg(item.start, item.view, GHOST)}
      ${figureSvg(item.end, item.view, INK)}
    </svg>
    <figcaption><b>${item.name}</b><br><span class="id">${item.id} · ${item.view} view</span><br><span class="mv">${item.movement}</span></figcaption>
  </figure>`;
}

// A strip of interpolated frames — the animation question, shown as frames.
function strip(item) {
  const frames = [0, 0.25, 0.5, 0.75, 1]
    .map(
      (t) =>
        `<svg viewBox="20 30 200 570" width="96">${figureSvg(tweenPose(item.start, item.end, t), item.view, INK)}</svg>`
    )
    .join('');
  return `<div class="strip"><h3>${item.name} — interpolated frames</h3><div class="frames">${frames}</div></div>`;
}

const html = `<!doctype html><meta charset="utf-8">
<style>
 body{font:15px/1.5 system-ui;margin:0;padding:28px;background:#f8fafc;color:#0f172a}
 h1{font-size:20px;margin:0 0 4px} .sub{color:#64748b;margin:0 0 24px;font-size:13px}
 .grid{display:flex;flex-wrap:wrap;gap:18px}
 figure{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:14px}
 figcaption{font-size:12.5px;max-width:230px;line-height:1.45;margin-top:6px}
 .id{color:#94a3b8;font-family:ui-monospace,monospace;font-size:11px}
 .mv{color:#475569}
 .strip{margin-top:26px;background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:14px}
 .strip h3{font-size:13px;margin:0 0 8px;color:#475569}
 .frames{display:flex;gap:6px;flex-wrap:wrap}
</style>
<h1>Posed figures — generated from the joint table</h1>
<p class="sub">Ghost = start position · solid = end position · arrow = direction of movement. No image files involved.</p>
<div class="grid">${ITEMS.map(card).join('')}</div>
${strip(ITEMS[0])}
${strip(ITEMS[4])}`;

writeFileSync('docs/visual-references/poses.html', html);
console.log('wrote docs/visual-references/poses.html');
