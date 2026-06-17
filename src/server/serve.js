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

import { openVault } from '../storage/db.js';
import { renderServerGallery } from './page.js';

const MIME = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.gif': 'image/gif'
};

function securityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'none'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; " +
      "script-src 'self' 'unsafe-inline'; connect-src 'self'; base-uri 'none'; form-action 'none'"
  );
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

  function searchRows({ q, category, minRating, limit, offset, order }) {
    const dir = order === 'old' ? 'ASC' : 'DESC';
    const lim = Math.min(Math.max(parseInt(limit, 10) || 60, 1), 200);
    const off = Math.max(parseInt(offset, 10) || 0, 0);
    const minR = Math.min(Math.max(parseInt(minRating, 10) || 0, 0), 5);
    const where = ["status='active'"];
    const params = [];
    if (category) { where.push('category = ?'); params.push(category); }
    if (minR) { where.push('COALESCE(rating,0) >= ?'); params.push(minR); }
    const terms = String(q || '').toLowerCase().match(/[a-z0-9]+/g) || [];
    if (terms.length) {
      const fts = terms.map((t) => `"${t}"*`).join(' OR ');
      const ids = vault.db
        .prepare('SELECT rowid FROM images_fts WHERE images_fts MATCH ? LIMIT 5000')
        .all(fts)
        .map((r) => r.rowid);
      if (ids.length === 0) return { items: [], total: 0 };
      where.push(`id IN (${ids.map(() => '?').join(',')})`);
      params.push(...ids);
    }
    const whereSql = where.join(' AND ');
    const total = vault.db.prepare(`SELECT COUNT(*) c FROM images WHERE ${whereSql}`).get(...params).c;
    const rows = vault.db
      .prepare(
        `SELECT id, subject, category, size_label, width, height, COALESCE(rating,0) rating, prompt, style
         FROM images WHERE ${whereSql} ORDER BY created_at ${dir}, id ${dir} LIMIT ? OFFSET ?`
      )
      .all(...params, lim, off);
    const items = rows.map((r) => ({
      id: r.id, subject: r.subject, category: r.category, size: r.size_label,
      w: r.width, h: r.height, rating: r.rating, style: r.style, prompt: r.prompt,
      thumb: `/thumb?id=${r.id}`, full: `/img?id=${r.id}`, download: `/download?id=${r.id}`
    }));
    return { items, total };
  }

  function streamImage(res, id, { download = false } = {}) {
    const row = byId.get(Number(id), 'active');
    if (!row) return send(res, 404, 'not found');
    const candidate = download ? row.abs_path : row.thumb_abs || row.abs_path;
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

      if (req.method === 'GET' && (p === '/' || p === '/index.html')) {
        return send(res, 200, renderServerGallery({ isPublic, allowRating, allowDownload, token }),
          'text/html; charset=utf-8');
      }
      if (req.method === 'GET' && p === '/api/search') {
        const s = url.searchParams;
        return sendJson(res, 200, searchRows({
          q: s.get('q'), category: s.get('category'), minRating: s.get('minRating'),
          limit: s.get('limit'), offset: s.get('offset'), order: s.get('order')
        }));
      }
      if (req.method === 'GET' && p === '/api/categories') {
        return sendJson(res, 200, { categories: cats.all().map((r) => r.category) });
      }
      if (req.method === 'GET' && p === '/thumb') return streamImage(res, url.searchParams.get('id'));
      if (req.method === 'GET' && p === '/img') return streamImage(res, url.searchParams.get('id'));
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
        if (isPublic) log(`  expose safely: cloudflared tunnel --url http://localhost:${port}`);
        resolve(server);
      });
    };
    tryListen();
  });
}
