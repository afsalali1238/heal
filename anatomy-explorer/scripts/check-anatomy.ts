/**
 * The anatomy gate — A-005's `check:anatomy`, which the decision named and
 * nothing ever implemented.
 *
 * A-005: "A build-time snapshot of `areas.json` and `items.json` decides which
 * regions exist. Before this, the locator offered `upper-back` and `foot`
 * (zero exercises — dead ends) and omitted `elbow` (two exercises —
 * unreachable). `check:anatomy` fails the build on drift."
 *
 * The drift was live when this was written: `body-regions.ts` hand-listed nine
 * regions including `upper-back` and `foot`, and still had no `elbow`. That is
 * the same regression, verbatim, a second time — which is the argument for a
 * check rather than a note.
 *
 * It also carries the boundary that `memory.md` lists as "defended by one build
 * check": every patient-visible string in the map — region labels, zone labels,
 * education copy — goes through the same 52 compliance rules as the library, so
 * the map cannot become the place where diagnosis language sneaks in.
 *
 * Exit codes: 0 clean (warnings allowed), 1 drift or violation.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { GEOMETRY_REGIONS } from '../src/lib/anatomy/geometry/regions';
import { COMPLIANCE_RULES, scanText, formatViolation } from '../src/lib/compliance';
import { EDUCATION_ENTRIES } from '../src/data/anatomy/education';
import { SAFETY_RULES } from '../src/data/anatomy/safety-rules';
import { validateEducationEntries } from '../src/lib/anatomy/education-validation';

const DATA_DIR = join(process.cwd(), 'src', 'data');

const errors: string[] = [];
const warnings: string[] = [];

interface Row {
  readonly area_id?: string;
  readonly section?: string;
  readonly status?: string;
  readonly name_en?: string;
  readonly id?: string;
}

function readJson(name: string): Row[] {
  try {
    const parsed: unknown = JSON.parse(readFileSync(join(DATA_DIR, name), 'utf8'));
    if (!Array.isArray(parsed)) {
      errors.push(`✗ src/data/${name} is not a JSON array.`);
      return [];
    }
    return parsed as Row[];
  } catch (err) {
    errors.push(`✗ Could not read src/data/${name}: ${(err as Error).message}`);
    return [];
  }
}

const areas = readJson('areas.json');
const items = readJson('items.json');

// The same rule library.ts applies: published area AND at least one published item.
const populated = new Set(
  items.filter((i) => i.status === 'published').map((i) => `${i.section}/${i.area_id}`)
);
const reachableAreaIds = new Set(
  areas
    .filter((a) => a.status === 'published')
    .filter((a) => populated.has(`${a.section}/${a.area_id}`))
    .map((a) => a.area_id!)
);
const allAreaIds = new Set(areas.map((a) => a.area_id!));
const geometryAreaIds = new Set(GEOMETRY_REGIONS.map((r) => r.areaId));

// ── 1. Geometry for an area the library has never heard of ──────────────────
// This is the `upper-back` / `foot` half of the A-005 regression: a shape on the
// body that no content will ever back.
for (const areaId of geometryAreaIds) {
  if (!allAreaIds.has(areaId)) {
    errors.push(
      `✗ region geometry "${areaId}" has no matching area_id in areas.json.\n` +
        '      A tappable shape with no possible content is a dead end (A-005).\n' +
        '      Either the clinician adds the area to the sheet, or the region is removed from geometry/regions.ts.'
    );
  }
}

// ── 2. Reachable content with no way to point at it on the body ─────────────
// The `elbow` half: two published exercises nobody can find from the map.
for (const areaId of reachableAreaIds) {
  if (!geometryAreaIds.has(areaId)) {
    errors.push(
      `✗ area "${areaId}" has published content but no region in geometry/regions.ts.\n` +
        '      Patients can only reach it by browsing the section index — the body map cannot point at it (A-005).'
    );
  }
}

// ── 3. Published-but-empty areas ────────────────────────────────────────────
for (const area of areas) {
  if (area.status !== 'published') continue;
  if (!populated.has(`${area.section}/${area.area_id}`)) {
    warnings.push(
      `! area "${area.section}/${area.area_id}" is published but has no published items, so it is excluded from patient indexes and no region is drawn for it.`
    );
  }
}

// ── 4. Every patient-visible map string, through the 52 shared rules ────────
// The education/symptom-checking boundary. Region labels and zone labels are
// patient-facing copy exactly like an exercise description.
let violations = 0;
for (const region of GEOMETRY_REGIONS) {
  for (const v of scanText(region.label, `region:${region.id}.label`, COMPLIANCE_RULES)) {
    violations += 1;
    errors.push(formatViolation(`region "${region.id}"`, v));
  }
  for (const [i, zone] of region.zones.entries()) {
    for (const v of scanText(zone, `region:${region.id}.zones[${i}]`, COMPLIANCE_RULES)) {
      violations += 1;
      errors.push(formatViolation(`region "${region.id}"`, v));
    }
  }
}

for (const rule of SAFETY_RULES) {
  for (const field of ['optionLabel', 'title', 'message', 'actionLabel'] as const) {
    for (const v of scanText(rule[field], `safety:${rule.id}.${field}`, COMPLIANCE_RULES)) {
      violations += 1;
      errors.push(formatViolation(`safety rule "${rule.id}"`, v));
    }
  }
}

// ── 5. Education content: structure, wording, and review metadata ───────────
for (const message of validateEducationEntries(EDUCATION_ENTRIES)) {
  errors.push(`✗ ${message}`);
}

// ── 6. Education pointing at a region that does not exist ───────────────────
for (const entry of EDUCATION_ENTRIES) {
  if (!geometryAreaIds.has(entry.regionId)) {
    warnings.push(
      `! education "${entry.id}" targets region "${entry.regionId}", which has no geometry.`
    );
  }
}

// ── 7. Unreviewed clinical copy that would reach a patient ──────────────────
// Non-negotiable #2. Draft is allowed to exist; draft is not allowed to render.
const draftEducation = EDUCATION_ENTRIES.filter((e) => e.status !== 'published');
if (draftEducation.length > 0) {
  warnings.push(
    `! ${draftEducation.length} education entr${draftEducation.length === 1 ? 'y is' : 'ies are'} still draft (${draftEducation
      .map((e) => e.id)
      .join(', ')}). They are withheld from patients until a clinician signs them off.`
  );
}
const draftSafety = SAFETY_RULES.filter((r) => r.status !== 'published');
if (draftSafety.length > 0) {
  warnings.push(
    `! ${draftSafety.length} of ${SAFETY_RULES.length} safety triggers are still draft. The gate is shown anyway, because stopping is the safe default — but the wording needs a clinician (A-007).`
  );
}

// ── report ──────────────────────────────────────────────────────────────────
console.log('\nAnatomy check — A-005 region derivation, A-007 gate, map copy compliance\n');
console.log(`  areas in sheet:        ${areas.length}`);
console.log(
  `  reachable areas:       ${reachableAreaIds.size}  (${[...reachableAreaIds].sort().join(', ') || 'none'})`
);
console.log(
  `  regions in geometry:   ${GEOMETRY_REGIONS.length} shapes over ${geometryAreaIds.size} areas`
);
console.log(
  `  map strings scanned:   ${GEOMETRY_REGIONS.length + SAFETY_RULES.length} against ${COMPLIANCE_RULES.length} rules`
);
console.log(`  compliance violations: ${violations}\n`);

if (warnings.length > 0) {
  console.log('Warnings\n');
  for (const w of warnings) console.log(`  ${w}`);
  console.log('');
}

if (errors.length > 0) {
  console.error('Errors\n');
  for (const e of errors) console.error(`  ${e}`);
  console.error(`\n✗ check:anatomy failed with ${errors.length} error(s).\n`);
  process.exit(1);
}

console.log('✓ check:anatomy passed.\n');
