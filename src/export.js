// Export a curated subset of the vault as a portable, self-contained folder:
// copies the selected originals + thumbnails and writes a dark contact-sheet
// index.html that links thumbnails -> full images. Zero dependencies.
import fs from 'node:fs/promises';
import path from 'node:path';
import { openVault } from './storage/db.js';

// Unicode line/paragraph separators are valid JSON but illegal in a raw JS
// string literal; built via RegExp so this source contains no raw U+2028/U+2029.
const LINE_SEP = new RegExp(' ', 'g');
const PARA_SEP = new RegExp(' ', 'g');

/**
 * Escape a string for safe inclusion in HTML text/attributes.
 * @param {unknown} value
 * @returns {string}
 */
function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Serialize a value as JSON safe to inline inside a <script> tag.
 * Breaks any literal "</script" sequence so the page can't be closed early,
 * and escapes line/paragraph separators that are invalid in JS string context.
 * @param {unknown} value
 * @returns {string}
 */
function safeJson(value) {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(LINE_SEP, '\\u2028')
    .replace(PARA_SEP, '\\u2029');
}

/**
 * Copy a source file into a destination directory, keeping its basename.
 * Missing sources are skipped gracefully (returns null).
 * @param {string|null|undefined} srcAbs
 * @param {string} destDir
 * @returns {Promise<string|null>} the basename written, or null if skipped
 */
async function copyInto(srcAbs, destDir) {
  if (!srcAbs) return null;
  const name = path.basename(srcAbs);
  try {
    await fs.copyFile(srcAbs, path.join(destDir, name));
    return name;
  } catch {
    // Source vanished / unreadable / not a file — skip without failing the run.
    return null;
  }
}

/**
 * Build the self-contained dark contact-sheet HTML.
 * @param {Array<{name:string,thumb:string|null,subject:string,rating:number,category:string}>} items
 * @param {{rating:number,category:string|null,count:number}} meta
 * @returns {string}
 */
function renderHtml(items, meta) {
  const title = 'omnigen-vault export';
  const sub =
    `${meta.count} image${meta.count === 1 ? '' : 's'}` +
    ` · rating ≥ ${meta.rating}` +
    (meta.category ? ` · ${escapeHtml(meta.category)}` : '');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 24px;
    background: #0b0d10; color: #e6e9ef;
    font: 14px/1.45 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  }
  header { margin: 0 0 20px; }
  h1 { margin: 0 0 4px; font-size: 20px; font-weight: 600; }
  .sub { color: #8b93a1; font-size: 13px; }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 14px;
  }
  .card {
    background: #14171c; border: 1px solid #21262e; border-radius: 10px;
    overflow: hidden; display: flex; flex-direction: column;
    text-decoration: none; color: inherit;
    transition: border-color .12s ease, transform .12s ease;
  }
  .card:hover { border-color: #3a4250; transform: translateY(-2px); }
  .thumb {
    width: 100%; aspect-ratio: 1 / 1; object-fit: cover;
    display: block; background: #0b0d10;
  }
  .missing {
    width: 100%; aspect-ratio: 1 / 1; display: flex;
    align-items: center; justify-content: center;
    color: #5a6270; font-size: 12px; background: #0b0d10;
  }
  .cap { padding: 8px 10px; display: flex; align-items: center; gap: 6px; }
  .subject {
    flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis;
    white-space: nowrap; font-size: 12px; color: #c7cdd8;
  }
  .rating { color: #f5c542; font-size: 11px; white-space: nowrap; }
  .empty { color: #8b93a1; padding: 40px 0; text-align: center; }
</style>
</head>
<body>
<header>
  <h1>${escapeHtml(title)}</h1>
  <div class="sub">${sub}</div>
</header>
<div class="grid" id="grid"></div>
<script id="items" type="application/json">${safeJson(items)}</script>
<script>
(function () {
  var items = JSON.parse(document.getElementById('items').textContent);
  var grid = document.getElementById('grid');
  if (!items.length) {
    grid.outerHTML = '<div class="empty">No images matched the export filters.</div>';
    return;
  }
  var frag = document.createDocumentFragment();
  items.forEach(function (it) {
    var a = document.createElement('a');
    a.className = 'card';
    a.href = 'images/' + encodeURIComponent(it.name);
    a.target = '_blank';
    a.rel = 'noopener';

    if (it.thumb) {
      var img = document.createElement('img');
      img.className = 'thumb';
      img.loading = 'lazy';
      img.decoding = 'async';
      img.src = 'thumbs/' + encodeURIComponent(it.thumb);
      img.alt = it.subject || it.name;
      a.appendChild(img);
    } else {
      var ph = document.createElement('div');
      ph.className = 'missing';
      ph.textContent = 'no thumbnail';
      a.appendChild(ph);
    }

    var cap = document.createElement('div');
    cap.className = 'cap';
    var subj = document.createElement('span');
    subj.className = 'subject';
    subj.textContent = it.subject || it.name;
    subj.title = it.subject || it.name;
    cap.appendChild(subj);
    var stars = Math.max(0, Math.min(5, Number(it.rating) || 0));
    if (stars > 0) {
      var rt = document.createElement('span');
      rt.className = 'rating';
      rt.textContent = '★'.repeat(stars);
      cap.appendChild(rt);
    }
    a.appendChild(cap);
    frag.appendChild(a);
  });
  grid.appendChild(frag);
})();
</script>
</body>
</html>
`;
}

/**
 * Export active images matching the given filters into a portable folder.
 *
 * Selects active images with rating >= `rating` (and `category` when given),
 * newest first, optionally capped by `limit`. Copies each original to
 * `<out>/images/<basename>` and its thumbnail (if any) to
 * `<out>/thumbs/<basename>`, then writes a self-contained `<out>/index.html`
 * contact sheet.
 *
 * @param {ReturnType<import('./config.js').resolveConfig>} config
 * @param {{ rating?: number, category?: string|null, limit?: number, out: string }} [opts]
 * @returns {Promise<{ copied: number, out: string, htmlPath: string }>}
 */
export async function exportSet(config, { rating = 0, category = null, limit = 0, out } = {}) {
  if (!out) throw new Error('exportSet: `out` directory is required');

  const outDir = path.resolve(out);
  const imagesOut = path.join(outDir, 'images');
  const thumbsOut = path.join(outDir, 'thumbs');
  await fs.mkdir(imagesOut, { recursive: true });
  await fs.mkdir(thumbsOut, { recursive: true });

  const vault = openVault(config.dbPath);
  let rows;
  try {
    const params = ['active', Number(rating) || 0];
    let sql = 'SELECT * FROM images WHERE status = ? AND COALESCE(rating, 0) >= ?';
    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }
    sql += ' ORDER BY created_at DESC, id DESC';
    if (limit > 0) {
      sql += ' LIMIT ?';
      params.push(limit);
    }
    rows = vault.db.prepare(sql).all(...params);
  } finally {
    vault.close();
  }

  const items = [];
  let copied = 0;
  for (const row of rows) {
    const name = await copyInto(row.abs_path, imagesOut);
    if (!name) continue; // original missing — skip the whole entry
    copied += 1;
    const thumb = await copyInto(row.thumb_abs, thumbsOut);
    items.push({
      name,
      thumb,
      subject: row.subject || '',
      rating: Number(row.rating) || 0,
      category: row.category || ''
    });
  }

  const htmlPath = path.join(outDir, 'index.html');
  await fs.writeFile(
    htmlPath,
    renderHtml(items, { rating: Number(rating) || 0, category, count: items.length }),
    'utf8'
  );

  return { copied, out: outDir, htmlPath };
}
