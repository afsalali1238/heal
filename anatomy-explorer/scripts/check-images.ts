import fs from 'fs';
import path from 'path';

/**
 * Image gate for the published library (M05).
 *
 * Two facts have to hold before an item reaches a patient, and only one of them
 * used to be checked: the file must exist, and the file must be a picture. It is
 * possible to satisfy the first with a 68-byte 1×1 PNG — which is exactly what
 * `src/assets/images` was full of, on rows whose `image_status` said `approved`.
 * The card then showed an empty frame and every gate in the repo stayed green,
 * because "approved" and "present" were treated as the same claim. They are not.
 *
 * So stubs are detected here. By default that is a loud warning, because the fix
 * is a clinician attaching the real figure, not a code change; set
 * `IMAGES_STRICT=1` (the same pattern as `COMPLIANCE_STRICT`) and it fails the
 * build, which is what CI on a release branch should run.
 */
const imagesDir = path.join(process.cwd(), 'src', 'assets', 'images');
const itemsFile = path.join(process.cwd(), 'src', 'data', 'items.json');
const STRICT = process.env.IMAGES_STRICT === '1';
/** Smallest edge a real figure can have. Anything under this is a stub. */
const MIN_EDGE = 8;

/** Read PNG/JPEG/WebP dimensions from the header — no image library needed. */
function dimensionsOf(file: string): { width: number; height: number } | null {
  const buf = fs.readFileSync(file);
  if (
    buf.length > 24 &&
    buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }
  if (buf.length > 32 && buf.subarray(0, 3).toString('latin1') === '\xff\xd8\xff') {
    let i = 2;
    while (i + 9 < buf.length) {
      if (buf[i] !== 0xff) {
        i += 1;
        continue;
      }
      const marker = buf[i + 1];
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
      }
      i += 2 + buf.readUInt16BE(i + 2);
    }
    return null;
  }
  if (
    buf.length > 30 &&
    buf.subarray(0, 4).toString('latin1') === 'RIFF' &&
    buf.subarray(8, 12).toString('latin1') === 'WEBP'
  ) {
    const format = buf.subarray(12, 16).toString('latin1');
    if (format === 'VP8X' && buf.length > 30) {
      return { width: 1 + buf.readUIntLE(24, 3), height: 1 + buf.readUIntLE(27, 3) };
    }
    if (format === 'VP8L' && buf.length > 25) {
      const bits = buf.readUInt32LE(21);
      return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
    }
    if (format === 'VP8 ' && buf.length > 30) {
      return { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff };
    }
  }
  return null;
}

function main() {
  let items = [];
  try {
    items = JSON.parse(fs.readFileSync(itemsFile, 'utf8'));
  } catch (e) {
    console.error('ERROR: src/data/items.json is missing or invalid.');
    process.exit(1);
  }

  let files = [];
  try {
    files = fs.readdirSync(imagesDir).map((f) => path.basename(f, path.extname(f)));
  } catch (e) {
    console.error('ERROR: src/assets/images does not exist or is missing required directories.');
    process.exit(1);
  }

  const publishedItems = items.filter((i) => i.status === 'published');

  const unapproved = publishedItems.filter((i) => i.image_status !== 'approved');
  if (unapproved.length > 0) {
    console.error(
      `ERROR: Published items with unapproved media (image_status must be 'approved'): ${unapproved.map((i) => i.id).join(', ')}`
    );
    process.exit(1);
  }

  const requiredImages = new Set(publishedItems.map((i) => i.image_id).filter(Boolean));
  const availableImages = new Set(files);

  const missing = [...requiredImages].filter((x) => !availableImages.has(x));

  /**
   * "Orphan" used to mean "no published item points at this file", which lumped
   * together two opposite situations: a figure drafted for an item that is still
   * in review (that is work in progress, and it should be visible), and a file
   * nothing references at all (that is debris, and it should be deleted or
   * linked). They are now reported apart, because the action is different.
   */
  const queuedImages = new Set(
    items
      .filter((i) => i.status !== 'published')
      .map((i: any) => i.image_id)
      .filter(Boolean)
  );
  const orphans = [...availableImages].filter(
    (x) => !requiredImages.has(x) && !queuedImages.has(x)
  );
  const queued = [...queuedImages].filter(
    (x: string) => availableImages.has(x) && !requiredImages.has(x)
  );

  // ── Published rows claiming an approved image that is a stub ─────────────
  const stubs: string[] = [];
  const unreadable: string[] = [];
  for (const imageId of requiredImages) {
    const file = fs
      .readdirSync(imagesDir)
      .find((f) => path.basename(f, path.extname(f)) === imageId);
    if (!file) continue;
    const dims = dimensionsOf(path.join(imagesDir, file));
    if (!dims) {
      unreadable.push(imageId);
      continue;
    }
    if (dims.width < MIN_EDGE || dims.height < MIN_EDGE) {
      stubs.push(`${imageId} (${dims.width}×${dims.height})`);
    }
  }

  /**
   * Two more ways an "approved" image is not finished, both of them live on this
   * project's own published rows right now.
   *
   * **Alt text that talks about being written.** `validate.ts` sets a floor on alt
   * length (`alt-text-too-thin`), because a patient who cannot see the figure has to
   * be able to do the exercise from the description alone. A length floor with no
   * check on what the text *is* can be satisfied by padding, and on 16 published
   * rows it was: the alt ends "This is an extended description to satisfy the
   * accessibility minimum length requirement." A screen reader reads that to a
   * patient in place of the position. The durable fix is a rule in `compliance.ts`
   * — not mine to add, since that file is the clinical contract — so it is named here.
   *
   * **Weight.** 1×1 stubs are the visible failure; 396 KB for one figure is the
   * invisible one, and the same file was generated to be replaced. This is a warning
   * even under `IMAGES_STRICT`, because a real photograph can legitimately be that
   * size — a person decides, the number just has to be on the table.
   */
  const SCAFFOLD_ALT =
    /minimum length|to satisfy|placeholder|lorem|dummy|test fixture|sample text|extended description|\bTBD\b|\bTODO\b/i;
  const MAX_IMAGE_BYTES = 250_000;

  const scaffolded: string[] = [];
  const heavy: string[] = [];
  let publishedImageBytes = 0;
  for (const item of publishedItems) {
    const alt = String(item.image_alt_en ?? '');
    if (alt && SCAFFOLD_ALT.test(alt)) {
      scaffolded.push(`${item.id}: "${alt.slice(0, 78).trimEnd()}${alt.length > 78 ? '…' : ''}"`);
    }
    const imageId = item.image_id;
    if (!imageId) continue;
    const file = fs
      .readdirSync(imagesDir)
      .find((f) => path.basename(f, path.extname(f)) === imageId);
    if (!file) continue;
    const bytes = fs.statSync(path.join(imagesDir, file)).size;
    publishedImageBytes += bytes;
    if (bytes > MAX_IMAGE_BYTES) {
      heavy.push(`${imageId} (${(bytes / 1024).toFixed(0)} KB)`);
    }
  }

  console.log('--- Image Check Report ---');
  if (queued.length > 0) {
    console.log(
      `  ${queued.length} figure(s) on disk for drafted items, waiting on clinical review: ${queued.join(', ')}`
    );
  }
  if (stubs.length > 0) {
    const lines = stubs.map((s) => `    - ${s}`).join('\n');
    const message =
      `${stubs.length} published item image(s) are ${MIN_EDGE}px stubs or smaller — a placeholder, not a figure:\n${lines}\n` +
      `    Their rows say image_status: approved. The card now shows a derived schematic instead\n` +
      `    (lib/images.ts prefers it over the stub), so nothing looks broken to a patient — what\n` +
      `    is missing is the photograph, and every other gate stays green on the stub.\n` +
      `    Fix by attaching the real figure, or by setting image_status back to pending until one exists.`;
    if (STRICT) {
      console.error(`ERROR: ${message}`);
      process.exit(1);
    }
    console.warn(`WARNING (launch blocker; set IMAGES_STRICT=1 to fail the build): ${message}`);
  }
  if (unreadable.length > 0) {
    console.warn(`WARNING: image dimensions could not be read for: ${unreadable.join(', ')}`);
  }
  if (scaffolded.length > 0) {
    const lines = scaffolded.map((x) => `    - ${x}`).join('\n');
    const message =
      `${scaffolded.length} published row(s) have alt text that describes its own\n` +
      `    authoring instead of the picture, which a screen reader reads aloud to a patient:\n${lines}\n` +
      `    Replace the padding with one sentence naming the position and the joint that should feel it.`;
    if (STRICT) {
      console.error(`ERROR: ${message}`);
      process.exit(1);
    }
    console.warn(`WARNING (launch blocker; set IMAGES_STRICT=1 to fail the build): ${message}`);
  }
  if (heavy.length > 0) {
    console.warn(
      `WARNING: ${heavy.length} figure(s) over ${(MAX_IMAGE_BYTES / 1024).toFixed(0)} KB on published pages: ${heavy.join(', ')}\n` +
        `    Published item figures weigh ${(publishedImageBytes / 1024).toFixed(0)} KB in total, against a\n` +
        `    ~2 KB geometry-derived SVG. Warning by design: a real photo can be this size; a generated\n` +
        `    stand-in that was meant to be replaced is not.`
    );
  }
  if (
    missing.length === 0 &&
    orphans.length === 0 &&
    stubs.length === 0 &&
    scaffolded.length === 0
  ) {
    console.log('All good. No missing or orphan images.');
  } else {
    if (missing.length > 0) {
      console.error(`ERROR: Missing image files for published items: ${missing.join(', ')}`);
      process.exit(1);
    }
    if (orphans.length > 0) {
      console.warn(`WARNING: Orphan images (no item referencing them): ${orphans.join(', ')}`);
    }
  }
}

main();
