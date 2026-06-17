// Disk layout: images live under <imagesDir>/<category>/<bucket>/<file>.png —
// grouped by type (category) first, then by resolution tier (bucket).
import path from 'node:path';

// Unicode-aware slug: keeps letters/numbers from any language (so Korean/other
// theme words still produce valid folder + file names), collapses the rest to '-'.
export function slug(text, max = 48) {
  return String(text)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, max)
    .replace(/-+$/g, '');
}

export function categoryDir(imagesDir, category, bucket) {
  return bucket ? path.join(imagesDir, category, bucket) : path.join(imagesDir, category);
}

/**
 * Build a stable, human-readable filename for a generated image.
 * @param {{ subject: string, sizeLabel: string }} parts
 * @param {string} sha256 hex digest
 */
export function imageFilename({ subject, sizeLabel }, sha256) {
  const short = sha256.slice(0, 12);
  return `${slug(subject)}__${sizeLabel}__${short}.png`;
}

export function imagePath(imagesDir, spec, bucket, sizeLabel, sha256) {
  return path.join(
    categoryDir(imagesDir, spec.category, bucket),
    imageFilename({ subject: spec.subject, sizeLabel }, sha256)
  );
}
