// AI-facing retrieval: find images in the vault and return ready-to-use paths.
import fs from 'node:fs';

import { openVault } from './storage/db.js';
import { localizeFields } from './storage/localize.js';

// Visual orientation from actual pixels (bucket fallback for legacy rows).
function orientationOf(r) {
  const w = r.width || 0;
  const h = r.height || 0;
  if (w && h) return w > h ? 'landscape' : h > w ? 'portrait' : 'square';
  if (r.bucket === 'landscape') return 'landscape';
  if (r.bucket === 'portrait' || r.bucket === 'poster') return 'portrait';
  return 'square';
}

/**
 * Search the vault and return matching image records (with absolute paths).
 * Multilingual: `lang` (ko/ja/zh/es) returns a localized subject + prompt.
 * @param {ReturnType<import('./config.js').resolveConfig>} config
 * @param {{ query?: string, category?: string|null, limit?: number, lang?: string,
 *           orientation?: string|null, minRating?: number, verify?: boolean }} opts
 */
export function queryVault(config, {
  query = '', category = null, limit = 20, lang = 'en',
  orientation = null, minRating = 0, verify = true
} = {}) {
  if (!fs.existsSync(config.dbPath)) {
    return [];
  }
  const vault = openVault(config.dbPath);
  try {
    const ori = orientation && orientation !== 'all' ? orientation : null;
    const minR = Math.max(0, Math.min(5, Number(minRating) || 0));
    const postFilter = Boolean(ori) || minR > 0;
    // over-fetch when post-filtering so we can still return up to `limit`
    let rows = vault.search(query, { category, limit: postFilter ? Math.min(limit * 5, 200) : limit });
    if (verify) rows = rows.filter((r) => r.abs_path && fs.existsSync(r.abs_path));
    if (ori) rows = rows.filter((r) => orientationOf(r) === ori);
    if (minR > 0) rows = rows.filter((r) => (r.rating || 0) >= minR);
    rows = rows.slice(0, limit);
    return rows.map((r) => {
      const loc = localizeFields(r, lang);
      return {
        id: r.id,
        path: r.abs_path,
        thumb: r.thumb_abs || null,
        category: r.category,
        subject: loc.subject,
        style: r.style,
        mood: r.mood,
        size: r.size_label,
        bucket: r.bucket,
        orientation: orientationOf(r),
        rating: r.rating || 0,
        width: r.width,
        height: r.height,
        prompt: loc.prompt,
        tags: safeJson(r.tags),
        sha256: r.sha256,
        created_at: r.created_at
      };
    });
  } finally {
    vault.close();
  }
}

function safeJson(value) {
  try {
    return JSON.parse(value);
  } catch {
    return [];
  }
}
