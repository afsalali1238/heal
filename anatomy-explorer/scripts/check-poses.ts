/**
 * The movement-figure gate.
 *
 *     npm run check:poses              audit every figure against its row
 *     npm run check:poses -- --write   (re)write the figure manifest after regenerating
 *
 * A generated figure is only honest while it matches the sentence it came from, and
 * nothing in the repo made that true until now. This is the check that does, and it is
 * deliberately stricter than "does the file exist":
 *
 *   1. **Quote drift.** Every plan in `poses.ts` carries the row's
 *      `start_position_en` / `movement_en` / `direction_en` / `return_en` /
 *      `safety_en` verbatim. If the sheet changes and the figure was drawn from the
 *      old words, the build fails and names the row. The alternative is the failure
 *      this project has already paid for once: a picture that quietly contradicts the
 *      instruction printed beside it.
 *   2. **Baseline drift.** A plan's first step must start where its posture puts the
 *      bone. Three plans here disagreed with their own start pose while I was writing
 *      them, each in a way that rendered as a plausible limb in the wrong place —
 *      exactly the class of error a screenshot check catches and a code read does not.
 *   3. **Focus drift.** Every highlighted joint has to resolve on the posed body. A
 *      typo in a joint name used to draw nothing at all.
 *   4. **Byte-level manifest.** `src/data/anatomy/figure-manifest.json` pins each
 *      figure's size and sha256, so an edited-by-hand SVG (or a regenerated one that
 *      was not reviewed) fails the gate the same way the 3D asset ledger does.
 */

import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import {
  BONES,
  POSTURES,
  frameAt,
  planFor,
  sceneFor,
  posedJoint,
} from '../src/lib/anatomy/movement';
import { PLANS, quotedFields, type MotionPlan } from '../src/lib/anatomy/poses';

interface ItemRow {
  readonly id: string;
  readonly status: string;
  readonly image_id?: string;
  readonly [key: string]: unknown;
}

const IMAGES = 'src/assets/images';
const MANIFEST = 'src/data/anatomy/figure-manifest.json';

function sha256(file: string): string {
  return createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function loadItems(): ItemRow[] {
  const raw = JSON.parse(fs.readFileSync('src/data/items.json', 'utf8'));
  return Array.isArray(raw) ? raw : raw.items;
}

/** The manifest this code would write, so the comparison is not a hand-maintained copy. */
function buildManifest(items: ItemRow[]): Record<string, { bytes: number; sha256: string }> {
  const out: Record<string, { bytes: number; sha256: string }> = {};
  for (const item of items) {
    if (item.status !== 'published' || !planFor(item.id)) continue;
    const imageId = (item.image_id as string | undefined) ?? item.id;
    const file = path.join(IMAGES, `${imageId}.svg`);
    if (!fs.existsSync(file)) continue;
    out[`${imageId}.svg`] = { bytes: fs.statSync(file).size, sha256: sha256(file) };
  }
  return out;
}

function main(): void {
  const write = process.argv.slice(2).includes('--write');
  const items = loadItems();
  const published = items.filter((item) => item.status === 'published');
  const errors: string[] = [];

  // 1) quotes
  for (const item of published) {
    const plan = planFor(item.id) as MotionPlan | null;
    if (!plan) continue;
    for (const [field, text] of quotedFields(plan)) {
      const have = String(item[field] ?? '').trim();
      if (have !== String(text).trim()) {
        errors.push(
          `${item.id}: figure was drawn from a ${field} that is no longer the row's text` +
            `\n     plan: ${JSON.stringify(String(text).slice(0, 90))}` +
            `\n     row : ${JSON.stringify(have.slice(0, 90))}`
        );
      }
    }

    // 2) baseline: the first step for a bone starts at the posture's own angle
    const angles = POSTURES[plan.posture].angles;
    const seen = new Set<string>();
    for (const step of plan.steps) {
      for (const bone of [step.bone, ...(step.bothSides ? [] : [])]) {
        if (seen.has(bone)) continue;
        seen.add(bone);
        const base = angles[bone] ?? 0;
        if (Math.abs(step.from - base) > 0.01) {
          errors.push(
            `${item.id}: step 1 moves ${bone} from ${step.from}, but posture ${plan.posture} puts it at ${base} ` +
              `— the figure would start mid-movement`
          );
        }
      }
    }

    // 3) every highlighted joint has to land on the posed body
    const scene = sceneFor(plan, frameAt(plan, 0));
    if (scene.focus.length !== plan.focus.length) {
      const placed = new Set(scene.focus.map((point) => `${point[0]},${point[1]}`));
      errors.push(
        `${item.id}: ${plan.focus.length - placed.size} of ${plan.focus.length} focus joints do not resolve on the figure` +
          ` (${plan.focus.join(', ')}) — a highlight that resolves to nothing simply is not drawn`
      );
    }
  }

  // 4) manifest
  const manifest = buildManifest(published);
  if (write) {
    fs.mkdirSync(path.dirname(MANIFEST), { recursive: true });
    fs.writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
    console.log(`--- Movement Figure Gate ---`);
    console.log(`wrote ${MANIFEST} (${Object.keys(manifest).length} files)`);
    return;
  }
  if (!fs.existsSync(MANIFEST)) {
    errors.push(`${MANIFEST} is missing — run: npm run figures:manifest`);
  } else {
    const recorded = JSON.parse(fs.readFileSync(MANIFEST, 'utf8')) as Record<
      string,
      { bytes: number; sha256: string }
    >;
    for (const [name, entry] of Object.entries(manifest)) {
      const prior = recorded[name];
      if (!prior) {
        errors.push(`${name}: a generated figure is on disk but not in the manifest`);
        continue;
      }
      if (prior.sha256 !== entry.sha256 || prior.bytes !== entry.bytes) {
        errors.push(
          `${name}: on disk it is ${entry.bytes} bytes / ${entry.sha256.slice(0, 12)}…, ` +
            `the manifest records ${prior.bytes} bytes / ${prior.sha256.slice(0, 12)}… ` +
            `— regenerate with npm run images:movement and re-write the manifest`
        );
      }
    }
    for (const name of Object.keys(recorded)) {
      if (!(name in manifest)) {
        errors.push(`${name}: in the manifest but not generated from any published row`);
      }
    }
  }

  console.log('--- Movement Figure Gate ---');
  const coverage = published.filter((item) => planFor(item.id)).length;
  console.log(
    `  ${coverage}/${published.length} published rows have a derived figure; ${Object.keys(manifest).length} rendered and hashed`
  );
  if (errors.length > 0) {
    for (const error of errors) console.error(`  ERROR: ${error}`);
    console.error(
      `\n${errors.length} figure problem(s). A figure that no longer matches its sentence is worse than no figure.`
    );
    process.exit(1);
  }
  console.log('  every figure quotes its row, starts from its posture, and matches the manifest');
}

main();
