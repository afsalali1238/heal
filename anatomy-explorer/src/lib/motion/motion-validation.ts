import type { MotionAsset } from './motion-registry';

export function validateMotionAssets(assets: readonly MotionAsset[]): string[] {
  const errors: string[] = [];
  const exerciseIds = new Set<string>();
  for (const asset of assets) {
    if (exerciseIds.has(asset.exerciseId))
      errors.push(`Duplicate motion exerciseId "${asset.exerciseId}".`);
    exerciseIds.add(asset.exerciseId);
    if (!asset.motionPath.startsWith('/') || !asset.posterPath.startsWith('/'))
      errors.push(`Motion "${asset.exerciseId}" must use absolute public paths.`);
    if (asset.durationSeconds <= 0 || asset.durationSeconds > 10)
      errors.push(`Motion "${asset.exerciseId}" duration must be between 0 and 10 seconds.`);
    if (!asset.sourceUrl || !asset.license || !asset.attribution)
      errors.push(`Motion "${asset.exerciseId}" is missing provenance metadata.`);
    if (asset.status === 'prototype') {
      if (!asset.motionPath.includes('/prototypes/') || !asset.posterPath.includes('/prototypes/'))
        errors.push(`Prototype motion "${asset.exerciseId}" must remain under /prototypes/.`);
      if (!asset.replacementRequired)
        errors.push(`Prototype motion "${asset.exerciseId}" must require replacement.`);
      if (asset.reviewedBy || asset.reviewedDate)
        errors.push(`Prototype motion "${asset.exerciseId}" must not contain approval metadata.`);
    }
    if (
      asset.status === 'approved' &&
      (!asset.reviewedBy || !/^\d{4}-\d{2}-\d{2}$/.test(asset.reviewedDate))
    ) {
      errors.push(`Approved motion "${asset.exerciseId}" lacks genuine review metadata.`);
    }
  }
  return errors;
}
