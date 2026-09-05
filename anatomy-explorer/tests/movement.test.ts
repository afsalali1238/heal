/**
 * The movement figures are arithmetic, so they are testable — and this is the layer
 * where a wrong number turns into a wrong picture. The gate in `scripts/check-poses.ts`
 * audits the shipped files against the sheet; these tests audit the maths underneath
 * both, because a regression here would make every figure *look fine* while the body
 * is wrong (a limb starting mid-movement, a joint that resolves to nothing, a NaN
 * that SVG renders as a missing bone and a screenshot review skips).
 *
 * What is deliberately not asserted: angles as clinical ranges. The numbers in
 * `poses.ts` are drawing constants and the product rule is that no range is implied,
 * so a test that pinned a specific degree count would be inventing a claim.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import items from '../src/data/items.json' with { type: 'json' };
import {
  BONES,
  CYCLE_SECONDS,
  POSTURES,
  arcFor,
  boneTimeline,
  bonesFor,
  fitFor,
  floorFor,
  frameAt,
  planFor,
  poseJoints,
  sceneFor,
  supportsFor,
  viewFor,
} from '../src/lib/anatomy/movement';
import { PLANS, QUOTE_FIELDS, quotedFields, type MotionPlan } from '../src/lib/anatomy/poses';
import { figureSvg } from '../scripts/render-movement-figures';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rows = (Array.isArray(items) ? items : (items as { items: never[] }).items) as Array<
  Record<string, unknown> & { id: string; status: string; name_en: string }
>;
const published = rows.filter((row) => row.status === 'published');
const planned = published.filter((row) => planFor(row.id) !== null) as Array<
  (typeof published)[number] & Record<string, unknown>
>;

const finite = (n: number) => Number.isFinite(n);

describe('movement figures — plans against their own rows', () => {
  it('quotes the row it was drawn from, field for field', () => {
    for (const row of planned) {
      const plan = planFor(row.id)!;
      for (const [field, text] of quotedFields(plan)) {
        assert.equal(
          String(row[field] ?? '').trim(),
          String(text).trim(),
          `${row.id}.${field} drifted from the plan's quote — regenerate the figure or fix the plan`
        );
      }
    }
    assert.ok(
      planned.length >= 26,
      `expected the published library to stay covered, got ${planned.length}`
    );
  });

  it('only ever quotes fields that carry instruction text', () => {
    assert.deepEqual(Object.values(QUOTE_FIELDS).sort(), [
      'direction_en',
      'movement_en',
      'return_en',
      'safety_en',
      'start_position_en',
    ]);
  });

  it('starts every moving bone where its posture puts it', () => {
    for (const row of planned) {
      const plan = planFor(row.id)!;
      const angles = POSTURES[plan.posture].angles;
      const seen = new Set<string>();
      for (const step of plan.steps) {
        if (seen.has(step.bone)) continue;
        seen.add(step.bone);
        assert.ok(
          BONES.some((bone) => bone.name === step.bone),
          `${row.id}: unknown bone "${step.bone}"`
        );
        assert.equal(
          step.from,
          angles[step.bone] ?? 0,
          `${row.id}: first step moves ${step.bone} from ${step.from}, posture ${plan.posture} rests it at ${angles[step.bone] ?? 0}`
        );
      }
    }
  });

  it('hands a step to the next one — no teleporting limb mid-movement', () => {
    for (const row of planned) {
      const plan = planFor(row.id)!;
      const last = new Map<string, number>();
      for (const step of plan.steps) {
        if (last.has(step.bone)) {
          assert.equal(
            step.from,
            last.get(step.bone),
            `${row.id}: ${step.bone} jumps from ${last.get(step.bone)} to ${step.from} between steps`
          );
        }
        last.set(step.bone, step.to);
      }
    }
  });

  it('lists every plan for a row that exists', () => {
    const ids = new Set(rows.map((row) => row.id));
    for (const id of Object.keys(PLANS)) {
      assert.ok(ids.has(id), `${id} has a movement plan but no row`);
    }
  });
});

describe('movement figures — frame maths', () => {
  it('begins at the first step and ends at the last, at every t', () => {
    for (const row of planned) {
      const plan = planFor(row.id)!;
      const first = frameAt(plan, 0);
      const last = frameAt(plan, 1);
      const firstStep = plan.steps[0];
      const lastStep = plan.steps[plan.steps.length - 1];
      for (const bone of bonesFor(firstStep)) {
        assert.equal(
          first.angles[bone],
          firstStep.from,
          `${row.id}: t=0 is not where step 1 starts`
        );
      }
      for (const bone of bonesFor(lastStep)) {
        assert.equal(
          last.angles[bone],
          lastStep.to,
          `${row.id}: t=1 is not where the last step ends`
        );
      }
      for (const t of [0.13, 0.41, 0.77]) {
        const frame = frameAt(plan, t);
        for (const [bone, deg] of Object.entries(frame.angles)) {
          assert.ok(finite(deg), `${row.id}: ${bone} is not a number at t=${t}`);
          assert.ok(deg >= -270 && deg <= 270, `${row.id}: ${bone} = ${deg} at t=${t}`);
        }
      }
    }
  });

  it('quantises timeline stops so a regenerated file is byte-stable', () => {
    for (const row of planned) {
      const plan = planFor(row.id)!;
      for (const [bone, stops] of boneTimeline(plan)) {
        let previous = -1;
        for (const stop of stops) {
          assert.ok(stop.t >= 0 && stop.t <= 100, `${row.id}.${bone}: t out of band`);
          assert.ok(stop.t >= previous, `${row.id}.${bone}: keyframe times went backwards`);
          previous = stop.t;
          assert.ok(
            Math.abs(stop.t * 1000 - Math.round(stop.t * 1000)) < 1e-9,
            `${row.id}.${bone}: ${stop.t}% is not quantised — the file will churn on every build`
          );
          assert.ok(finite(stop.deg) && stop.slide.every(finite));
        }
      }
    }
  });

  it('keeps the cycle long enough to read and short enough to repeat', () => {
    assert.ok(CYCLE_SECONDS >= 3 && CYCLE_SECONDS <= 8, `${CYCLE_SECONDS}s`);
  });
});

describe('movement figures — scene geometry', () => {
  it('draws every bone with finite endpoints and a focus dot that lands on the body', () => {
    for (const row of planned) {
      const plan = planFor(row.id)!;
      for (const t of [0, 0.5, 1]) {
        const scene = sceneFor(plan, frameAt(plan, t));
        for (const bone of scene.bones) {
          if (bone.d) {
            const numbers = bone.d.match(/-?\d+(\.\d+)?/g) ?? [];
            assert.ok(numbers.length >= 4, `${row.id}: "${bone.name}" path lost its numbers`);
            assert.ok(
              numbers.every((n) => finite(Number(n))),
              `${row.id}: "${bone.name}" path has NaN`
            );
          }
          if (bone.circle) {
            const { cx, cy, r } = bone.circle;
            assert.ok(finite(cx) && finite(cy) && r > 0, `${row.id}: head circle`);
          }
        }
        assert.equal(
          scene.focus.length,
          plan.focus.length,
          `${row.id}: ${plan.focus.length - scene.focus.length} focus joint(s) (${plan.focus.join(', ')}) do not resolve on the posed body`
        );
        for (const point of scene.focus) assert.ok(point.every(finite));
      }
    }
  });

  it('fits the whole movement, not one frame of it, and puts the floor under the body', () => {
    for (const row of planned) {
      const plan = planFor(row.id)!;
      const start = sceneFor(plan, frameAt(plan, 0));
      const end = sceneFor(plan, frameAt(plan, 1));
      const fit = fitFor([start, end], { x: 14, y: 70, w: 392, h: 330 });
      assert.ok(finite(fit.scale) && fit.scale > 0, `${row.id}: fit scale`);
      assert.ok(fit.scale <= 1.5, `${row.id}: fit exceeds the cap`);
      assert.match(fit.transform, /^translate\(-?[\d.]+ -?[\d.]+\) scale\([\d.]+\)$/);
      const floor = floorFor([start, end]);
      assert.ok(
        floor >= Math.max(start.bounds.maxY, end.bounds.maxY),
        `${row.id}: floor cuts through the body`
      );
      const supports = supportsFor(plan, start, floor);
      assert.ok(
        supports.length > 0 || POSTURES[plan.posture].support === 'none',
        `${row.id}: no support drawn`
      );
      for (const line of supports)
        assert.ok(/^M[-\d. ]+L[-\d. ]+$/.test(line.d), `${row.id}: bad support path`);
      const arc = arcFor(plan);
      assert.ok(!arc.d.includes('NaN') && !arc.head.includes('NaN'), `${row.id}: arc has NaN`);
    }
  });

  it('poses through the shared view transform, so the file and the page agree', () => {
    for (const row of planned) {
      const plan = planFor(row.id)!;
      const posture = POSTURES[plan.posture];
      const pose = poseJoints(posture, frameAt(plan, 0), viewFor(plan));
      for (const bone of BONES) {
        const start = pose.joints[`${bone.name}:start`];
        const end = pose.joints[`${bone.name}:end`];
        assert.ok(start && end, `${row.id}: ${bone.name} has no resolved joint`);
        assert.ok([...start, ...end].every(finite), `${row.id}: ${bone.name} pose is not finite`);
        if (!bone.round) {
          assert.notDeepEqual(
            start,
            end,
            `${row.id}: ${bone.name} has zero length — check its length in BONES`
          );
        }
      }
    }
  });
});

describe('movement figures — the shipped file', () => {
  it('is byte-identical to what the code generates, so nobody hand-edited a picture', () => {
    for (const row of planned) {
      const imageId = String(row.image_id ?? row.id);
      const file = path.join(root, 'src/assets/images', `${imageId}.svg`);
      const raster = fs
        .readdirSync(path.join(root, 'src/assets/images'))
        .filter((name) => name.startsWith(`${imageId}.`) && !name.endsWith('.svg'));
      const real = raster.find(
        (name) => fs.statSync(path.join(root, 'src/assets/images', name)).size > 4096
      );
      if (real) continue; // a photograph won, the schematic is not shipped for this row
      assert.ok(fs.existsSync(file), `${row.id}: no figure on disk`);
      assert.equal(
        fs.readFileSync(file, 'utf8'),
        figureSvg(row as never, planFor(row.id) as MotionPlan),
        `${row.id}: the file on disk is not what the code generates — run npm run images:movement`
      );
    }
  });

  it('carries its label and its sentence inside the image, not beside it', () => {
    for (const row of planned) {
      const svg = figureSvg(row as never, planFor(row.id) as MotionPlan);
      assert.ok(svg.includes('not a photograph'), `${row.id}: unlabelled`);
      assert.ok(svg.includes(`<title id="fig-title-${row.id}">`), `${row.id}: no title`);
      assert.ok(svg.includes(String(row.name_en).slice(0, 10)), `${row.id}: name missing`);
      assert.ok(svg.includes('prefers-reduced-motion'), `${row.id}: no reduced-motion fallback`);
      // A figure is a drawing, never an embedded photograph or a data blob.
      assert.ok(!/<image|base64/.test(svg), `${row.id}: embedded raster payload`);
      assert.ok(
        !/\d+(\.\d+)?\s*(°|degrees)/.test(svg.replace(/viewBox="[^"]*"/, '')),
        `${row.id}: prints a range`
      );
      // The caption is the sentence the drawing came from, escaped: a row that ever
      // contained markup would otherwise be injecting it into every page it renders on.
      const move = String(planFor(row.id)!.from.move ?? '');
      assert.ok(move.length > 0, `${row.id}: a figure with no sentence under it`);
      assert.ok(
        svg.includes(move.slice(0, 24).replace(/&/g, '&amp;')),
        `${row.id}: the movement sentence is not printed in the image`
      );
      for (const hostile of ['<script', 'onerror', ']]>']) {
        assert.ok(
          !svg.toLowerCase().includes(hostile),
          `${row.id}: ${hostile} in a generated figure`
        );
      }
    }
  });
});
