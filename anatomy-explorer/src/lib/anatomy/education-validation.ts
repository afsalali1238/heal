/**
 * Structural and clinical-governance validation for the education layer.
 *
 * ── What this replaces, and why it matters ─────────────────────────────────
 * The previous `content-validation.ts` declared its own `BANNED_LANGUAGE` array
 * of **seven** patterns. `lib/compliance.ts` carries **52**. The seven contained
 * zero condition names and zero booking CTAs — the two groups `AGENTS.md`
 * identifies as the legal core, the ones that reclassify the site from
 * education to medical advertisement under MOHAP. So the newer, weaker copy was
 * guarding the newer content.
 *
 * `compliance.ts` says it in its own header:
 *
 *   "Why this file exists rather than an inline array in the sync script: the
 *    same list has to run at sync time and at build time. Two copies of a
 *    compliance list is two chances for them to drift."
 *
 * They had drifted. This module now imports the one list. It keeps only the
 * checks that are genuinely about *this* content shape — required fields, and
 * the review-metadata contract — and delegates every wording judgement.
 */

import { COMPLIANCE_RULES, scanText } from '../compliance';
import type { EducationEntry } from '../../data/anatomy/education';

/**
 * Wording rules specific to orientation content, on top of the 52 shared ones.
 *
 * These exist because the education layer is the one surface that could slide
 * from "here is the anatomy" into "here is what is wrong with you" — the
 * boundary `memory.md` lists as defended by a single build check.
 */
const ORIENTATION_RULES = [
  {
    id: 'definitely',
    pattern: /\bdefinitely\b/i,
    reason: 'States certainty the site cannot have.',
  },
  {
    id: 'your-diagnosis',
    pattern: /\byour diagnosis\b/i,
    reason: 'Diagnosis language (non-negotiable #5).',
  },
  { id: 'safe-for-everyone', pattern: /\bsafe for everyone\b/i, reason: 'Blanket safety claim.' },
  {
    id: 'you-have-condition',
    pattern:
      /\byou have\s+(?:a|an|the)?\s*[a-z][a-z -]{2,40}(?:condition|disease|syndrome|injury|tear|strain|sprain|fracture)\b/i,
    reason: 'Attributes a condition to the reader — diagnosis by the back door.',
  },
] as const;

const REQUIRED_TEXT_FIELDS: (keyof EducationEntry)[] = [
  'id',
  'regionId',
  'title',
  'summary',
  'notADiagnosis',
  'sourceOrRationale',
  'version',
];

const CONTENT_FIELDS: (keyof EducationEntry)[] = [
  'title',
  'summary',
  'structures',
  'commonDescriptions',
  'whatToNotice',
  'whenToSeekHelp',
  'notADiagnosis',
];

const LIST_FIELDS = ['structures', 'commonDescriptions', 'whatToNotice', 'whenToSeekHelp'] as const;

function textOf(value: EducationEntry[keyof EducationEntry]): string {
  return Array.isArray(value) ? value.join(' ') : String(value ?? '');
}

export function validateEducationEntries(entries: readonly EducationEntry[]): string[] {
  const errors: string[] = [];
  const seenIds = new Set<string>();
  const seenRegions = new Set<string>();

  for (const entry of entries) {
    if (seenIds.has(entry.id)) errors.push(`Duplicate education id: ${entry.id}`);
    if (seenRegions.has(entry.regionId))
      errors.push(`Duplicate education region: ${entry.regionId}`);
    seenIds.add(entry.id);
    seenRegions.add(entry.regionId);

    for (const field of REQUIRED_TEXT_FIELDS) {
      if (!textOf(entry[field]).trim()) errors.push(`${entry.id}: ${field} is required`);
    }

    for (const field of LIST_FIELDS) {
      if (entry[field].length === 0)
        errors.push(`${entry.id}: ${field} must contain at least one item`);
    }

    // Non-negotiable #2: never write a clinician's name or a review date onto
    // content they have not reviewed, and never publish content nobody signed.
    if (entry.status === 'draft' && (entry.reviewedBy || entry.reviewedDate)) {
      errors.push(`${entry.id}: draft content must not claim completed review metadata`);
    }
    if (entry.status === 'published' && (!entry.reviewedBy || !entry.reviewedDate)) {
      errors.push(`${entry.id}: published content requires reviewedBy and reviewedDate`);
    }

    for (const field of CONTENT_FIELDS) {
      const content = textOf(entry[field]);

      // The 52 shared rules — superlatives, outcome claims, booking CTAs and
      // all 36 condition names.
      for (const v of scanText(content, String(field), COMPLIANCE_RULES)) {
        errors.push(
          `${entry.id}: ${String(field)} matched "${v.match}" [${v.ruleId}] — ${v.reason}`
        );
      }

      for (const rule of ORIENTATION_RULES) {
        const found = content.match(rule.pattern);
        if (found) {
          errors.push(
            `${entry.id}: ${String(field)} matched "${found[0]}" [${rule.id}] — ${rule.reason}`
          );
        }
      }
    }
  }

  return errors;
}

export function assertValidEducationEntries(entries: readonly EducationEntry[]): void {
  const errors = validateEducationEntries(entries);
  if (errors.length > 0) {
    throw new Error(
      `Education content validation failed:\n${errors.map((e) => `  ✗ ${e}`).join('\n')}`
    );
  }
}
