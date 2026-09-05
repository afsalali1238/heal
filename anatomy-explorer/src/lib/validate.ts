/**
 * Cross-row and clinical-governance validation.
 *
 * Zod validates a row in isolation. These are the rules that need to see the
 * whole set, or that encode a governance contract from the project docs rather
 * than a shape. `docs/CONTENT-SCHEMA.md` requires the build to *fail* on some of
 * them, so they run in two places — at sync time to reject a bad sheet early,
 * and at build time so nothing can ship unchecked.
 *
 * These checks deliberately do not repair anything. Non-negotiable #1: all
 * clinical content comes from the physiotherapist via the sheet, and if content
 * looks wrong the build flags it rather than fixing it.
 */

export type Level = 'error' | 'warn';

export interface Finding {
  readonly level: Level;
  readonly rule: string;
  readonly where: string;
  readonly message: string;
}

interface AreaRow {
  readonly id?: string;
  readonly area_id?: string;
  readonly section?: string;
  readonly status?: string;
  readonly name_en?: string;
  readonly [key: string]: unknown;
}

interface ItemRow {
  readonly id?: string;
  readonly area_id?: string;
  readonly section?: string;
  readonly status?: string;
  readonly name_en?: string;
  readonly image_id?: string;
  readonly image_alt_en?: string;
  readonly image_status?: string;
  readonly reviewed_by?: string;
  readonly reviewed_date?: string;
  readonly [key: string]: unknown;
}

/** Free-text fields shown to a patient, capped by CONTENT-SCHEMA.md at 200 chars. */
const PROSE_FIELDS = [
  'start_position_en',
  'movement_en',
  'direction_en',
  'return_en',
  'safety_en',
  'target_muscles_en',
] as const;

const MAX_PROSE_CHARS = 200;
const MAX_ITEMS_PER_AREA = 8;
/**
 * Alt text must describe the position well enough that a patient using a screen
 * reader can still do the exercise (non-negotiable #5). Length is a crude proxy,
 * but "Person making double chin." failing this check is exactly the point.
 */
const MIN_ALT_CHARS = 45;

export function validateItems(items: readonly ItemRow[], areas: readonly AreaRow[]): Finding[] {
  const findings: Finding[] = [];
  const published = items.filter((i) => i.status === 'published');

  // ── Duplicate ids — CONTENT-SCHEMA.md: build must fail ────────────────────
  // Ids are permanent (non-negotiable #7). A duplicate means two rows are
  // fighting over one identity, and the loader silently keeps one of them.
  const seen = new Map<string, number>();
  items.forEach((item, index) => {
    if (!item.id) return;
    const previous = seen.get(item.id);
    if (previous !== undefined) {
      findings.push({
        level: 'error',
        rule: 'duplicate-id',
        where: `items row ${index + 2}`,
        message: `id "${item.id}" already used by row ${previous + 2}. Ids are permanent and unique — retire with status: retired, never reuse.`,
      });
    } else {
      seen.set(item.id, index);
    }
  });

  // ── More than 8 published items in one area — build must fail ─────────────
  // PRD §5: area pages list items in full, with no third navigation level. Past
  // eight the page stops being scannable by someone in pain on a phone.
  const perArea = new Map<string, ItemRow[]>();
  for (const item of published) {
    const key = `${item.section}/${item.area_id}`;
    const bucket = perArea.get(key);
    if (bucket) bucket.push(item);
    else perArea.set(key, [item]);
  }
  for (const [key, bucket] of perArea) {
    if (bucket.length > MAX_ITEMS_PER_AREA) {
      findings.push({
        level: 'error',
        rule: 'area-over-capacity',
        where: key,
        message: `${bucket.length} published items, limit is ${MAX_ITEMS_PER_AREA}. Retire one or split the area (PRD §5 — no third navigation level).`,
      });
    }
  }

  // ── Items pointing at an area that is not published ──────────────────────
  const publishedAreaKeys = new Set(
    areas.filter((a) => a.status === 'published').map((a) => `${a.section}/${a.area_id}`)
  );
  const allAreaKeys = new Set(areas.map((a) => `${a.section}/${a.area_id}`));
  for (const item of published) {
    const key = `${item.section}/${item.area_id}`;
    if (!allAreaKeys.has(key)) {
      findings.push({
        level: 'error',
        rule: 'orphan-item',
        where: `item "${item.id}"`,
        message: `references area "${key}", which does not exist in the areas tab.`,
      });
    } else if (!publishedAreaKeys.has(key)) {
      findings.push({
        level: 'warn',
        rule: 'unreachable-item',
        where: `item "${item.id}"`,
        message: `is published but its area "${key}" is not, so no patient can reach it.`,
      });
    }
  }

  for (const item of published) {
    // ── image_id must belong to the item's own section and area ────────────
    // A shoulder exercise pointing at a neck illustration is a silent clinical
    // error: the card text and the picture describe different movements, and
    // nothing about the page reveals the mismatch.
    if (item.image_id && item.section && item.area_id) {
      const prefix = item.section === 'stretching' ? 'str' : 'ex';
      const expected = `${prefix}-${item.area_id}-`;
      if (!item.image_id.startsWith(expected)) {
        findings.push({
          level: 'error',
          rule: 'image-area-mismatch',
          where: `item "${item.id}"`,
          message: `image_id "${item.image_id}" does not match the item's own area — expected it to start with "${expected}". The picture would show a different body area from the instructions.`,
        });
      }
    }

    // ── Alt text must describe the position ──────────────────────────────
    const alt = item.image_alt_en;
    if (alt && alt.trim().length < MIN_ALT_CHARS) {
      findings.push({
        level: 'error',
        rule: 'alt-text-too-thin',
        where: `item "${item.id}"`,
        message: `image_alt_en is ${alt.trim().length} characters: "${alt.trim()}". A patient using a screen reader must be able to do the exercise from this alone (non-negotiable #5), so it has to describe the position, not name it.`,
      });
    }

    // ── Dosage must not be buried in the prose ───────────────────────────
    // Dosage belongs in the dosage fields so every card lays out the same way.
    for (const field of PROSE_FIELDS) {
      const value = item[field];
      if (typeof value !== 'string') continue;
      if (value.length > MAX_PROSE_CHARS) {
        findings.push({
          level: 'warn',
          rule: 'prose-too-long',
          where: `item "${item.id}"`,
          message: `${field} is ${value.length} characters (soft limit ${MAX_PROSE_CHARS}). Long instructions break the card layout on a phone.`,
        });
      }
      if (
        /\b(\d+)\s*(reps?|repetitions?|sets?|seconds?|secs?|times a day|x\s*\d+)\b/i.test(value)
      ) {
        findings.push({
          level: 'warn',
          rule: 'dosage-in-prose',
          where: `item "${item.id}"`,
          message: `${field} appears to contain dosage ("${value.match(/\b\d+\s*\w+/)?.[0] ?? ''}"). Dosage belongs in hold_seconds / reps / sets / frequency_en so every card reads the same.`,
        });
      }
    }

    // ── Clinical sign-off ────────────────────────────────────────────────
    // Non-negotiable #1: clinical content is the physiotherapist's. A published
    // row with no reviewer is content nobody has taken responsibility for.
    if (!item.reviewed_by || String(item.reviewed_by).trim() === '') {
      findings.push({
        /**
         * **Promoted from `warn` to `error` on 2026-08-26.**
         *
         * The rule fired on every build and nothing happened, which is worse
         * than not having it: five published items had been sitting unsigned
         * for days while the checker dutifully reported it.
         *
         * It matters more now, not less. Content is being drafted in bulk ahead
         * of clinical review, which is a fine way to work — `status: 'draft'`
         * keeps it away from patients. But that only holds if the boundary
         * between "drafted" and "published" is a wall rather than a habit.
         * This is the wall: a row cannot go live without a clinician's name on
         * it, and the build refuses rather than warns.
         */
        level: 'error',
        rule: 'unreviewed-published-item',
        where: `item "${item.id}"`,
        message:
          'is published with no reviewed_by. Content reaches patients only after a clinician signs it off — keep it status: draft until then.',
      });
    }

    if (!item.reviewed_date || String(item.reviewed_date).trim() === '') {
      findings.push({
        level: 'error',
        rule: 'undated-published-item',
        where: `item "${item.id}"`,
        message: 'is published with no reviewed_date.',
      });
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(String(item.reviewed_date).trim())) {
      findings.push({
        level: 'error',
        rule: 'invalid-review-date',
        where: `item "${item.id}"`,
        message: 'reviewed_date must be in YYYY-MM-DD format.',
      });
    }
  }

  return findings;
}

export function validateAreas(areas: readonly AreaRow[]): Finding[] {
  const findings: Finding[] = [];
  const seen = new Map<string, number>();
  areas.forEach((area, index) => {
    const key = `${area.section}/${area.area_id}`;
    const previous = seen.get(key);
    if (previous !== undefined) {
      findings.push({
        level: 'error',
        rule: 'duplicate-area',
        where: `areas row ${index + 2}`,
        message: `area "${key}" already defined on row ${previous + 2}.`,
      });
    } else {
      seen.set(key, index);
    }
  });
  return findings;
}

export function formatFinding(f: Finding): string {
  return `  ${f.level === 'error' ? '✗' : '!'} ${f.where} · ${f.message} [${f.rule}]`;
}
