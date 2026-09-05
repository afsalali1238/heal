/**
 * The content library — the single validated read path for areas and items.
 *
 * ── What this replaces ─────────────────────────────────────────────────────
 * The previous version began:
 *
 *     import areasData from '../../../patient-library/src/data/areas.json';
 *     import itemsData from '../../../patient-library/src/data/items.json';
 *     const areas = areasData as LibraryArea[];
 *
 * Three defects, in the order they bit (PORT-CHECKLIST blocker 0):
 *   1. Vercel with Root Directory set to `anatomy-explorer` never uploads
 *      anything above that directory, so the build failed before it started.
 *   2. `as LibraryArea[]` is a cast, not a check — that data reached patients
 *      having passed no Zod schema, no `validate.ts` and no compliance gate.
 *   3. It coupled the two folders permanently, which is the opposite of the
 *      reference relationship `AGENTS.md` describes.
 *
 * Everything here now goes through `astro:content`, which applies the Zod
 * schemas in `content.config.ts` at build time. A row that fails the schema
 * fails the build; nothing is cast.
 *
 * ── The publication rule, in one place ─────────────────────────────────────
 * An area is reachable only when it is itself published AND has at least one
 * published item. An area published with nothing in it is a dead end — the
 * failure A-005 was written after — so it is filtered here rather than in each
 * page, and `check:anatomy` asserts the same rule at build time.
 */

import { getCollection } from 'astro:content';
import type { Section } from './section';

export interface LibraryArea {
  readonly id: string;
  readonly area_id: string;
  readonly section: Section;
  readonly name_en: string;
  readonly name_ar?: string;
  readonly order: number;
}

/** Areas that are published AND carry at least one published item, head to toe (D-014). */
export async function getPublishedAreas(section: Section): Promise<LibraryArea[]> {
  const [areas, items] = await Promise.all([getCollection('areas'), getCollection('items')]);

  const populated = new Set(
    items
      .filter((item) => item.data.status === 'published')
      .map((item) => `${item.data.section}/${item.data.area_id}`)
  );

  return areas
    .filter((area) => area.data.section === section)
    .filter((area) => area.data.status === 'published')
    .filter((area) => populated.has(`${area.data.section}/${area.data.area_id}`))
    .map((area) => area.data as LibraryArea)
    .sort((a, b) => a.order - b.order);
}

/** How many published items an area holds. Used for the "3 items" count on cards. */
export async function getPublishedItemCount(section: Section, areaId: string): Promise<number> {
  const items = await getCollection('items');
  return items.filter(
    (item) =>
      item.data.section === section &&
      item.data.area_id === areaId &&
      item.data.status === 'published'
  ).length;
}

/**
 * Every `area_id` a patient can actually reach, in either section.
 *
 * This is what decides which body regions the locator offers (A-005): a region
 * with no reachable area is not drawn, so the map cannot dead-end.
 */
export async function getReachableAreaIds(): Promise<Set<string>> {
  const [stretching, exercise] = await Promise.all([
    getPublishedAreas('stretching'),
    getPublishedAreas('exercise'),
  ]);
  return new Set([...stretching, ...exercise].map((area) => area.area_id));
}

/**
 * Which sections a given body area has content in, with the count for each.
 * The locator's confirmation screen uses this to offer only routes that exist.
 */
export interface AreaRoute {
  readonly section: Section;
  readonly areaId: string;
  readonly name: string;
  readonly count: number;
}

export async function getAreaRoutes(areaId: string): Promise<AreaRoute[]> {
  const routes: AreaRoute[] = [];
  for (const section of ['stretching', 'exercise'] as const) {
    const areas = await getPublishedAreas(section);
    const match = areas.find((area) => area.area_id === areaId);
    if (!match) continue;
    routes.push({
      section,
      areaId,
      name: match.name_en,
      count: await getPublishedItemCount(section, areaId),
    });
  }
  return routes;
}
