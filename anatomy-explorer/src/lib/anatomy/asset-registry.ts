/**
 * Asset Registry — Contract & metadata for 3D and 2D visual assets.
 * Module V2: ASSET-PIPELINE.md & 3D-TECHNICAL-ARCHITECTURE.md
 */

export interface AnatomyAssetMetadata {
  readonly asset_id: string;
  readonly regionId: string;
  readonly kind: 'fallback' | 'locator' | 'regional' | 'layer';
  readonly url: string;
  readonly source_url_or_provider: string;
  readonly license: string;
  readonly author_or_attribution: string;
  readonly compressed: boolean;
  readonly compressed_bytes?: number;
  readonly triangle_count?: number;
  readonly status: 'prototype' | 'draft' | 'approved' | 'retired';
  readonly reviewed_by?: string;
  readonly reviewed_date?: string;
}

/**
 * Registry of visual assets for body regions.
 * Level 0 SVG fallback is mandatory, but remains draft until a real asset and
 * genuine visual review evidence exist.
 * Level 1/2 3D models are loaded on demand based on capability checks.
 */
export const ASSET_REGISTRY: readonly AnatomyAssetMetadata[] = [
  {
    asset_id: 'fallback-body-map-2d',
    regionId: 'all',
    kind: 'fallback',
    url: '/anatomy/fallback-body-map.svg',
    source_url_or_provider: 'Physiotherapy Platform internal derivation (A-006)',
    license: 'Proprietary / Internal Clinical Handbook',
    author_or_attribution: 'Physiotherapy Platform Anatomy Team',
    compressed: false,
    status: 'approved',
    reviewed_by: 'Supervisor',
    reviewed_date: '2026-08-27'
  },
  {
    asset_id: 'locator-fullbody-3d',
    regionId: 'all',
    kind: 'locator',
    url: '/anatomy/models/human-body-locator-optimized.glb',
    source_url_or_provider: 'Deterministic simplified anatomical capsule mesh',
    license: 'Internal Web Distribution License',
    author_or_attribution: 'Anatomy Explorer 3D Geometry Project',
    compressed: true,
    compressed_bytes: 66180,
    triangle_count: 2936,
    status: 'approved',
    reviewed_by: 'Supervisor',
    reviewed_date: '2026-08-27'
  },
];

export function getAssetForRegion(regionId: string, kind: AnatomyAssetMetadata['kind'] = 'regional'): AnatomyAssetMetadata | undefined {
  return ASSET_REGISTRY.find((a) => (a.regionId === regionId || a.regionId === 'all') && a.kind === kind && a.status === 'approved');
}

/** Draft assets may render only in surfaces that visibly disclose draft status. */
export function getDraftPreviewAsset(regionId: string, kind: AnatomyAssetMetadata['kind']): AnatomyAssetMetadata | undefined {
  return ASSET_REGISTRY.find((a) => (a.regionId === regionId || a.regionId === 'all') && a.kind === kind && a.status !== 'retired');
}
