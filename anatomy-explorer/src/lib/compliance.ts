/**
 * Compliance term scanning — the single source of truth for banned wording.
 *
 * Required by docs/MODULES.md M12. The term list comes from two places, both of
 * which are authoritative and neither of which may be edited on a whim:
 *
 *  - docs/RESEARCH-FINDINGS.md §4, quoting DHA's *Standards for Medical
 *    Advertisement Content* v1.1 (2022): banned are "unique", "one of a kind",
 *    "the best", "exclusive", "safest", guarantees, "miraculous".
 *  - docs/MODULES.md M12, which adds condition names, "cure", "fix", and any
 *    booking CTA string.
 *
 * Why this file exists rather than an inline array in the sync script: the same
 * list has to run at sync time (to reject a bad sheet row early) and at build
 * time (so a hand-edited or stale JSON file can never ship). Two copies of a
 * compliance list is two chances for them to drift.
 *
 * IMPORTANT: matching is word-boundary, not substring. A substring match on
 * "cure" flags "secure the band", and on "best" flags "bestow" — both of which
 * are legitimate physiotherapy instruction. The previous naive
 * `text.includes(term)` check would have blocked real clinical content.
 */

export type Severity = 'error' | 'warn';

export interface ComplianceRule {
  /** Stable identifier used in messages, so a violation is greppable. */
  readonly id: string;
  readonly pattern: RegExp;
  readonly severity: Severity;
  /** Why this term is banned — printed with the violation so it is actionable. */
  readonly reason: string;
}

export interface Violation {
  readonly ruleId: string;
  readonly severity: Severity;
  readonly reason: string;
  readonly field: string;
  readonly match: string;
}

/** Superlatives and guarantees. Named explicitly in the DHA standard. */
const SUPERLATIVES: readonly ComplianceRule[] = [
  {
    id: 'best',
    pattern: /\b(the\s+)?best\b/i,
    severity: 'error',
    reason: 'Superlative claim banned by DHA advertisement content standards.',
  },
  {
    id: 'safest',
    pattern: /\bsafest\b/i,
    severity: 'error',
    reason: 'Superlative claim banned by DHA advertisement content standards.',
  },
  {
    id: 'unique',
    pattern: /\bunique\b/i,
    severity: 'error',
    reason: 'Superlative claim banned by DHA advertisement content standards.',
  },
  {
    id: 'one-of-a-kind',
    pattern: /\bone[\s-]of[\s-]a[\s-]kind\b/i,
    severity: 'error',
    reason: 'Superlative claim banned by DHA advertisement content standards.',
  },
  {
    id: 'exclusive',
    pattern: /\bexclusive(ly)?\b/i,
    severity: 'error',
    reason: 'Superlative claim banned by DHA advertisement content standards.',
  },
  {
    id: 'miraculous',
    pattern: /\bmiracle|miraculous\b/i,
    severity: 'error',
    reason: 'Superlative claim banned by DHA advertisement content standards.',
  },
  {
    id: 'guarantee',
    pattern: /\bguarantee(d|s)?\b/i,
    severity: 'error',
    reason: 'Guarantees are banned by DHA advertisement content standards.',
  },
  {
    id: 'percent-claim',
    pattern: /\b100\s*%\s*(effective|safe|success|guaranteed|results?)\b/i,
    severity: 'error',
    reason: 'Unsubstantiated outcome claim.',
  },
];

/**
 * Outcome claims. An outcome claim requires substantiation *and* a statement of
 * associated risks (RESEARCH-FINDINGS §4), which patient education copy is not
 * the place for — so we ban them outright rather than try to qualify them.
 */
const OUTCOME_CLAIMS: readonly ComplianceRule[] = [
  {
    id: 'cure',
    pattern: /\bcure(s|d)?\b/i,
    severity: 'error',
    reason: 'Outcome claim. Education copy must not promise a result.',
  },
  {
    id: 'fix',
    // "fix your gaze on a point" is standard physiotherapy instruction for
    // balance and cervical work, so it is excluded from the match. Any other
    // use of "fix" reads as a promise to repair the patient.
    pattern: /\bfix(es|ed|ing)?\b(?!\s+(your|the|a)\s+(gaze|eyes?|vision|point|attention))/i,
    severity: 'error',
    reason:
      'Outcome claim. Education copy must not promise to repair anything. ("fix your gaze" is allowed.)',
  },
  {
    id: 'heal-promise',
    pattern: /\bwill\s+(heal|cure|repair|resolve|eliminate)\b/i,
    severity: 'error',
    reason: 'Outcome claim stated as certainty.',
  },
  {
    id: 'permanent',
    pattern: /\bpermanent(ly)?\s+(relief|cure|fix|solution)\b/i,
    severity: 'error',
    reason: 'Outcome claim.',
  },
];

/**
 * Booking CTAs. Per MODULES.md M12: "that single element is what would
 * reclassify the site from education to medical advertisement under MOHAP
 * rules." This is the highest-consequence group in the file.
 */
const BOOKING_CTAS: readonly ComplianceRule[] = [
  {
    id: 'book-now',
    pattern: /\bbook\s+(now|your|an?|today)\b/i,
    severity: 'error',
    reason: 'Booking CTA reclassifies the site as medical advertisement (MOHAP).',
  },
  {
    id: 'appointment',
    pattern: /\b(schedule|make|request|reserve)\s+(an?\s+)?appointment\b/i,
    severity: 'error',
    reason: 'Booking CTA reclassifies the site as medical advertisement (MOHAP).',
  },
  {
    id: 'call-to-book',
    pattern: /\bcall\s+(us\s+)?(now|today)\s+to\s+book\b/i,
    severity: 'error',
    reason: 'Booking CTA reclassifies the site as medical advertisement (MOHAP).',
  },
  {
    id: 'free-consultation',
    pattern: /\bfree\s+(consultation|assessment|session|trial)\b/i,
    severity: 'error',
    reason: 'Promotional offer. Advertisement, not education.',
  },
  {
    id: 'limited-offer',
    pattern: /\b(limited\s+(time|offer)|special\s+offer|discount)\b/i,
    severity: 'error',
    reason: 'Promotional offer. Advertisement, not education.',
  },
];

/**
 * Condition names. The clinician deliberately removed condition-based
 * navigation (PRD §5, non-negotiable #3) — the site is organised by body area
 * only. A condition name in an item's text reintroduces diagnosis by the back
 * door: it tells a patient this exercise is *for* their condition, which is a
 * clinical judgement the site is not allowed to make.
 *
 * Not exhaustive, and cannot be. It catches the common cases; the clinician
 * remains the backstop.
 */
const CONDITION_NAMES: readonly ComplianceRule[] = (
  [
    'sciatica',
    'arthritis',
    'osteoarthritis',
    'rheumatoid',
    'osteoporosis',
    'fibromyalgia',
    'herniated disc',
    'slipped disc',
    'disc bulge',
    'bulging disc',
    'frozen shoulder',
    'tennis elbow',
    "golfer's elbow",
    'carpal tunnel',
    'plantar fasciitis',
    'spondylosis',
    'spondylitis',
    'spondylolisthesis',
    'scoliosis',
    'kyphosis',
    'stenosis',
    'bursitis',
    'tendonitis',
    'tendinitis',
    'tendinopathy',
    'whiplash',
    'radiculopathy',
    'impingement',
    'rotator cuff tear',
    'meniscus tear',
    'lumbago',
    'vertigo',
    'migraine',
    'lordosis',
    'neuralgia',
    'myelopathy',
  ] as const
).map((name) => ({
  id: `condition:${name.replace(/[^a-z]+/gi, '-')}`,
  // Escape regex metacharacters (the apostrophe in "golfer's" is safe, but do
  // not rely on the list never gaining a "." or "(").
  pattern: new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i'),
  severity: 'error' as const,
  reason:
    'Condition name. The site is organised by body area only — no diagnosis language (non-negotiable #3).',
}));

/**
 * The full set, applied to published item content — the patient-facing clinical
 * copy from the clinician's sheet.
 */
export const COMPLIANCE_RULES: readonly ComplianceRule[] = [
  ...SUPERLATIVES,
  ...OUTCOME_CLAIMS,
  ...BOOKING_CTAS,
  ...CONDITION_NAMES,
];

/**
 * The subset applied to legal and site-chrome copy.
 *
 * Legal text is scanned for promotional content only, and deliberately not for
 * superlatives or outcome claims. A limitation-of-liability clause legitimately
 * needs to *negate* the very words the item scanner bans — "no outcome is
 * guaranteed", "this will not cure anything" — and flagging a disclaimer for
 * disclaiming would train everyone to ignore the checker.
 *
 * The booking-CTA rules still apply, because a CTA in a footer reclassifies the
 * site just as surely as one in an exercise description.
 */
export const PROMOTIONAL_RULES: readonly ComplianceRule[] = [...BOOKING_CTAS];

/** Marker used in src/config/clinic.ts for values the clinic must still supply. */
export const PLACEHOLDER_MARKER = 'TO BE SUPPLIED';

/**
 * Scan one string. `field` is carried through only so the caller can report
 * which column tripped, without the scanner needing to know about the schema.
 */
export function scanText(
  text: string,
  field: string,
  rules: readonly ComplianceRule[] = COMPLIANCE_RULES
): Violation[] {
  if (!text) return [];
  const violations: Violation[] = [];
  for (const rule of rules) {
    const found = text.match(rule.pattern);
    if (found) {
      violations.push({
        ruleId: rule.id,
        severity: rule.severity,
        reason: rule.reason,
        field,
        match: found[0],
      });
    }
  }
  return violations;
}

/**
 * Scan every string-valued field of a record. Keys listed in `skipFields` are
 * ignored — ids and image filenames are machine values, not patient-facing
 * copy, and legitimately contain things like a body-area name.
 */
export function scanRecord(
  record: Readonly<Record<string, unknown>>,
  skipFields: readonly string[] = [],
  rules: readonly ComplianceRule[] = COMPLIANCE_RULES
): Violation[] {
  const violations: Violation[] = [];
  for (const [key, value] of Object.entries(record)) {
    if (skipFields.includes(key)) continue;
    if (typeof value !== 'string') continue;
    violations.push(...scanText(value, key, rules));
  }
  return violations;
}

/**
 * Fields that are machine identifiers rather than patient-facing prose.
 * `image_alt_en` is deliberately NOT skipped: alt text is read aloud to
 * patients using a screen reader and carries exactly the same obligations.
 */
export const NON_PROSE_FIELDS: readonly string[] = [
  'id',
  'area_id',
  'section',
  'status',
  'image_id',
  'image_status',
  'reviewed_by',
  'type',
  'order',
];

export function formatViolation(context: string, v: Violation): string {
  return `  ${v.severity === 'error' ? '✗' : '!'} ${context} · column "${v.field}" · matched "${v.match}" [${v.ruleId}]\n      ${v.reason}`;
}
