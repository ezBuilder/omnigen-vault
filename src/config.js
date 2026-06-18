// Runtime configuration for omnigen-vault.
// All paths and tunables resolve here so the worker, query, and CLI agree.
import os from 'node:os';
import path from 'node:path';

import { loadConfigFile } from './configFile.js';

const DEFAULT_CODEX_HOME = path.join(os.homedir(), '.codex');

// Sizes honored by the private Codex image_generation tool.
export const SUPPORTED_SIZES = [
  '1024x1024',
  '1536x1024',
  '1024x1536',
  '2048x2048',
  '2048x1152',
  '3840x2160',
  '2160x3840'
];

export const UNSUPPORTED_WARNING =
  'omnigen-vault calls an UNSUPPORTED private Codex backend with your ChatGPT auth. The contract may change without notice and heavy use may risk your account.';

/**
 * Resolve full runtime config from overrides + environment.
 *
 * @param {Record<string, unknown>} [overrides]
 */
export function resolveConfig(overrides = {}) {
  // Precedence: explicit overrides (CLI flags) > saved config file > env > defaults.
  // Folding the file under overrides keeps the per-field `?? env ?? default` chain.
  overrides = { ...loadConfigFile(), ...overrides };
  const env = process.env;
  const codexHome = overrides.codexHome || env.CODEX_HOME || DEFAULT_CODEX_HOME;

  const vaultRoot =
    overrides.vaultRoot ||
    env.OMNIGEN_VAULT_ROOT ||
    path.join(os.homedir(), '.omnigen-vault');

  return {
    // --- backend / auth ---
    provider: 'private-codex',
    baseUrl:
      overrides.baseUrl ||
      env.OMNIGEN_BASE_URL ||
      'https://chatgpt.com/backend-api/codex',
    codexHome,
    authFile: overrides.authFile || env.OMNIGEN_AUTH_FILE || path.join(codexHome, 'auth.json'),
    installationIdFile:
      overrides.installationIdFile ||
      env.OMNIGEN_INSTALLATION_ID_FILE ||
      path.join(codexHome, 'installation_id'),
    model: overrides.model || env.OMNIGEN_MODEL || 'gpt-5.4',
    originator: overrides.originator || env.OMNIGEN_ORIGINATOR || 'codex_cli_rs',

    // --- storage layout (on the backup external disk) ---
    vaultRoot,
    imagesDir: overrides.imagesDir || path.join(vaultRoot, 'images'),
    thumbsDir: overrides.thumbsDir || path.join(vaultRoot, 'thumbs'),
    dbPath: overrides.dbPath || path.join(vaultRoot, 'index.sqlite'),
    quarantineDir: overrides.quarantineDir || path.join(vaultRoot, 'quarantine'),
    galleryPath: overrides.galleryPath || path.join(vaultRoot, 'gallery.html'),

    // --- live local gallery server (omnigen serve) ---
    servePort: numeric(overrides.servePort ?? env.OMNIGEN_SERVE_PORT, 8787),

    // --- generation behaviour ---
    // size: a single label, "rotate" (cycle category-appropriate sizes), or "auto-category"
    size: overrides.size || env.OMNIGEN_SIZE || 'auto-category',
    limit: numeric(overrides.limit ?? env.OMNIGEN_LIMIT, 0), // 0 = infinite
    // max throughput: many requests in flight at once. Clamp high; the backend's
    // own rate limiting + our backoff is the real governor.
    concurrency: clamp(numeric(overrides.concurrency ?? env.OMNIGEN_CONCURRENCY, 8), 1, 64),
    categories: parseList(overrides.categories ?? env.OMNIGEN_CATEGORIES), // null = all
    theme: overrides.theme ?? env.OMNIGEN_THEME ?? null, // word/phrase mode (overrides categories)
    maxRetries: numeric(overrides.maxRetries ?? env.OMNIGEN_MAX_RETRIES, 4),
    requestTimeoutMs: numeric(overrides.requestTimeoutMs ?? env.OMNIGEN_TIMEOUT_MS, 300_000),

    // delay between an in-flight slot finishing and grabbing the next prompt.
    // 0 = go as fast as the backend allows (default for max throughput).
    minDelayMs: numeric(overrides.minDelayMs ?? env.OMNIGEN_MIN_DELAY_MS, 0),

    // persist cursor every N saved images (bounds churn)
    checkpointEvery: numeric(overrides.checkpointEvery ?? env.OMNIGEN_CHECKPOINT_EVERY, 50),

    // per-category active-image caps, e.g. "birds=500,cats=200" (raw string; null = none)
    categoryCaps: overrides.categoryCaps ?? env.OMNIGEN_CATEGORY_CAPS ?? null,
    // stop generating at this local clock time, "HH:MM" (null = run indefinitely)
    until: overrides.until ?? env.OMNIGEN_UNTIL ?? null,

    // --- disk safety (never fill the OS disk / crash the machine) ---
    maxDiskPercent: clamp(numeric(overrides.maxDiskPercent ?? env.OMNIGEN_MAX_DISK_PERCENT, 90), 1, 100),
    minFreeGb: numeric(overrides.minFreeGb ?? env.OMNIGEN_MIN_FREE_GB, 5),
    allowSystemVolume: bool(overrides.allowSystemVolume ?? env.OMNIGEN_ALLOW_SYSTEM_VOLUME, false),
    diskCheckEvery: numeric(overrides.diskCheckEvery ?? env.OMNIGEN_DISK_CHECK_EVERY, 20),

    // --- thumbnails (for the gallery) ---
    thumbnails: bool(overrides.thumbnails ?? env.OMNIGEN_THUMBS, true),
    thumbSize: numeric(overrides.thumbSize ?? env.OMNIGEN_THUMB_SIZE, 400),
    thumbBinary: overrides.thumbBinary || env.OMNIGEN_SIPS || 'sips',

    // --- text-free verification ---
    // tesseract in sparse mode hallucinates characters from natural texture, so
    // we only trust HIGH-CONFIDENCE multi-character words (via TSV output).
    ocrEnabled: bool(overrides.ocrEnabled ?? env.OMNIGEN_OCR, true),
    ocrBinary: overrides.ocrBinary || env.OMNIGEN_TESSERACT || 'tesseract',
    ocrMinConfidence: numeric(overrides.ocrMinConfidence ?? env.OMNIGEN_OCR_MIN_CONF, 70),
    ocrMinWordLen: numeric(overrides.ocrMinWordLen ?? env.OMNIGEN_OCR_MIN_WORDLEN, 3),
    // an image "has text" only if it yields >= this many confident words
    ocrWordThreshold: numeric(overrides.ocrWordThreshold ?? env.OMNIGEN_OCR_WORDS, 2),
    // regenerate attempts when text is detected before quarantining
    textRetries: numeric(overrides.textRetries ?? env.OMNIGEN_TEXT_RETRIES, 2)
  };
}

function numeric(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(n, lo, hi) {
  return Math.min(hi, Math.max(lo, n));
}

function bool(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  return !/^(0|false|no|off)$/i.test(String(value));
}

function parseList(value) {
  if (!value) return null;
  if (Array.isArray(value)) return value;
  const parts = String(value)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.length ? parts : null;
}
