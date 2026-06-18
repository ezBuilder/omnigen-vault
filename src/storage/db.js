// SQLite vault index using the built-in node:sqlite (zero dependencies).
// Stores rich metadata + a full-text index so an AI can find and immediately
// use the right image by querying paths.
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { buildHaystack } from './searchIndex.js';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS images (
  id            INTEGER PRIMARY KEY,
  combo_key     TEXT UNIQUE,
  global_index  INTEGER,
  category      TEXT NOT NULL,
  subject       TEXT,
  style         TEXT,
  lighting      TEXT,
  palette       TEXT,
  composition   TEXT,
  mood          TEXT,
  variant       TEXT,
  prompt        TEXT,
  revised_prompt TEXT,
  rel_path      TEXT,
  abs_path      TEXT,
  width         INTEGER,
  height        INTEGER,
  size_label    TEXT,
  bytes         INTEGER,
  sha256        TEXT UNIQUE,
  bucket        TEXT,
  phash         TEXT,
  thumb_rel     TEXT,
  thumb_abs     TEXT,
  rating        INTEGER DEFAULT 0,
  model         TEXT,
  provider      TEXT,
  response_id   TEXT,
  session_id    TEXT,
  ocr_ran       INTEGER DEFAULT 0,
  ocr_char_count INTEGER DEFAULT 0,
  ocr_text      TEXT,
  status        TEXT DEFAULT 'active',
  tags          TEXT,
  created_at    TEXT
);

CREATE INDEX IF NOT EXISTS idx_images_category ON images(category);
CREATE INDEX IF NOT EXISTS idx_images_status   ON images(status);
CREATE INDEX IF NOT EXISTS idx_images_created  ON images(created_at);

CREATE VIRTUAL TABLE IF NOT EXISTS images_fts USING fts5(
  category, subject, style, mood, variant, prompt, tags,
  content='images', content_rowid='id'
);

CREATE TRIGGER IF NOT EXISTS images_ai AFTER INSERT ON images BEGIN
  INSERT INTO images_fts(rowid, category, subject, style, mood, variant, prompt, tags)
  VALUES (new.id, new.category, new.subject, new.style, new.mood, new.variant, new.prompt, new.tags);
END;

CREATE TRIGGER IF NOT EXISTS images_ad AFTER DELETE ON images BEGIN
  INSERT INTO images_fts(images_fts, rowid, category, subject, style, mood, variant, prompt, tags)
  VALUES ('delete', old.id, old.category, old.subject, old.style, old.mood, old.variant, old.prompt, old.tags);
END;

-- Multilingual search index: per-image haystack of English text + subject/category
-- translations (ko/ja/zh/es), so non-English queries match. rowid = images.id.
CREATE VIRTUAL TABLE IF NOT EXISTS search_fts USING fts5(haystack);

CREATE TABLE IF NOT EXISTS kv_state (
  key   TEXT PRIMARY KEY,
  value TEXT
);
`;

const INSERT_COLS = [
  'combo_key', 'global_index', 'category', 'subject', 'style', 'lighting',
  'palette', 'composition', 'mood', 'variant', 'prompt', 'revised_prompt',
  'rel_path', 'abs_path', 'width', 'height', 'size_label', 'bytes', 'sha256',
  'bucket', 'thumb_rel', 'thumb_abs', 'model', 'provider', 'response_id',
  'session_id', 'ocr_ran', 'ocr_char_count', 'ocr_text', 'status', 'tags', 'created_at'
];

function ftsQuery(raw) {
  // Unicode letters/numbers so Korean/Japanese/Chinese queries tokenize too
  // (the old /[a-z0-9]+/ stripped all non-Latin text → zero tokens).
  const tokens = String(raw || '')
    .toLowerCase()
    .match(/[\p{L}\p{N}]+/gu) || [];
  if (!tokens.length) return null;
  // prefix-match each token; OR semantics so partial matches still return,
  // ranked by relevance (rows matching more/rarer terms score higher via bm25).
  return tokens.map((t) => `"${t}"*`).join(' OR ');
}

export function openVault(dbPath) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new DatabaseSync(dbPath);
  // WAL needs shared-memory mmap, which external/exFAT/network volumes don't
  // support (open fails with CANTOPEN). TRUNCATE journaling is filesystem-safe
  // and lets the system `sqlite3` reader (used by the menu-bar app) open it too.
  db.exec('PRAGMA journal_mode = TRUNCATE;');
  db.exec('PRAGMA synchronous = NORMAL;');
  db.exec('PRAGMA busy_timeout = 5000;');
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec(SCHEMA);

  // Forward migrations: add columns introduced after a DB was first created.
  const cols = new Set(db.prepare('PRAGMA table_info(images)').all().map((c) => c.name));
  for (const [name, type] of [
    ['bucket', 'TEXT'],
    ['thumb_rel', 'TEXT'],
    ['thumb_abs', 'TEXT'],
    ['rating', 'INTEGER DEFAULT 0'],
    ['phash', 'TEXT']
  ]) {
    if (!cols.has(name)) db.exec(`ALTER TABLE images ADD COLUMN ${name} ${type}`);
  }
  db.exec('CREATE INDEX IF NOT EXISTS idx_images_bucket ON images(bucket)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_images_rating ON images(rating)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_images_phash ON images(phash)');

  const placeholders = INSERT_COLS.map(() => '?').join(', ');
  const insertStmt = db.prepare(
    `INSERT OR IGNORE INTO images (${INSERT_COLS.join(', ')}) VALUES (${placeholders})`
  );
  const shaStmt = db.prepare('SELECT 1 FROM images WHERE sha256 = ? LIMIT 1');
  const comboStmt = db.prepare('SELECT 1 FROM images WHERE combo_key = ? LIMIT 1');
  const getStateStmt = db.prepare('SELECT value FROM kv_state WHERE key = ?');
  const setStateStmt = db.prepare(
    'INSERT INTO kv_state(key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  );
  const quarantineStmt = db.prepare('UPDATE images SET status = ?, abs_path = ?, rel_path = ? WHERE id = ?');
  const searchDelStmt = db.prepare('DELETE FROM search_fts WHERE rowid = ?');
  const searchInsStmt = db.prepare('INSERT INTO search_fts(rowid, haystack) VALUES (?, ?)');

  return {
    db,

    insertImage(record) {
      const values = INSERT_COLS.map((c) => {
        const v = record[c];
        if (typeof v === 'boolean') return v ? 1 : 0;
        return v === undefined ? null : v;
      });
      const info = insertStmt.run(...values);
      const id = Number(info.lastInsertRowid) || null;
      // Index an English haystack so search works for any caller; the worker
      // (and backfill) overwrite with the multilingual version via indexSearch.
      if (info.changes && id && record.status !== 'quarantined') {
        try { searchInsStmt.run(id, buildHaystack(record, {})); } catch {}
      }
      return id;
    },

    hasSha(sha) {
      return Boolean(shaStmt.get(sha));
    },

    hasCombo(comboKey) {
      return Boolean(comboStmt.get(comboKey));
    },

    getState(key, fallback = null) {
      const row = getStateStmt.get(key);
      return row ? row.value : fallback;
    },

    setState(key, value) {
      setStateStmt.run(key, String(value));
    },

    setStatus(id, status, absPath, relPath) {
      quarantineStmt.run(status, absPath, relPath, id);
    },

    // Multilingual search index (rowid = image id). Idempotent per id.
    indexSearch(id, haystack) {
      searchDelStmt.run(id);
      searchInsStmt.run(id, String(haystack || ''));
    },

    clearSearchIndex() {
      db.exec('DELETE FROM search_fts');
    },

    listByStatus(status, limit = 100000) {
      return db.prepare('SELECT * FROM images WHERE status = ? ORDER BY id LIMIT ?').all(status, limit);
    },

    /**
     * Full-text search the vault.
     * @param {string} query
     * @param {{ category?: string|null, limit?: number, status?: string }} [opts]
     */
    search(query, { category = null, limit = 20, status = 'active' } = {}) {
      const match = ftsQuery(query);
      if (match) {
        const params = [match, status];
        let sql =
          `SELECT i.* FROM search_fts f JOIN images i ON i.id = f.rowid ` +
          `WHERE search_fts MATCH ? AND i.status = ?`;
        if (category) {
          sql += ' AND i.category = ?';
          params.push(category);
        }
        sql += ' ORDER BY rank LIMIT ?';
        params.push(limit);
        return db.prepare(sql).all(...params);
      }
      // No usable query terms: list newest (optionally by category).
      const params = [status];
      let sql = 'SELECT * FROM images WHERE status = ?';
      if (category) {
        sql += ' AND category = ?';
        params.push(category);
      }
      sql += ' ORDER BY created_at DESC LIMIT ?';
      params.push(limit);
      return db.prepare(sql).all(...params);
    },

    stats() {
      const total = db.prepare("SELECT COUNT(*) c FROM images WHERE status='active'").get().c;
      const quarantined = db.prepare("SELECT COUNT(*) c FROM images WHERE status='quarantined'").get().c;
      const byCategory = db
        .prepare("SELECT category, COUNT(*) c FROM images WHERE status='active' GROUP BY category ORDER BY c DESC")
        .all();
      const bytes = db.prepare("SELECT COALESCE(SUM(bytes),0) b FROM images WHERE status='active'").get().b;
      return { total, quarantined, bytes, byCategory };
    },

    close() {
      db.close();
    }
  };
}
