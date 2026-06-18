// Hardened local/public gallery server for omnigen-vault (zero deps: node:http).
//
// Security posture (see SECURITY.md):
//  - read-only by default in --public mode (rating write-back gated behind
//    --allow-rating); images served only by numeric id with realpath-confined
//    path validation (no traversal / symlink escape, never serves the DB);
//  - per-IP rate limiting, JSON body size cap, clamped query limits, strict
//    security headers, optional ?k= / X-Access-Token gate;
//  - bind 127.0.0.1 by default (pair with a Cloudflare Tunnel for public access).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { openVault } from '../storage/db.js';
import { localizeFields } from '../storage/localize.js';
import { renderServerGallery } from './page.js';

// Built SPA (web/dist) lives at the repo root, resolved from this file's location
// (src/server/serve.js → ../../web/dist), independent of cwd or the mounted vault.
const WEB_DIST = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../web/dist');
const WEB_DIST_REAL = (() => { try { return fs.realpathSync(WEB_DIST); } catch { return null; } })();
const HAVE_SPA = Boolean(WEB_DIST_REAL && fs.existsSync(path.join(WEB_DIST_REAL, 'index.html')));

const MIME = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8', '.map': 'application/json; charset=utf-8',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8', '.webmanifest': 'application/manifest+json'
};

// Orientation is derived from ACTUAL pixel aspect (what the viewer sees), not the
// intended `bucket` — the backend doesn't always honor the requested orientation.
const BUCKETS = new Set(['square', 'landscape', 'portrait', 'poster']);
const ORIENT_SQL = {
  landscape: 'width IS NOT NULL AND height IS NOT NULL AND width > height',
  portrait: 'width IS NOT NULL AND height IS NOT NULL AND height > width',
  square: 'width IS NOT NULL AND height IS NOT NULL AND width = height'
};
// Facet bucket = actual-pixel orientation (matches ORIENT_SQL above).
const FACET_BUCKET_CASE =
  `CASE WHEN width IS NULL OR height IS NULL THEN 'square'
        WHEN width > height THEN 'landscape'
        WHEN height > width THEN 'portrait'
        ELSE 'square' END`;

function securityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data:; font-src 'self' data:; connect-src 'self'; " +
      "base-uri 'none'; form-action 'none'; frame-ancestors 'none'"
  );
}

// Serve a file from the built SPA (web/dist), path-confined like the image routes.
// Returns true if a file was streamed, false otherwise (caller decides fallback/404).
function serveStatic(res, urlPath, { immutable = false } = {}) {
  if (!WEB_DIST_REAL) return false;
  let rel;
  try { rel = path.normalize(decodeURIComponent(urlPath)); } catch { return false; }
  const real = safeWithinRoot(WEB_DIST_REAL, path.join(WEB_DIST_REAL, rel));
  if (!real) return false;
  let stat;
  try { stat = fs.statSync(real); } catch { return false; }
  if (!stat.isFile()) return false;
  const type = MIME[path.extname(real).toLowerCase()] || 'application/octet-stream';
  res.writeHead(200, {
    'Content-Type': type,
    'Cache-Control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache'
  });
  fs.createReadStream(real).on('error', () => res.end()).pipe(res);
  return true;
}

function send(res, code, body, type = 'text/plain; charset=utf-8', extra = {}) {
  res.writeHead(code, { 'Content-Type': type, ...extra });
  res.end(body);
}
function sendJson(res, code, obj) {
  send(res, code, JSON.stringify(obj), 'application/json; charset=utf-8');
}

// Confine a path to the vault root (canonicalized) — blocks traversal + symlinks.
function safeWithinRoot(realRoot, target) {
  try {
    const real = fs.realpathSync(path.resolve(target));
    return real === realRoot || real.startsWith(realRoot + path.sep) ? real : null;
  } catch {
    return null;
  }
}

/**
 * Start the gallery server.
 * @param {ReturnType<import('../config.js').resolveConfig>} config
 * @param {{ port?: number, host?: string, public?: boolean, allowRating?: boolean,
 *           allowDownload?: boolean, token?: string|null, log?: Function }} [opts]
 * @returns {Promise<import('node:http').Server>}
 */
export function serveVault(config, opts = {}) {
  const log = opts.log || console.log;
  const isPublic = Boolean(opts.public);
  const allowRating = opts.allowRating ?? !isPublic; // writes off by default when public
  const allowDownload = opts.allowDownload ?? true;
  const token = opts.token || null;
  const host = opts.host || '127.0.0.1';
  const startPort = opts.port || config.servePort || 8787;

  if (!fs.existsSync(config.dbPath)) {
    return Promise.reject(new Error(`No vault DB at ${config.dbPath}. Generate some images first.`));
  }
  const realRoot = fs.realpathSync(path.resolve(config.vaultRoot));
  const vault = openVault(config.dbPath);

  const byId = vault.db.prepare('SELECT abs_path, thumb_abs FROM images WHERE id = ? AND status = ?');
  const cats = vault.db.prepare("SELECT DISTINCT category FROM images WHERE status='active' ORDER BY category");
  const rateStmt = allowRating ? vault.db.prepare('UPDATE images SET rating = ? WHERE id = ?') : null;

  // Facet counts (categories + resolution buckets) for the gallery filter UI.
  const facetCatsStmt = vault.db.prepare(
    "SELECT category name, COUNT(*) count FROM images WHERE status='active' GROUP BY category ORDER BY count DESC"
  );
  const facetBucketsStmt = vault.db.prepare(
    `SELECT ${FACET_BUCKET_CASE} AS name, COUNT(*) count
     FROM images WHERE status='active' GROUP BY name ORDER BY count DESC`
  );
  let facetsCache = null;
  let facetsAt = 0;
  function getFacets() {
    const now = Date.now();
    if (facetsCache && now - facetsAt < 60_000) return facetsCache;
    facetsCache = { categories: facetCatsStmt.all(), buckets: facetBucketsStmt.all() };
    facetsAt = now;
    return facetsCache;
  }

  // per-IP sliding-window rate limiter
  const WINDOW_MS = 10_000;
  const MAX_REQ = 240;
  const hits = new Map();
  function rateLimited(ip) {
    const now = Date.now();
    const e = hits.get(ip);
    if (!e || now > e.reset) {
      hits.set(ip, { n: 1, reset: now + WINDOW_MS });
      if (hits.size > 5000) for (const [k, v] of hits) if (now > v.reset) hits.delete(k);
      return false;
    }
    e.n += 1;
    return e.n > MAX_REQ;
  }

  function searchRows({ q, category, minRating, bucket, orientation, limit, offset, order, lang }) {
    const dir = order === 'old' ? 'ASC' : order === 'top' ? 'DESC' : 'DESC';
    const lim = Math.min(Math.max(parseInt(limit, 10) || 60, 1), 200);
    const off = Math.max(parseInt(offset, 10) || 0, 0);
    const minR = Math.min(Math.max(parseInt(minRating, 10) || 0, 0), 5);
    const where = ["status='active'"];
    const params = [];
    if (category) { where.push('category = ?'); params.push(category); }
    if (minR) { where.push('COALESCE(rating,0) >= ?'); params.push(minR); }
    // exact resolution bucket
    if (BUCKETS.has(String(bucket))) { where.push('bucket = ?'); params.push(String(bucket)); }
    // orientation: prefer a non-empty bucket, else derive from aspect (NULL-safe)
    const ori = String(orientation || '');
    if (ORIENT_SQL[ori]) where.push(ORIENT_SQL[ori]);
    // Unicode tokens so Korean/Japanese/Chinese queries tokenize (not just a-z0-9),
    // matched against the multilingual search_fts haystack.
    const terms = String(q || '').toLowerCase().match(/[\p{L}\p{N}]+/gu) || [];
    if (terms.length) {
      const fts = terms.map((t) => `"${t.replace(/"/g, '')}"*`).join(' OR ');
      const ids = vault.db
        .prepare('SELECT rowid FROM search_fts WHERE search_fts MATCH ? LIMIT 5000')
        .all(fts)
        .map((r) => r.rowid);
      if (ids.length === 0) return { items: [], total: 0 };
      where.push(`id IN (${ids.map(() => '?').join(',')})`);
      params.push(...ids);
    }
    const whereSql = where.join(' AND ');
    const orderSql = order === 'top'
      ? 'COALESCE(rating,0) DESC, created_at DESC, id DESC'
      : `created_at ${dir}, id ${dir}`;
    const total = vault.db.prepare(`SELECT COUNT(*) c FROM images WHERE ${whereSql}`).get(...params).c;
    const rows = vault.db
      .prepare(
        `SELECT id, subject, category, size_label, width, height, bucket, COALESCE(rating,0) rating,
                prompt, style, lighting, palette, composition, mood, variant
         FROM images WHERE ${whereSql} ORDER BY ${orderSql} LIMIT ? OFFSET ?`
      )
      .all(...params, lim, off);
    const items = rows.map((r) => {
      const loc = localizeFields(r, lang); // localized subject + composed prompt for the viewer's language
      return {
        id: r.id, subject: loc.subject, category: r.category, size: r.size_label,
        w: r.width, h: r.height, bucket: r.bucket || '', rating: r.rating, style: r.style, prompt: loc.prompt,
        thumb: `/thumb?id=${r.id}`, full: `/img?id=${r.id}`, download: `/download?id=${r.id}`
      };
    });
    return { items, total };
  }

  function streamImage(res, id, { full = false, download = false } = {}) {
    const row = byId.get(Number(id), 'active');
    if (!row) return send(res, 404, 'not found');
    // download → original (attachment); full → original inline (lightbox preview);
    // otherwise → thumbnail (grid). Each falls back when its preferred file is missing.
    const candidate = download
      ? row.abs_path
      : full
        ? row.abs_path || row.thumb_abs
        : row.thumb_abs || row.abs_path;
    const real = candidate && safeWithinRoot(realRoot, candidate);
    if (!real) return send(res, 404, 'not found');
    const type = MIME[path.extname(real).toLowerCase()] || 'application/octet-stream';
    const headers = { 'Content-Type': type, 'Cache-Control': 'public, max-age=86400' };
    if (download) headers['Content-Disposition'] = `attachment; filename="${path.basename(real)}"`;
    res.writeHead(200, headers);
    fs.createReadStream(real).on('error', () => res.end()).pipe(res);
  }

  function readBody(req, cap = 4096) {
    return new Promise((resolve, reject) => {
      let n = 0;
      const chunks = [];
      req.on('data', (c) => {
        n += c.length;
        if (n > cap) { reject(new Error('body too large')); req.destroy(); return; }
        chunks.push(c);
      });
      req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      req.on('error', reject);
    });
  }

  const server = http.createServer(async (req, res) => {
    try {
      securityHeaders(res);
      const ip = (req.headers['cf-connecting-ip'] || req.socket.remoteAddress || 'x').toString();
      if (rateLimited(ip)) return send(res, 429, 'rate limited');

      const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
      if (token) {
        const provided = url.searchParams.get('k') || req.headers['x-access-token'];
        if (provided !== token) return send(res, 403, 'forbidden');
      }
      const p = url.pathname;

      // --- JSON API + images (matched before static so /api/* never falls through) ---
      if (req.method === 'GET' && p === '/api/search') {
        const s = url.searchParams;
        return sendJson(res, 200, searchRows({
          q: s.get('q'), category: s.get('category'), minRating: s.get('minRating'),
          bucket: s.get('bucket'), orientation: s.get('orientation'),
          limit: s.get('limit'), offset: s.get('offset'), order: s.get('order'),
          lang: s.get('lang')
        }));
      }
      if (req.method === 'GET' && p === '/api/categories') {
        return sendJson(res, 200, { categories: cats.all().map((r) => r.category) });
      }
      if (req.method === 'GET' && p === '/api/facets') return sendJson(res, 200, getFacets());
      if (req.method === 'GET' && p === '/api/config') {
        return sendJson(res, 200, {
          ratingEnabled: !!allowRating, downloadEnabled: !!allowDownload, isPublic: !!isPublic
        });
      }
      if (req.method === 'GET' && p === '/thumb') return streamImage(res, url.searchParams.get('id'));
      // /img backs the lightbox preview: serve the original when downloads are allowed,
      // else stay on the thumbnail so originals never leave a download-disabled server.
      if (req.method === 'GET' && p === '/img') return streamImage(res, url.searchParams.get('id'), { full: allowDownload });
      if (req.method === 'GET' && p === '/download') {
        if (!allowDownload) return send(res, 403, 'downloads disabled');
        return streamImage(res, url.searchParams.get('id'), { download: true });
      }
      if (req.method === 'POST' && p === '/api/rate') {
        if (!allowRating) return send(res, 403, 'read-only');
        let body;
        try { body = JSON.parse(await readBody(req)); } catch { return sendJson(res, 400, { error: 'bad body' }); }
        const id = parseInt(body.id, 10);
        const rating = parseInt(body.rating, 10);
        if (!(id > 0) || !(rating >= 0 && rating <= 5)) return sendJson(res, 400, { error: 'bad params' });
        const info = rateStmt.run(rating, id);
        return info.changes ? sendJson(res, 200, { ok: true, id, rating }) : sendJson(res, 404, { error: 'no row' });
      }
      if (p.startsWith('/api/')) return sendJson(res, 404, { error: 'not found' });

      // --- static SPA (web/dist), or legacy vanilla gallery when no build is present ---
      if (HAVE_SPA) {
        if (req.method === 'GET' && p.startsWith('/assets/')) {
          if (serveStatic(res, p, { immutable: true })) return;
          return send(res, 404, 'not found');
        }
        if (req.method === 'GET') {
          // a top-level file (favicon, manifest, …) if it exists, else SPA index for client routing
          if (p !== '/' && /\.[a-z0-9]+$/i.test(p) && serveStatic(res, p)) return;
          if (serveStatic(res, '/index.html')) return;
        }
        return send(res, 404, 'not found');
      }
      if (req.method === 'GET' && (p === '/' || p === '/index.html')) {
        return send(res, 200, renderServerGallery({ isPublic, allowRating, allowDownload, token }),
          'text/html; charset=utf-8');
      }
      return send(res, 404, 'not found');
    } catch (err) {
      send(res, 500, 'server error');
    }
  });

  server.on('close', () => { try { vault.close(); } catch {} });

  return new Promise((resolve, reject) => {
    let port = startPort;
    const tryListen = () => {
      server.once('error', (e) => {
        if (e.code === 'EADDRINUSE' && port < startPort + 10) { port += 1; setImmediate(tryListen); }
        else { try { vault.close(); } catch {} reject(e); }
      });
      server.listen(port, host, () => {
        const where = host === '0.0.0.0' ? `all interfaces :${port}` : `http://${host}:${port}`;
        log(`omnigen gallery server live at ${where}`);
        log(`  mode: ${isPublic ? 'PUBLIC read-only' : 'local'}` +
          `${allowRating ? ' · rating ON' : ' · rating OFF'}${allowDownload ? ' · downloads ON' : ''}` +
          `${token ? ' · token required' : ''}`);
        log(HAVE_SPA
          ? `  ui: SPA (web/dist)`
          : `  ui: legacy gallery — run \`npm run build\` to build the web/ SPA`);
        if (isPublic) log(`  expose safely: cloudflared tunnel --url http://localhost:${port}`);
        resolve(server);
      });
    };
    tryListen();
  });
}
