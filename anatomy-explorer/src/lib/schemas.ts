/**
 * Zod schemas for the sheet-generated content.
 *
 * **Fixed on port:** the source version called `ctx.addIssue({ code:
 * z.ZodIssueCode.custom, ... })`. `ZodIssueCode` was removed in Zod 4, and this
 * project pins `zod ^4` — so every `superRefine` rule below threw a
 * `TypeError` on the first published row instead of reporting a validation
 * problem. The published-row requirements were, in practice, unenforced.
 * Zod 4 takes the string literal `'custom'`.
 *
 * The column contract these mirror is `docs/CONTENT-SCHEMA.md`, which is
 * authoritative — it is what the clinician fills in. Do not infer the schema
 * from the JSON.
 */

import { z } from 'zod';

export const areaSchema = z.object({
  id: z.string(),
  area_id: z.string().regex(/^[a-z0-9-]+$/),
  section: z.enum(['stretching', 'exercise']),
  name_en: z.string().min(1),
  name_ar: z.string().optional(),
  order: z.number().int(),
  status: z.enum(['published', 'draft', 'retired']),
  notes_internal: z.string().optional(),
});

export const itemSchema = z
  .object({
    id: z.string().regex(/^(str|ex)-[a-z0-9-]+$/),
    section: z.enum(['stretching', 'exercise']),
    area_id: z.string().regex(/^[a-z0-9-]+$/),
    order: z.number().int(),
    status: z.enum(['published', 'draft', 'retired']),
    name_en: z.string().min(1),
    name_ar: z.string().optional(),
    type: z
      .enum([
        'range-of-motion',
        'mobility',
        'isometric',
        'concentric',
        'eccentric',
        'isokinetic',
        'stabilisation',
        'activation',
        'offloading',
        'strengthening',
        'functional',
      ])
      .optional(),
    start_position_en: z.string().optional(),
    start_position_ar: z.string().optional(),
    movement_en: z.string().optional(),
    movement_ar: z.string().optional(),
    direction_en: z.string().optional(),
    direction_ar: z.string().optional(),
    return_en: z.string().optional(),
    return_ar: z.string().optional(),
    safety_en: z.string().optional(),
    safety_ar: z.string().optional(),
    target_muscles_en: z.string().optional(),
    target_muscles_ar: z.string().optional(),
    hold_seconds: z.number().int().optional(),
    reps: z.number().int().optional(),
    sets: z.number().int().optional(),
    rest_seconds: z.number().int().optional(),
    each_side: z.boolean().optional(),
    frequency_en: z.string().optional(),
    image_id: z
      .string()
      .regex(/^[a-z0-9-]+$/)
      .optional(),
    image_alt_en: z.string().optional(),
    image_alt_ar: z.string().optional(),
    image_status: z.enum(['pending', 'generated', 'approved']).optional(),
    notes_internal: z.string().optional(),
    reviewed_by: z.string().optional(),
    reviewed_date: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.status !== 'published') return;

    const require = (field: keyof typeof data, message: string) => {
      if (!data[field]) ctx.addIssue({ code: 'custom', message, path: [field as string] });
    };

    require('start_position_en', 'start_position_en is required on a published row');
    require('movement_en', 'movement_en is required on a published row');
    require('safety_en', 'safety_en is required on a published row');
    require('target_muscles_en', 'target_muscles_en is required on a published row');
    require('image_id', 'image_id is required on a published row');
    require('image_alt_en', 'image_alt_en is required on a published row');

    if (data.section === 'exercise') {
      require('type', 'type is required for a published exercise');
      require('return_en', 'return_en is required for a published exercise');
    } else {
      require('direction_en', 'direction_en is required for a published stretch');
    }

    if (data.hold_seconds === undefined && data.reps === undefined) {
      ctx.addIssue({
        code: 'custom',
        message: 'At least one of hold_seconds or reps must be set on a published row',
        path: ['dosage'],
      });
    }
  });

/**
 * Frontmatter for the legal content files in `src/content/legal/`.
 *
 * Loaded with the glob loader, so `id` comes from the filename and is not
 * declared here. Wording lives in the markdown body precisely so the clinic can
 * change it without a code change (MODULES.md M12).
 */
export const legalSchema = z.object({
  title: z.string().min(1),
  /** One short line safe to show in the persistent page banner. */
  shortLine: z.string().min(1),
  order: z.number().int(),
  /**
   * The three safety elements that stay visible in the footer of every page,
   * rather than inside the collapsed section. Only the disclaimer supplies them.
   */
  educationalLine: z.string().optional(),
  stopContactLine: z.string().optional(),
  emergencyLine: z.string().optional(),
  /**
   * Who signed this wording off. RESEARCH-FINDINGS §4 records that the clinic's
   * Medical Director is accountable for content approval, so an unsigned legal
   * page is a launch blocker rather than a detail — `check:compliance` reports
   * every `null`.
   */
  approvedBy: z.string().nullable().default(null),
  approvedDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .default(null),
});
