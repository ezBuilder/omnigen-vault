// Backfill the images.tags column from taxonomy fields so full-text search
// (images_fts indexes `tags`) gets richer signal for free. Idempotent: only
// touches active rows whose tags are NULL or an empty/'[]' value.
import { openVault } from './storage/db.js';
import { slug } from './storage/paths.js';

/**
 * First comma-separated token of a taxonomy field, slugified to a stable tag.
 * @param {*} s
 * @returns {string} slug (possibly empty)
 */
function head(s) {
  return slug(String(s).split(',')[0], 32);
}

/**
 * Enrich tags for every active image lacking them.
 * @param {object} config resolved config (uses config.dbPath)
 * @param {{ log?: (msg: string) => void }} [opts]
 * @returns {{ updated: number, scanned: number }}
 */
export function retagVault(config, { log = () => {} } = {}) {
  const v = openVault(config.dbPath);
  let updated = 0;
  let scanned = 0;
  try {
    // NULL, '', or '[]' (empty JSON array) all count as "no tags yet".
    const rows = v.db
      .prepare(
        `SELECT id, category, style, mood, palette, lighting
         FROM images
         WHERE status = 'active'
           AND (tags IS NULL OR tags = '' OR tags = '[]')`
      )
      .all();

    const update = v.db.prepare('UPDATE images SET tags = ? WHERE id = ?');

    for (const row of rows) {
      scanned += 1;
      const tags = [
        row.category,
        head(row.style),
        head(row.mood),
        head(row.palette),
        head(row.lighting)
      ].filter(Boolean);
      if (!tags.length) continue;
      update.run(JSON.stringify(tags), row.id);
      updated += 1;
    }

    log(`retag: updated ${updated}/${scanned} image(s)`);
    return { updated, scanned };
  } finally {
    v.close();
  }
}
