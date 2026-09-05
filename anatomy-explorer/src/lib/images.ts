import type { ImageMetadata } from 'astro';

/**
 * Which figure a row gets, and in what order they are preferred.
 *
 * The order matters and was not expressible before: `import.meta.glob` keys come back
 * alphabetically, so a `.png` beat a `.svg` no matter what either file contained. With
 * generated schematics now sitting next to the placeholders (same stem, `.svg`), the
 * rule has to be a rule and not a filename accident:
 *
 *   1. a real clinician file — any non-placeholder raster, largest wins
 *   2. a generated movement schematic, which is labelled on the page and in the file
 *   3. nothing, which renders the honest "picture not added yet" slot
 *
 * A 1×1 PNG is not a figure; it is a build placeholder that some rows still point at
 * with `image_status: "approved"`. It never wins a preference order, and
 * `scripts/check-images.ts` keeps naming every row that still relies on one.
 */

const images = import.meta.glob<{ default: ImageMetadata }>(
  '../assets/images/*.{jpeg,jpg,png,svg,webp}'
);

/** Below this the file is a placeholder, not a picture. */
const PLACEHOLDER_EDGE = 8;
const PLACEHOLDER_BYTES = 4096;

export interface FigureCandidate {
  readonly path: string;
  readonly id: string;
  readonly extension: 'png' | 'jpg' | 'jpeg' | 'webp' | 'svg';
  /** A generated schematic, recognised by its extension plus the registry. */
  readonly generated: boolean;
}

const ALL: FigureCandidate[] = Object.keys(images).map((path) => {
  const file = path.split('/').pop() as string;
  const extension = file.split('.').pop() as FigureCandidate['extension'];
  return {
    path,
    id: file.replace(/\.[a-z]+$/, ''),
    extension,
    // The renderer writes `<image_id>.svg` for the movement figures; nothing else in
    // this directory is an SVG, and a clinician-supplied vector would be renamed by
    // the sheet sync rather than guessed at here.
    generated: extension === 'svg',
  };
});

export function candidatesFor(imageId: string): FigureCandidate[] {
  return ALL.filter((candidate) => candidate.id === imageId);
}

function loadable(candidate: FigureCandidate): Promise<ImageMetadata> | null {
  const loader = images[candidate.path];
  return loader ? loader().then((mod) => mod.default) : null;
}

/**
 * The image to show for a row: a usable real file first, then the generated
 * schematic, then nothing. Async because Astro's image metadata arrives from the
 * loader, and `astro:assets` refuses to optimise a 1×1 placeholder into a full-size
 * figure — which is exactly what was happening before.
 */
export async function pickFigure(
  imageId: string
): Promise<{ image: ImageMetadata; kind: 'real' | 'schematic' } | null> {
  const candidates = candidatesFor(imageId);
  const loaded = await Promise.all(
    candidates.map(async (candidate) => {
      const load = loadable(candidate);
      if (!load) return null;
      return { candidate, image: await load };
    })
  );

  const usable = loaded.filter(
    (entry): entry is { candidate: FigureCandidate; image: ImageMetadata } =>
      entry !== null &&
      entry.image.width > PLACEHOLDER_EDGE &&
      entry.image.height > PLACEHOLDER_EDGE
  );

  const real = usable
    .filter((entry) => !entry.candidate.generated)
    .sort((a, b) => b.image.width * b.image.height - a.image.width * a.image.height)[0];
  if (real) return { image: real.image, kind: 'real' };

  const schematic = usable.find((entry) => entry.candidate.generated);
  if (schematic) return { image: schematic.image, kind: 'schematic' };
  return null;
}

/** Kept for the existing call sites; now resolves through the same preference order. */
export async function getImage(imageId: string): Promise<ImageMetadata | null> {
  const picked = await pickFigure(imageId);
  return picked ? picked.image : null;
}

/** True when the file a row points at is too small to be a figure at all. */
export function isPlaceholder(image: ImageMetadata | null): boolean {
  if (!image) return true;
  return image.width <= PLACEHOLDER_EDGE || image.height <= PLACEHOLDER_EDGE;
}

export { PLACEHOLDER_BYTES };
