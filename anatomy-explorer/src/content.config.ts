import { defineCollection } from 'astro:content';
import { file, glob } from 'astro/loaders';
import { areaSchema, itemSchema, legalSchema } from './lib/schemas';

const areas = defineCollection({
  loader: file('src/data/areas.json'),
  schema: areaSchema,
});

const items = defineCollection({
  loader: file('src/data/items.json'),
  schema: itemSchema,
});

/**
 * Legal wording — disclaimer, privacy note, credits.
 * Content files rather than component markup so the clinic can change the
 * wording without a code change (MODULES.md M12).
 */
const legal = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/legal' }),
  schema: legalSchema,
});

export const collections = { areas, items, legal };
