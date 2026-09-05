import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

export type LedgerStatus = 'prototype' | 'draft' | 'approved' | 'retired';

export interface MediaLedgerEntry {
  readonly assetId: string;
  readonly path: string;
  readonly kind:
    | 'anatomy-model'
    | 'exercise-poster'
    | 'exercise-preview'
    | 'exercise-motion'
    /** Share cards and app icons: generated chrome, no clinical content in them. */
    | 'share-card';
  readonly status: LedgerStatus;
  readonly sourceUrl: string;
  readonly generationMethod:
    'original' | 'generator' | 'adapted' | 'temporary-third-party' | 'manual';
  readonly license: string;
  readonly attribution: string;
  readonly fileHash: string;
  readonly bytes: number;
  readonly replacementRequired: boolean;
  readonly referenceSources: readonly string[];
  readonly reviewedBy: string;
  readonly reviewedDate: string;
  readonly notes: string;
}

const sha256 = (file: string) => createHash('sha256').update(fs.readFileSync(file)).digest('hex');

/** Build-time provenance ledger. Prototype media is never a patient publication input. */
export const MEDIA_LEDGER: readonly MediaLedgerEntry[] = [
  {
    assetId: 'fallback-body-map-2d',
    path: '/anatomy/fallback-body-map.svg',
    kind: 'anatomy-model',
    status: 'draft',
    sourceUrl: 'Original code-native fallback derived from the shared body geometry',
    generationMethod: 'original',
    license: 'Internal Web Distribution License',
    attribution: 'Anatomy Explorer Anatomy Team',
    fileHash: '3456cce3f8127b0e3ed8f9dad1adceabe52a01449c1e7f3ce0f6fa53583cf9b6',
    bytes: 984,
    replacementRequired: true,
    referenceSources: [],
    reviewedBy: '',
    reviewedDate: '',
    notes: 'Accessible fallback; clinician visual review pending.',
  },
  {
    assetId: 'locator-fullbody-3d',
    path: '/anatomy/models/human-body-locator-optimized.glb',
    kind: 'anatomy-model',
    status: 'prototype',
    sourceUrl: 'Deterministic simplified anatomical capsule mesh',
    generationMethod: 'original',
    license: 'Internal Web Distribution License',
    attribution: 'Anatomy Explorer 3D Geometry Project',
    fileHash: '50a5f28e74c15908e47935eb318e7ba5bb4e131d56fac3340a3d73fc7f1185f8',
    bytes: 66180,
    replacementRequired: true,
    referenceSources: [],
    reviewedBy: '',
    reviewedDate: '',
    notes: 'Temporary locator blockout; clinician visual review pending.',
  },
  {
    assetId: 'ex-neck-02-storyboard-start',
    path: '/exercise-media/prototypes/ex-neck-02/storyboard_ex_neck_02_start_1787812497376.jpg',
    kind: 'exercise-poster',
    status: 'prototype',
    sourceUrl: 'Internal storyboard prototype',
    generationMethod: 'generator',
    license: 'Internal prototype only',
    attribution: 'Anatomy Explorer prototype production',
    fileHash: 'ee7ece50045a4da61448c9a49e841fb7b9997672e7fabefc9416e7531ef53b78',
    bytes: 155195,
    replacementRequired: true,
    referenceSources: [],
    reviewedBy: '',
    reviewedDate: '',
    notes: 'Storyboard reference; not a patient media asset.',
  },
  {
    assetId: 'ex-neck-02-storyboard-middle',
    path: '/exercise-media/prototypes/ex-neck-02/storyboard_ex_neck_02_middle_1787812509099.jpg',
    kind: 'exercise-poster',
    status: 'prototype',
    sourceUrl: 'Internal storyboard prototype',
    generationMethod: 'generator',
    license: 'Internal prototype only',
    attribution: 'Anatomy Explorer prototype production',
    fileHash: 'fa9621c4a6722243fa54d92b53c0ce6ec07bbe8d2885bdb0d833f401853b86a6',
    bytes: 152356,
    replacementRequired: true,
    referenceSources: [],
    reviewedBy: '',
    reviewedDate: '',
    notes: 'Storyboard reference; not a patient media asset.',
  },
  {
    assetId: 'ex-neck-02-storyboard-end',
    path: '/exercise-media/prototypes/ex-neck-02/storyboard_ex_neck_02_end_1787812520687.jpg',
    kind: 'exercise-poster',
    status: 'prototype',
    sourceUrl: 'Internal storyboard prototype',
    generationMethod: 'generator',
    license: 'Internal prototype only',
    attribution: 'Anatomy Explorer prototype production',
    fileHash: 'f85151113f2cf114d0b3ba0142b76652898dfcae3ca59cea6a544639402f66d7',
    bytes: 188744,
    replacementRequired: true,
    referenceSources: [],
    reviewedBy: '',
    reviewedDate: '',
    notes: 'Storyboard reference; not a patient media asset.',
  },
  {
    assetId: 'ex-neck-02-motion',
    path: '/exercise-media/prototypes/ex-neck-02/ex-neck-02-motion.mp4',
    kind: 'exercise-motion',
    status: 'prototype',
    sourceUrl: 'Deterministic pose interpolation from the internal joint-angle figure',
    generationMethod: 'manual',
    license: 'Internal prototype only',
    attribution: 'Anatomy Explorer prototype production',
    fileHash: '6414de80a073ec08f9a63548abadcae82881ccef18721310ccd4c48687da5dec',
    bytes: 18691,
    replacementRequired: true,
    referenceSources: [],
    reviewedBy: '',
    reviewedDate: '',
    notes: 'Internal movement-fidelity review only.',
  },
  {
    assetId: 'ex-neck-02-poster',
    path: '/exercise-media/prototypes/ex-neck-02/ex-neck-02-poster.png',
    kind: 'exercise-poster',
    status: 'prototype',
    sourceUrl: 'Frame rendered from the deterministic prototype motion',
    generationMethod: 'manual',
    license: 'Internal prototype only',
    attribution: 'Anatomy Explorer prototype production',
    fileHash: '313a385a71482a142a1900a5d45dce195fac3c51503839e2fc3e7d5ac8376fb9',
    bytes: 10376,
    replacementRequired: true,
    referenceSources: [],
    reviewedBy: '',
    reviewedDate: '',
    notes: 'Poster-first fallback for internal review only.',
  },
  /**
   * Generated share cards and app icons — `npm run images:render`.
   *
   * Not clinical imagery: they carry an area name and a body figure, never an
   * instruction. They are still `draft` with `replacementRequired` because the
   * sentence printed on a link preview is wording a human has to bless, and the
   * ledger is where that is recorded (ASSET-PIPELINE.md).
   */
  {
    assetId: 'share_default',
    path: '/social/default.png',
    kind: 'share-card',
    status: 'draft',
    sourceUrl:
      'Generated from src/lib/anatomy/figures.ts by scripts/render-share-images.ts at 1200px',
    generationMethod: 'generator',
    license: 'Internal Web Distribution License',
    attribution: 'Anatomy Explorer figure generator',
    fileHash: 'c38793ed776a53d3c7b34017a23ed9a276272835a1d1da9711d131415da4801f',
    bytes: 42763,
    replacementRequired: true,
    referenceSources: [],
    reviewedBy: '',
    reviewedDate: '',
    notes:
      'Share card / app icon. Not clinical imagery; the wording it shows still needs a human sign-off.',
  },
  {
    assetId: 'share_area_ankle',
    path: '/social/area-ankle.png',
    kind: 'share-card',
    status: 'draft',
    sourceUrl:
      'Generated from src/lib/anatomy/figures.ts by scripts/render-share-images.ts at 1200px',
    generationMethod: 'generator',
    license: 'Internal Web Distribution License',
    attribution: 'Anatomy Explorer figure generator',
    fileHash: '1df512b6ec6d486839c00b217b6232af73d05e46687bfef27a5104129366566b',
    bytes: 41798,
    replacementRequired: true,
    referenceSources: [],
    reviewedBy: '',
    reviewedDate: '',
    notes:
      'Share card / app icon. Not clinical imagery; the wording it shows still needs a human sign-off.',
  },
  {
    assetId: 'share_area_elbow',
    path: '/social/area-elbow.png',
    kind: 'share-card',
    status: 'draft',
    sourceUrl:
      'Generated from src/lib/anatomy/figures.ts by scripts/render-share-images.ts at 1200px',
    generationMethod: 'generator',
    license: 'Internal Web Distribution License',
    attribution: 'Anatomy Explorer figure generator',
    fileHash: 'd2d7d14a2965ba7f0c1662b38915fc1ee2fd5779cec008249e95d76f65db583a',
    bytes: 43216,
    replacementRequired: true,
    referenceSources: [],
    reviewedBy: '',
    reviewedDate: '',
    notes:
      'Share card / app icon. Not clinical imagery; the wording it shows still needs a human sign-off.',
  },
  {
    assetId: 'share_area_hip',
    path: '/social/area-hip.png',
    kind: 'share-card',
    status: 'draft',
    sourceUrl:
      'Generated from src/lib/anatomy/figures.ts by scripts/render-share-images.ts at 1200px',
    generationMethod: 'generator',
    license: 'Internal Web Distribution License',
    attribution: 'Anatomy Explorer figure generator',
    fileHash: '10f3eb12cb05dd7f1ff6f739101d3e7b2df3a4eb1f77c12b021f689e2ed41a2b',
    bytes: 40361,
    replacementRequired: true,
    referenceSources: [],
    reviewedBy: '',
    reviewedDate: '',
    notes:
      'Share card / app icon. Not clinical imagery; the wording it shows still needs a human sign-off.',
  },
  {
    assetId: 'share_area_knee',
    path: '/social/area-knee.png',
    kind: 'share-card',
    status: 'draft',
    sourceUrl:
      'Generated from src/lib/anatomy/figures.ts by scripts/render-share-images.ts at 1200px',
    generationMethod: 'generator',
    license: 'Internal Web Distribution License',
    attribution: 'Anatomy Explorer figure generator',
    fileHash: 'ab6a0b147c76a53784e3dddb2a52a73dfb062fdcd5c7aef6f898ec27912516c5',
    bytes: 41280,
    replacementRequired: true,
    referenceSources: [],
    reviewedBy: '',
    reviewedDate: '',
    notes:
      'Share card / app icon. Not clinical imagery; the wording it shows still needs a human sign-off.',
  },
  {
    assetId: 'share_area_lower_back',
    path: '/social/area-lower-back.png',
    kind: 'share-card',
    status: 'draft',
    sourceUrl:
      'Generated from src/lib/anatomy/figures.ts by scripts/render-share-images.ts at 1200px',
    generationMethod: 'generator',
    license: 'Internal Web Distribution License',
    attribution: 'Anatomy Explorer figure generator',
    fileHash: '5fb7f98bd062cadc53a816f4f977e54dcc38a4fa238f34b7dfbdf9da54c9233b',
    bytes: 46398,
    replacementRequired: true,
    referenceSources: [],
    reviewedBy: '',
    reviewedDate: '',
    notes:
      'Share card / app icon. Not clinical imagery; the wording it shows still needs a human sign-off.',
  },
  {
    assetId: 'share_area_neck',
    path: '/social/area-neck.png',
    kind: 'share-card',
    status: 'draft',
    sourceUrl:
      'Generated from src/lib/anatomy/figures.ts by scripts/render-share-images.ts at 1200px',
    generationMethod: 'generator',
    license: 'Internal Web Distribution License',
    attribution: 'Anatomy Explorer figure generator',
    fileHash: '953cdc76863bb32716a0b8c61b5650125a026f0794bca11df9ddc89753f35792',
    bytes: 41218,
    replacementRequired: true,
    referenceSources: [],
    reviewedBy: '',
    reviewedDate: '',
    notes:
      'Share card / app icon. Not clinical imagery; the wording it shows still needs a human sign-off.',
  },
  {
    assetId: 'share_area_shoulder',
    path: '/social/area-shoulder.png',
    kind: 'share-card',
    status: 'draft',
    sourceUrl:
      'Generated from src/lib/anatomy/figures.ts by scripts/render-share-images.ts at 1200px',
    generationMethod: 'generator',
    license: 'Internal Web Distribution License',
    attribution: 'Anatomy Explorer figure generator',
    fileHash: '4c226b2e089d8df2e393247602f3adf8f5cc79a2e08f758968c0d603ca91ccad',
    bytes: 45414,
    replacementRequired: true,
    referenceSources: [],
    reviewedBy: '',
    reviewedDate: '',
    notes:
      'Share card / app icon. Not clinical imagery; the wording it shows still needs a human sign-off.',
  },
  {
    assetId: 'share_area_wrist',
    path: '/social/area-wrist.png',
    kind: 'share-card',
    status: 'draft',
    sourceUrl:
      'Generated from src/lib/anatomy/figures.ts by scripts/render-share-images.ts at 1200px',
    generationMethod: 'generator',
    license: 'Internal Web Distribution License',
    attribution: 'Anatomy Explorer figure generator',
    fileHash: 'c17c093183f0c48485bdf0e396c82bea46a6dff5f5c275bd1c27ebaab1a02c58',
    bytes: 42448,
    replacementRequired: true,
    referenceSources: [],
    reviewedBy: '',
    reviewedDate: '',
    notes:
      'Share card / app icon. Not clinical imagery; the wording it shows still needs a human sign-off.',
  },
  {
    assetId: 'icon_512',
    path: '/icons/icon-512.png',
    kind: 'share-card',
    status: 'draft',
    sourceUrl:
      'Generated from src/lib/anatomy/figures.ts by scripts/render-share-images.ts at 512px',
    generationMethod: 'generator',
    license: 'Internal Web Distribution License',
    attribution: 'Anatomy Explorer figure generator',
    fileHash: '0b3a631876ba0892b56d89a150e34244b2b9405b1f7f7ab23ca7131b03a6cfac',
    bytes: 13305,
    replacementRequired: true,
    referenceSources: [],
    reviewedBy: '',
    reviewedDate: '',
    notes:
      'Share card / app icon. Not clinical imagery; the wording it shows still needs a human sign-off.',
  },
  {
    assetId: 'icon_192',
    path: '/icons/icon-192.png',
    kind: 'share-card',
    status: 'draft',
    sourceUrl:
      'Generated from src/lib/anatomy/figures.ts by scripts/render-share-images.ts at 192px',
    generationMethod: 'generator',
    license: 'Internal Web Distribution License',
    attribution: 'Anatomy Explorer figure generator',
    fileHash: '86d8c830c7d3a10516e08bc4366cecfce7494f1cd36075d92f42ea41a7d11c96',
    bytes: 4572,
    replacementRequired: true,
    referenceSources: [],
    reviewedBy: '',
    reviewedDate: '',
    notes:
      'Share card / app icon. Not clinical imagery; the wording it shows still needs a human sign-off.',
  },
  {
    assetId: 'icon_maskable_512',
    path: '/icons/maskable-512.png',
    kind: 'share-card',
    status: 'draft',
    sourceUrl:
      'Generated from src/lib/anatomy/figures.ts by scripts/render-share-images.ts at 512px',
    generationMethod: 'generator',
    license: 'Internal Web Distribution License',
    attribution: 'Anatomy Explorer figure generator',
    fileHash: '5d09d2b73f4dfbbab19e0b4353fb2e769ee69bd2f649f5073488b792166267a0',
    bytes: 8388,
    replacementRequired: true,
    referenceSources: [],
    reviewedBy: '',
    reviewedDate: '',
    notes:
      'Share card / app icon. Not clinical imagery; the wording it shows still needs a human sign-off.',
  },
  {
    assetId: 'icon_apple_touch',
    path: '/icons/apple-touch-icon.png',
    kind: 'share-card',
    status: 'draft',
    sourceUrl:
      'Generated from src/lib/anatomy/figures.ts by scripts/render-share-images.ts at 180px',
    generationMethod: 'generator',
    license: 'Internal Web Distribution License',
    attribution: 'Anatomy Explorer figure generator',
    fileHash: 'e48de60306868d22b78b277b23c9da897fae5778f9759d64844adf402eb722b9',
    bytes: 4320,
    replacementRequired: true,
    referenceSources: [],
    reviewedBy: '',
    reviewedDate: '',
    notes:
      'Share card / app icon. Not clinical imagery; the wording it shows still needs a human sign-off.',
  },
  {
    assetId: 'favicon_32',
    path: '/favicon-32.png',
    kind: 'share-card',
    status: 'draft',
    sourceUrl:
      'Generated from src/lib/anatomy/figures.ts by scripts/render-share-images.ts at 32px',
    generationMethod: 'generator',
    license: 'Internal Web Distribution License',
    attribution: 'Anatomy Explorer figure generator',
    fileHash: '457a061ba6da6cead8bd44caae4867858afdbc93a99b942ce63518865a54868e',
    bytes: 899,
    replacementRequired: true,
    referenceSources: [],
    reviewedBy: '',
    reviewedDate: '',
    notes:
      'Share card / app icon. Not clinical imagery; the wording it shows still needs a human sign-off.',
  },
  {
    assetId: 'favicon_16',
    path: '/favicon-16.png',
    kind: 'share-card',
    status: 'draft',
    sourceUrl:
      'Generated from src/lib/anatomy/figures.ts by scripts/render-share-images.ts at 16px',
    generationMethod: 'generator',
    license: 'Internal Web Distribution License',
    attribution: 'Anatomy Explorer figure generator',
    fileHash: '1d16f594b206e9495e00f53d7d5212e2a4a2e52fa3c8d66c362a28abdd2ccb58',
    bytes: 520,
    replacementRequired: true,
    referenceSources: [],
    reviewedBy: '',
    reviewedDate: '',
    notes:
      'Share card / app icon. Not clinical imagery; the wording it shows still needs a human sign-off.',
  },
  {
    assetId: 'illustration-home-hero',
    path: '/anatomy/illustrations/home-hero.webp',
    kind: 'share-card',
    status: 'draft',
    sourceUrl:
      'Generated with a text-to-image model on 2026-09-05; prompt recorded in docs/IMPROVEMENTS-2026-09-05.md',
    generationMethod: 'generator',
    license:
      'Generated artwork — provenance not independently verified; replace before any clinical use',
    attribution: 'Text-to-image model, prompted by the Anatomy Explorer build agent',
    fileHash: '03ca1213689b5b8f2e39692074a2e4573994fb0ab7edbda43c45c118eb7f5161',
    bytes: 6844,
    replacementRequired: true,
    referenceSources: [],
    reviewedBy: '',
    reviewedDate: '',
    notes:
      'Decorative home-page illustration. Shows no technique, so it cannot contradict an instruction, but it has not been looked at by a clinician.',
  },
  {
    assetId: 'illustration-clinic-handoff',
    path: '/anatomy/illustrations/clinic-handoff.webp',
    kind: 'share-card',
    status: 'draft',
    sourceUrl:
      'Generated with a text-to-image model on 2026-09-05; prompt recorded in docs/IMPROVEMENTS-2026-09-05.md',
    generationMethod: 'generator',
    license:
      'Generated artwork — provenance not independently verified; replace before any clinical use',
    attribution: 'Text-to-image model, prompted by the Anatomy Explorer build agent',
    fileHash: '4cfc02e209c25c4b6f954ce0dfd778fa8f7bea5c5462d85a69940ed5f52e9b8c',
    bytes: 17278,
    replacementRequired: true,
    referenceSources: [],
    reviewedBy: '',
    reviewedDate: '',
    notes:
      'Decorative illustration on the clinic hand-off screen. The printed handout itself is generated from live content; this is scene-setting only.',
  },
];

export function auditMediaLedger(entries: readonly MediaLedgerEntry[], baseDir: string): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  for (const entry of entries) {
    if (ids.has(entry.assetId)) errors.push(`Duplicate ledger assetId "${entry.assetId}".`);
    ids.add(entry.assetId);
    if (!entry.sourceUrl || !entry.license || !entry.attribution)
      errors.push(`Asset "${entry.assetId}" is missing provenance metadata.`);
    if (entry.status !== 'approved' && !entry.replacementRequired)
      errors.push(`Asset "${entry.assetId}" must require replacement while ${entry.status}.`);
    if (
      entry.status === 'approved' &&
      (!entry.reviewedBy || !/^\d{4}-\d{2}-\d{2}$/.test(entry.reviewedDate))
    )
      errors.push(`Approved asset "${entry.assetId}" lacks genuine review metadata.`);
    const file = path.join(baseDir, 'public', ...entry.path.replace(/^\//, '').split('/'));
    if (!fs.existsSync(file)) {
      errors.push(`Asset "${entry.assetId}" is missing at "${entry.path}".`);
      continue;
    }
    const stat = fs.statSync(file);
    if (stat.size !== entry.bytes && entry.bytes !== 0)
      errors.push(
        `Asset "${entry.assetId}" bytes changed (ledger ${entry.bytes}, actual ${stat.size}).`
      );
    if (entry.fileHash && sha256(file) !== entry.fileHash)
      errors.push(`Asset "${entry.assetId}" hash changed from the ledger.`);
  }
  return errors;
}
