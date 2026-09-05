import type { BodyRegionVisual } from './model-registry';

export function validateModelRegionVisuals(
  visuals: readonly BodyRegionVisual[],
  availableMeshNames: readonly string[],
  availableRegionIds: readonly string[]
): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  const meshes = new Set(availableMeshNames);
  const regions = new Set(availableRegionIds);

  for (const visual of visuals) {
    if (ids.has(visual.regionId)) errors.push(`Duplicate visual regionId "${visual.regionId}".`);
    ids.add(visual.regionId);
    if (!regions.has(visual.regionId))
      errors.push(`Visual regionId "${visual.regionId}" has no published-region record.`);
    for (const meshName of [...visual.meshNames, ...visual.hitMeshNames]) {
      if (!meshes.has(meshName))
        errors.push(`Visual region "${visual.regionId}" references missing mesh "${meshName}".`);
    }
  }
  return errors;
}
