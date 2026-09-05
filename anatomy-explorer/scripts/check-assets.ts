/**
 * Visual Asset Registry & Media Validation Gate
 * Module S0 / V2: ASSET-PIPELINE.md & 3D-TECHNICAL-ARCHITECTURE.md
 *
 * Enforces:
 * - Required asset directories exist
 * - Referenced asset files exist in filesystem
 * - Actual byte sizes meet the 5.5MB budget and declared size metadata
 * - GLB files contain valid glTF 2.0 binary container headers
 * - Approved assets must have genuine clinician/reviewer metadata (reviewed_by and reviewed_date)
 * - Asset IDs must be permanent and unique (no duplicates)
 * - Fallback 2D asset is approved and available
 * - Published exercise/stretch items point to existing image files
 *
 * Exit codes: 0 clean (warnings allowed), 1 violation.
 */

import fs from 'node:fs';
import path from 'node:path';
import { ASSET_REGISTRY, type AnatomyAssetMetadata } from '../src/lib/anatomy/asset-registry';
import { auditMediaLedger, MEDIA_LEDGER } from '../src/lib/anatomy/media-ledger';
import { BODY_REGION_VISUALS } from '../src/lib/anatomy/model-registry';
import { validateModelRegionVisuals } from '../src/lib/anatomy/model-registry-validation';
import { GEOMETRY_REGIONS } from '../src/lib/anatomy/geometry/regions';
import { MOTION_ASSETS } from '../src/lib/motion/motion-registry';
import { validateMotionAssets } from '../src/lib/motion/motion-validation';

const MAX_BYTES_BUDGET = 5.5 * 1024 * 1024; // 5.5MB per ASSET-PIPELINE.md
const MAX_TRIANGLES_BUDGET = 50000;

function countGlbTriangles(filePath: string): number {
  const buffer = fs.readFileSync(filePath);
  const jsonLength = buffer.readUInt32LE(12);
  const jsonType = buffer.toString('ascii', 16, 20);
  if (jsonType !== 'JSON') throw new Error('first GLB chunk is not JSON');
  const gltf = JSON.parse(buffer.toString('utf8', 20, 20 + jsonLength));
  return (gltf.meshes ?? []).reduce(
    (total: number, mesh: any) =>
      total +
      (mesh.primitives ?? []).reduce((meshTotal: number, primitive: any) => {
        if (primitive.mode !== undefined && primitive.mode !== 4) return meshTotal;
        const accessorIndex = primitive.indices ?? primitive.attributes?.POSITION;
        const count = gltf.accessors?.[accessorIndex]?.count ?? 0;
        return meshTotal + Math.floor(count / 3);
      }, 0),
    0
  );
}

function readGlbNodeNames(filePath: string): string[] {
  const buffer = fs.readFileSync(filePath);
  const jsonLength = buffer.readUInt32LE(12);
  const gltf = JSON.parse(buffer.toString('utf8', 20, 20 + jsonLength));
  return (gltf.nodes ?? []).map((node: { name?: string }) => node.name).filter(Boolean);
}

export const REQUIRED_DIRS = [
  path.join('src', 'assets', 'images'),
  path.join('public', 'anatomy'),
  path.join('public', 'anatomy', 'models'),
] as const;

export interface AssetAuditResult {
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
  readonly scannedCount: number;
}

export interface MinimalItemRow {
  readonly id?: string;
  readonly status?: string;
  readonly image_id?: string;
  readonly [key: string]: unknown;
}

/**
 * Audits asset registry and item image references against the file system.
 */
export function auditAssets(
  registry: readonly AnatomyAssetMetadata[],
  items: readonly MinimalItemRow[],
  baseDir: string = process.cwd()
): AssetAuditResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Verify required directories exist
  for (const relDir of REQUIRED_DIRS) {
    const fullDir = path.join(baseDir, relDir);
    if (!fs.existsSync(fullDir)) {
      errors.push(`✗ Missing required directory: "${relDir}". Required by ASSET-PIPELINE.md.`);
    }
  }

  // 2. Audit Asset Registry (3D models, SVG fallbacks, regional assets)
  const seenIds = new Set<string>();

  for (const asset of registry) {
    // Duplicate ID check
    if (seenIds.has(asset.asset_id)) {
      errors.push(
        `✗ Duplicate asset_id "${asset.asset_id}". Asset IDs must be permanent and unique.`
      );
    }
    seenIds.add(asset.asset_id);

    // Required metadata fields
    if (!asset.license || !asset.source_url_or_provider || !asset.author_or_attribution) {
      errors.push(
        `✗ Asset "${asset.asset_id}" is missing required licensing or attribution metadata (license, source_url_or_provider, author_or_attribution).`
      );
    }

    // Review metadata requirement for approved assets
    if (asset.status === 'approved') {
      const hasReviewer = Boolean(asset.reviewed_by && asset.reviewed_by.trim().length > 0);
      const hasDate = Boolean(
        asset.reviewed_date && /^\d{4}-\d{2}-\d{2}$/.test(asset.reviewed_date.trim())
      );
      if (!hasReviewer || !hasDate) {
        errors.push(
          `✗ Asset "${asset.asset_id}" is status: "approved" but lacks genuine review metadata. Both "reviewed_by" and ISO "reviewed_date" (YYYY-MM-DD) are required before release.`
        );
      }
    }

    // File existence & byte size check
    if (!asset.url.startsWith('/') || asset.url.includes('..')) {
      errors.push(
        `✗ Asset "${asset.asset_id}" has an invalid public URL "${asset.url}". Must start with "/".`
      );
      continue;
    }

    const filePath = path.join(baseDir, 'public', ...asset.url.slice(1).split('/'));
    if (!fs.existsSync(filePath)) {
      errors.push(
        `✗ Asset "${asset.asset_id}" is registered but file is missing at "${asset.url}".`
      );
      continue;
    }

    const stat = fs.statSync(filePath);
    const actualBytes = stat.size;

    if (actualBytes === 0) {
      errors.push(`✗ Asset "${asset.asset_id}" at "${asset.url}" is an empty (0 byte) file.`);
    }

    if (actualBytes > MAX_BYTES_BUDGET) {
      const mb = (actualBytes / (1024 * 1024)).toFixed(2);
      errors.push(`✗ Asset "${asset.asset_id}" exceeds 5.5MB budget (${mb}MB > 5.5MB).`);
    }

    if (asset.compressed_bytes !== undefined && asset.compressed_bytes !== actualBytes) {
      errors.push(
        `✗ Asset "${asset.asset_id}" declares ${asset.compressed_bytes} compressed_bytes but actual file size is ${actualBytes} bytes.`
      );
    }

    if (asset.triangle_count !== undefined && asset.triangle_count > MAX_TRIANGLES_BUDGET) {
      errors.push(
        `✗ Asset "${asset.asset_id}" exceeds triangle budget (${asset.triangle_count} > ${MAX_TRIANGLES_BUDGET}).`
      );
    }

    // GLB 2.0 Container binary validation
    if (path.extname(filePath).toLowerCase() === '.glb') {
      if (actualBytes < 12) {
        errors.push(`✗ Asset "${asset.asset_id}" is smaller than a 12-byte GLB header.`);
      } else {
        const header = Buffer.alloc(12);
        const fd = fs.openSync(filePath, 'r');
        try {
          fs.readSync(fd, header, 0, 12, 0);
        } finally {
          fs.closeSync(fd);
        }
        const magic = header.toString('ascii', 0, 4);
        const version = header.readUInt32LE(4);
        if (magic !== 'glTF' || version !== 2) {
          errors.push(
            `✗ Asset "${asset.asset_id}" is not a valid GLB 2.0 container (magic="${magic}", version=${version}).`
          );
        }
      }
      try {
        const actualTriangles = countGlbTriangles(filePath);
        if (actualTriangles > MAX_TRIANGLES_BUDGET) {
          errors.push(
            `✗ Asset "${asset.asset_id}" exceeds triangle budget (${actualTriangles} > ${MAX_TRIANGLES_BUDGET}).`
          );
        }
        if (asset.triangle_count !== undefined && asset.triangle_count !== actualTriangles) {
          errors.push(
            `✗ Asset "${asset.asset_id}" declares ${asset.triangle_count} triangles but GLB contains ${actualTriangles}.`
          );
        }
      } catch (err) {
        errors.push(
          `✗ Asset "${asset.asset_id}" triangle count could not be read: ${(err as Error).message}.`
        );
      }
    }
  }

  // 3. Fallback asset check (Level 0 mandatory)
  const approvedFallback = registry.find((a) => a.kind === 'fallback' && a.status === 'approved');
  if (!approvedFallback) {
    errors.push(
      '✗ Missing approved 2D fallback map in ASSET_REGISTRY (Level 0 tier is mandatory before release).'
    );
  }

  // 4. Audit Published 2D Image files
  const imagesDir = path.join(baseDir, 'src', 'assets', 'images');
  let availableImages = new Set<string>();
  if (fs.existsSync(imagesDir)) {
    try {
      availableImages = new Set(
        fs
          .readdirSync(imagesDir)
          .filter((f) => !f.startsWith('.'))
          .map((f) => path.basename(f, path.extname(f)))
      );
    } catch (err) {
      warnings.push(`! Could not read image directory "${imagesDir}": ${(err as Error).message}`);
    }
  }

  const publishedItems = items.filter((i) => i.status === 'published');
  const requiredImages = new Set(publishedItems.map((i) => i.image_id).filter(Boolean) as string[]);

  for (const imgId of requiredImages) {
    if (!availableImages.has(imgId)) {
      errors.push(
        `✗ Published item references image "${imgId}", but no corresponding file exists in "src/assets/images".`
      );
    }
  }

  for (const imgId of availableImages) {
    if (!requiredImages.has(imgId)) {
      warnings.push(
        `! Image file "${imgId}" exists in src/assets/images but is not referenced by any published item.`
      );
    }
  }

  const locator = registry.find((asset) => asset.kind === 'locator' && asset.status !== 'retired');
  if (locator) {
    const locatorPath = path.join(baseDir, 'public', ...locator.url.slice(1).split('/'));
    if (fs.existsSync(locatorPath)) {
      try {
        errors.push(
          ...validateModelRegionVisuals(
            BODY_REGION_VISUALS,
            readGlbNodeNames(locatorPath),
            GEOMETRY_REGIONS.map((region) => region.id)
          ).map((error) => `✗ ${error}`)
        );
      } catch (err) {
        errors.push(`✗ Locator mesh mapping could not be inspected: ${(err as Error).message}.`);
      }
    }
  }

  return {
    errors,
    warnings,
    scannedCount: registry.length,
  };
}

function run(): void {
  console.log('Visual Asset Registry & Media Validation — Module S0 / V2');

  const itemsFile = path.join(process.cwd(), 'src', 'data', 'items.json');
  let items: MinimalItemRow[] = [];
  if (fs.existsSync(itemsFile)) {
    try {
      items = JSON.parse(fs.readFileSync(itemsFile, 'utf8'));
    } catch {
      console.error('✗ Could not parse src/data/items.json.');
      process.exit(1);
    }
  }

  const result = auditAssets(ASSET_REGISTRY, items, process.cwd());
  const ledgerErrors = auditMediaLedger(MEDIA_LEDGER, process.cwd());
  const motionErrors = validateMotionAssets(MOTION_ASSETS);
  console.log(`  Audited ${result.scannedCount} registered asset(s) and ${items.length} item(s).`);

  if (result.warnings.length > 0) {
    console.log(`\n${result.warnings.length} warning(s):`);
    for (const w of result.warnings) console.log(`  ${w}`);
  }

  const allErrors = [...result.errors, ...ledgerErrors, ...motionErrors];
  if (allErrors.length > 0) {
    console.error(`\nFound ${allErrors.length} asset pipeline violation(s):`);
    for (const e of allErrors) console.error(`  ${e}`);
    console.error('\n✗ check:assets failed. Fix the errors above and re-run.');
    process.exit(1);
  }

  console.log(
    '\n✓ check:assets passed: All visual assets and directories satisfy ASSET-PIPELINE.md standards.'
  );
}

import { fileURLToPath } from 'node:url';

// Only execute directly when run as main script
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  run();
}
