/**
 * Build-time compliance gate — MODULES.md M12.
 *
 * "A build-time check that fails if any published item's text matches a banned-
 * term list" — and it must be *build*-time, not sync-time. A sync-time check
 * alone can be bypassed three ways: a hand-edited JSON file, a JSON file
 * committed before the rule existed, or a sheet that was synced from a machine
 * running older code. Only a gate wired into `npm run build` can promise that
 * what ships was checked.
 *
 * Runs standalone under tsx, deliberately reading `src/data/*.json` directly
 * rather than going through `astro:content`, so it works even when the Astro
 * build itself is broken — which is exactly when you most want it to run.
 *
 * Exit codes: 0 clean (warnings allowed), 1 violation.
 *
 * Environment:
 *   COMPLIANCE_STRICT=1  Promote launch-blocking warnings to errors. Set this in
 *                        the production environment so unfilled licence numbers,
 *                        unapproved legal wording, or unapproved images can
 *                        never reach a patient.
 */

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  COMPLIANCE_RULES,
  PROMOTIONAL_RULES,
  NON_PROSE_FIELDS,
  scanRecord,
  scanText,
  formatViolation,
  type Violation,
} from '../src/lib/compliance';
import { CLINIC, missingClinicFields } from '../src/config/clinic';
import { validateItems, validateAreas, formatFinding } from '../src/lib/validate';
import { EDUCATION_ENTRIES } from '../src/data/anatomy/education';
import { SAFETY_RULES } from '../src/data/anatomy/safety-rules';
import { GEOMETRY_REGIONS } from '../src/lib/anatomy/geometry/regions';

const STRICT = process.env.COMPLIANCE_STRICT === '1';
const DATA_DIR = join(process.cwd(), 'src', 'data');
const LEGAL_DIR = join(process.cwd(), 'src', 'content', 'legal');

const errors: string[] = [];
const warnings: string[] = [];

/** Raise as an error in strict mode, a warning otherwise. */
function gate(message: string): void {
  if (STRICT) errors.push(message);
  else warnings.push(message);
}

interface ItemRow {
  readonly id?: string;
  readonly status?: string;
  readonly image_id?: string;
  readonly image_status?: string;
  readonly [key: string]: unknown;
}

function readJson<T>(name: string): T[] {
  const path = join(DATA_DIR, name);
  if (!existsSync(path)) {
    errors.push(`✗ Missing data file: src/data/${name}. Run \`npm run sync:content\`.`);
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(readFileSync(path, 'utf8'));
    if (!Array.isArray(parsed)) {
      errors.push(`✗ src/data/${name} is not a JSON array.`);
      return [];
    }
    return parsed as T[];
  } catch (err) {
    errors.push(`✗ Could not parse src/data/${name}: ${(err as Error).message}`);
    return [];
  }
}

// ── 1. Banned terms in published clinical content ───────────────────────────
// Only published rows. A draft row is the clinician's workspace; blocking a
// build because a half-written draft says "arthritis" would make the gate
// something people route around.

const items = readJson<ItemRow>('items.json');
const areas = readJson<ItemRow>('areas.json');
const publishedItems = items.filter((i) => i.status === 'published');
const publishedAreas = areas.filter((a) => a.status === 'published');

let termViolations = 0;

for (const item of publishedItems) {
  const found: Violation[] = scanRecord(item, NON_PROSE_FIELDS, COMPLIANCE_RULES);
  for (const v of found) {
    termViolations += 1;
    errors.push(formatViolation(`item "${item.id ?? '(no id)'}"`, v));
  }
}

// Draft rows are never errors — see the note above — but they are no longer
// invisible either. A drafted row that says "frozen shoulder" or "the best
// stretch for sciatica" is a problem worth telling the reviewer about now, in
// the preview queue, rather than after it reaches the published tab and fails a
// build. So: same rules, warning only, and machine fields like internal notes
// are excluded so a note that *names* the banned phrase is not a violation.
const draftItems = items.filter((i) => i.status !== 'published' && i.status !== 'retired');
let draftAdvisories = 0;
for (const item of draftItems) {
  const found: Violation[] = scanRecord(
    item as unknown as Record<string, unknown>,
    [...NON_PROSE_FIELDS, 'notes_internal', 'reviewed_by', 'reviewed_date'],
    COMPLIANCE_RULES
  );
  for (const v of found) {
    draftAdvisories += 1;
    warnings.push(
      `! draft item "${item.id}" still matches banned wording — ${v.match} [${v.ruleId}]. Fix it before the row can be published.`
    );
  }
}

for (const area of publishedAreas) {
  const found: Violation[] = scanRecord(area, NON_PROSE_FIELDS, COMPLIANCE_RULES);
  for (const v of found) {
    termViolations += 1;
    errors.push(formatViolation(`area "${area.id ?? '(no id)'}"`, v));
  }
}

for (const entry of EDUCATION_ENTRIES.filter((e) => e.status === 'published')) {
  const found: Violation[] = scanRecord(
    entry,
    ['id', 'regionId', 'status', 'reviewedBy', 'version'],
    COMPLIANCE_RULES
  );
  for (const v of found) {
    termViolations += 1;
    errors.push(formatViolation(`education "${entry.id}"`, v));
  }
}

for (const rule of SAFETY_RULES.filter((r) => r.status === 'published')) {
  const found: Violation[] = scanRecord(
    rule,
    ['id', 'status', 'reviewedBy', 'version'],
    COMPLIANCE_RULES
  );
  for (const v of found) {
    termViolations += 1;
    errors.push(formatViolation(`safety rule "${rule.id}"`, v));
  }
}

for (const region of GEOMETRY_REGIONS) {
  const found: Violation[] = scanRecord(
    region,
    ['id', 'areaId', 'side', 'views', 'shapes', 'zones'],
    COMPLIANCE_RULES
  );
  for (const v of found) {
    termViolations += 1;
    errors.push(formatViolation(`geometry region "${region.id}"`, v));
  }
}

// ── 2. Cross-row and clinical-governance rules ──────────────────────────────
// CONTENT-SCHEMA.md requires the build to fail on duplicate ids and on an area
// carrying more than eight published items, and IMAGE-PIPELINE.md requires the
// image to belong to the item beside it. Zod cannot see across rows, so these
// live in src/lib/validate.ts and run here as well as at sync time.

for (const f of [...validateAreas(areas), ...validateItems(items, areas)]) {
  const line = formatFinding(f);
  if (f.level === 'error') errors.push(line);
  else warnings.push(line);
}

// ── 3. Promotional language in legal and chrome copy ────────────────────────
// Scanned for booking CTAs only — see the note on PROMOTIONAL_RULES for why a
// disclaimer is allowed to use the words an exercise description may not.

interface LegalDoc {
  readonly file: string;
  readonly frontmatter: Record<string, string>;
  readonly body: string;
}

function readLegalDocs(): LegalDoc[] {
  if (!existsSync(LEGAL_DIR)) {
    errors.push('✗ src/content/legal/ does not exist. MODULES.md M12 requires it.');
    return [];
  }
  const files = readdirSync(LEGAL_DIR).filter((f) => f.endsWith('.md'));
  if (files.length === 0) {
    errors.push(
      '✗ src/content/legal/ is empty. MODULES.md M12 requires disclaimer, privacy and credits.'
    );
    return [];
  }
  return files.map((f) => {
    const raw = readFileSync(join(LEGAL_DIR, f), 'utf8');
    const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
    const frontmatter: Record<string, string> = {};
    let body = raw;
    if (match) {
      body = match[2];
      for (const line of match[1].split(/\r?\n/)) {
        if (line.trimStart().startsWith('#')) continue;
        const kv = line.match(/^([A-Za-z_][\w]*):\s*(.*)$/);
        if (kv) frontmatter[kv[1]] = kv[2].trim().replace(/^["']|["']$/g, '');
      }
    }
    return { file: f, frontmatter, body };
  });
}

const legalDocs = readLegalDocs();

for (const doc of legalDocs) {
  for (const v of scanText(doc.body, 'body', PROMOTIONAL_RULES)) {
    termViolations += 1;
    errors.push(formatViolation(`legal/${doc.file}`, v));
  }
}

// Required legal pages must all be present, or the disclaimer is incomplete.
for (const required of ['disclaimer.md', 'privacy.md', 'credits.md']) {
  if (!legalDocs.some((d) => d.file === required)) {
    errors.push(`✗ Missing src/content/legal/${required} (MODULES.md M12).`);
  }
}

// ── 4. Clinic identifiers still unfilled ───────────────────────────────────
// RESEARCH-FINDINGS §4 requires the clinic legal name, DHA facility licence,
// the supervising physiotherapist's licence, and a last-review date on the
// disclaimer. They are unknown to the build and must not be guessed.

const missing = missingClinicFields();
if (missing.length > 0) {
  gate(
    `${STRICT ? '✗' : '!'} src/config/clinic.ts has ${missing.length} unfilled value(s): ${missing.join(', ')}.\n` +
      '      The disclaimer cannot satisfy RESEARCH-FINDINGS §4 until the clinic supplies these.'
  );
}

if (CLINIC.lastContentReview && /^\d{4}-\d{2}-\d{2}$/.test(CLINIC.lastContentReview)) {
  const ageDays = (Date.now() - Date.parse(CLINIC.lastContentReview)) / 86_400_000;
  if (ageDays > 365) {
    gate(
      `${STRICT ? '✗' : '!'} Content was last reviewed ${Math.floor(ageDays)} days ago (${CLINIC.lastContentReview}).\n` +
        '      The disclaimer states a review date to patients; a stale one misrepresents it.'
    );
  }
}

// ── 5. Legal wording not yet signed off ────────────────────────────────────
// RESEARCH-FINDINGS §4: "The Medical Director is accountable and must approve
// content."

for (const doc of legalDocs) {
  const approved = doc.frontmatter.approvedBy;
  if (!approved || approved === 'null') {
    gate(
      `${STRICT ? '✗' : '!'} legal/${doc.file} has approvedBy: null — wording is still an unapproved draft.\n` +
        "      RESEARCH-FINDINGS §4 makes the clinic's Medical Director accountable for content approval."
    );
  }
}

// ── 6. Published items pointing at unapproved images ───────────────────────
// IMAGE-PIPELINE.md's delivery contract: "Only `approved` ships."
//
// This is not a hypothetical. IMAGE-TEST-VERDICT.md records ex-neck-02 as
// "FAIL — worst of the set": the render shows the head *forward* of the
// shoulders, the exact posture the chin tuck exists to correct, so the image
// depicts the opposite of the instruction printed beside it.
//
// ExerciseImage.astro refuses to render an unapproved image, so nothing unsafe
// can reach a patient even if this gate is ignored. The gate exists to make the
// gap visible rather than silently showing placeholders forever.

for (const item of publishedItems) {
  if (!item.image_id) continue;
  if (item.image_status !== 'approved') {
    gate(
      `${STRICT ? '✗' : '!'} Published item "${item.id}" references image "${item.image_id}" with image_status=${
        item.image_status ? `"${item.image_status}"` : '(unset)'
      }.\n` +
        '      IMAGE-PIPELINE.md: only `approved` ships. The card will render a placeholder until the\n' +
        '      physiotherapist signs the image off against its instruction text.'
    );
  }
}

// ── 7. Third-party origins in source ───────────────────────────────────────
// Non-negotiable #6: "No analytics, no third-party scripts, no fonts or assets
// from hosts we don't control." In a health context each remote request
// discloses the patient's IP to a third party, and under the UAE PDPL an IP
// address is personal data.
//
// This is a regression guard with a real regression behind it: base.css shipped
// an `@import` from fonts.googleapis.com. Prose in the legal pages is allowed to
// *name* an external source (credits.md must attribute Servier Medical Art), so
// only code and markup are scanned.

const SCAN_EXTS = ['.astro', '.css', '.ts', '.js', '.mjs', '.html', '.json'];
const SCAN_ROOTS = ['src', 'public'];
/** Hosts we do control, plus link-only targets that issue no request. */
const ALLOWED_HOSTS = [
  'schema.org',
  'www.w3.org', // XML namespaces in SVG — not fetched
  'creativecommons.org', // licence link text
  'smart.servier.com', // attribution link text
];

/**
 * Hosts that are fetched, but only from code that never reaches a browser —
 * build scripts and `prerender = false` routes, which run in a serverless
 * function on the server side.
 *
 * This is deliberately narrower than `ALLOWED_HOSTS`, not looser than the
 * original check. `docs.google.com` used to fail the whole build from
 * `src/lib/sheets.ts`, which is the sheet reader behind the clinician's
 * `/preview` route. Blanket-allowing the host would also have allowed it in a
 * patient-facing page. Pinning it to specific files means the guard fires again
 * the moment someone imports that module somewhere it would ship.
 */
const SERVER_ONLY_HOSTS: Readonly<Record<string, readonly string[]>> = {
  'docs.google.com': ['src/lib/sheets.ts'],
};

function walk(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
      walk(full, out);
    } else if (SCAN_EXTS.some((ext) => entry.name.endsWith(ext))) {
      out.push(full);
    }
  }
  return out;
}

const originPattern = /(?:https?:)?\/\/([a-z0-9.-]+\.[a-z]{2,})/gi;

for (const file of SCAN_ROOTS.flatMap((root) => walk(join(process.cwd(), root)))) {
  const text = readFileSync(file, 'utf8');
  const rel = file.slice(process.cwd().length + 1).replace(/\\/g, '/');
  const seen = new Set<string>();

  for (const match of text.matchAll(originPattern)) {
    const host = match[1].toLowerCase();
    if (ALLOWED_HOSTS.includes(host) || seen.has(host)) continue;
    if (SERVER_ONLY_HOSTS[host]?.includes(rel)) continue;
    seen.add(host);
    errors.push(
      `✗ ${rel} references third-party origin "${host}".\n` +
        "      Non-negotiable #6: no assets from hosts we don't control. Self-host it, or add the\n" +
        '      host to ALLOWED_HOSTS in this script with a note on why it issues no request.'
    );
  }
}

// ── Report ─────────────────────────────────────────────────────────────────

console.log('Compliance check — MODULES.md M12');
console.log(
  `  scanned ${publishedItems.length} published item(s), ${publishedAreas.length} published area(s), ${legalDocs.length} legal document(s)`
);
if (draftItems.length > 0) {
  console.log(
    `  ${draftItems.length} draft item(s) advisorily scanned (never blocking) — ${draftAdvisories} wording ${draftAdvisories === 1 ? 'issue' : 'issues'}`
  );
}
console.log(`  ${COMPLIANCE_RULES.length} rules active${STRICT ? ' · STRICT mode' : ''}`);

if (warnings.length > 0) {
  console.log(`\n${warnings.length} warning(s) — launch blockers, not build blockers:`);
  for (const w of warnings) console.log(w);
}

if (errors.length > 0) {
  console.error(`\n${errors.length} error(s):`);
  for (const e of errors) console.error(e);
  console.error(
    `\nBuild refused. ${termViolations > 0 ? 'Banned wording must be changed in the Google Sheet, not in src/data/.' : 'Fix the errors above and re-run.'}`
  );
  process.exit(1);
}

console.log(
  warnings.length > 0
    ? '\nNo banned wording found. Warnings above must be cleared before go-live.'
    : '\nClean.'
);
if (!STRICT) console.log('Set COMPLIANCE_STRICT=1 in production to enforce the warnings above.');
