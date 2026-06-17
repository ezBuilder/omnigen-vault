// AI-facing retrieval: find images in the vault and return ready-to-use paths.
import fs from 'node:fs';

import { openVault } from './storage/db.js';

/**
 * Search the vault and return matching image records (with absolute paths).
 * @param {ReturnType<import('./config.js').resolveConfig>} config
 * @param {{ query?: string, category?: string|null, limit?: number, verify?: boolean }} opts
 */
export function queryVault(config, { query = '', category = null, limit = 20, verify = true } = {}) {
  if (!fs.existsSync(config.dbPath)) {
    return [];
  }
  const vault = openVault(config.dbPath);
  try {
    let rows = vault.search(query, { category, limit });
    if (verify) {
      rows = rows.filter((r) => r.abs_path && fs.existsSync(r.abs_path));
    }
    return rows.map((r) => ({
      id: r.id,
      path: r.abs_path,
      rel_path: r.rel_path,
      category: r.category,
      subject: r.subject,
      style: r.style,
      mood: r.mood,
      size: r.size_label,
      bucket: r.bucket,
      width: r.width,
      height: r.height,
      prompt: r.prompt,
      tags: safeJson(r.tags),
      sha256: r.sha256,
      created_at: r.created_at
    }));
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
