// Perceptual near-duplicate detection via macOS `sips` (built-in, zero deps).
//
// We shrink each image to a tiny 9x8 grayscale grid with `sips`, decode the
// resulting uncompressed BMP ourselves, and derive a 64-bit "difference hash"
// (dHash): for each of the 8 rows, the 8 adjacent horizontal pairs of the 9
// columns yield one bit (1 if the left pixel is brighter than the right). Two
// images are near-duplicates when their hashes differ in only a few bits
// (Hamming distance), which survives recompression, minor crops, and tone
// shifts far better than an exact sha256 match.
import { spawn } from 'node:child_process';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';

import { openVault } from '../storage/db.js';

// dHash works on a (W) x (H) grid where W = H + 1 so each row produces H bits.
const HASH_W = 9;
const HASH_H = 8;

/**
 * Spawn a binary, resolving true only on a clean exit.
 * @param {string} binary
 * @param {string[]} args
 * @returns {Promise<boolean>}
 */
function run(binary, args) {
  return new Promise((resolve) => {
    let child;
    try {
      child = spawn(binary, args, { stdio: ['ignore', 'ignore', 'ignore'] });
    } catch {
      resolve(false);
      return;
    }
    child.on('error', () => resolve(false));
    child.on('close', (code) => resolve(code === 0));
  });
}

/**
 * Decode an uncompressed 24/32-bit BMP buffer into a luminance grid.
 *
 * Parses the 14-byte BITMAPFILEHEADER (pixel-array offset at bytes 10..13) and
 * the DIB header (width @18, height @22, bitsPerPixel @28). Rows are stored
 * bottom-up and each row is padded to a multiple of 4 bytes; per-pixel
 * luminance is 0.299R + 0.587G + 0.114B.
 *
 * @param {Buffer} buf
 * @returns {{ width: number, height: number, lum: number[][] } | null} rows
 *   top-to-bottom, each an array of luminance values (0..255), or null on any
 *   unsupported/corrupt input.
 */
function decodeBmp(buf) {
  if (!buf || buf.length < 26) return null;
  if (buf[0] !== 0x42 || buf[1] !== 0x4d) return null; // "BM"

  const pixelOffset = buf.readUInt32LE(10);
  const width = buf.readInt32LE(18);
  const rawHeight = buf.readInt32LE(22);
  const bpp = buf.readUInt16LE(28);

  if (width <= 0 || rawHeight === 0) return null;
  if (bpp !== 24 && bpp !== 32) return null;

  const bottomUp = rawHeight > 0;
  const height = Math.abs(rawHeight);
  const bytesPerPixel = bpp / 8;
  // Each scanline is padded up to a 4-byte boundary.
  const rowStride = ((width * bytesPerPixel + 3) >> 2) << 2;

  if (pixelOffset + rowStride * height > buf.length) return null;

  const lum = [];
  for (let y = 0; y < height; y += 1) {
    // BMP stores the bottom row first; emit rows top-to-bottom.
    const srcRow = bottomUp ? height - 1 - y : y;
    const rowStart = pixelOffset + srcRow * rowStride;
    const row = new Array(width);
    for (let x = 0; x < width; x += 1) {
      const p = rowStart + x * bytesPerPixel;
      // BMP pixels are little-endian BGR(A).
      const b = buf[p];
      const g = buf[p + 1];
      const r = buf[p + 2];
      row[x] = 0.299 * r + 0.587 * g + 0.114 * b;
    }
    lum[y] = row;
  }
  return { width, height, lum };
}

/**
 * Reduce a luminance grid to a 64-bit difference hash (16-char hex).
 * Compares the 8 adjacent horizontal pairs across the 9 columns of each of the
 * 8 rows. Returns null if the grid is too small.
 *
 * @param {{ width: number, height: number, lum: number[][] }} img
 * @returns {string | null}
 */
function dhashFromGrid(img) {
  if (!img || img.height < HASH_H || img.width < HASH_W) return null;
  let bits = 0n;
  for (let y = 0; y < HASH_H; y += 1) {
    const row = img.lum[y];
    for (let x = 0; x < HASH_W - 1; x += 1) {
      bits <<= 1n;
      if (row[x] > row[x + 1]) bits |= 1n;
    }
  }
  // 64 bits → fixed-width 16-char hex.
  return bits.toString(16).padStart(16, '0');
}

/**
 * Compute the perceptual dHash of an image file.
 *
 * Uses `sips` to render a 9x8 BMP into the OS temp dir, decodes it, and derives
 * the hash. Note `sips -z` takes HEIGHT then WIDTH, so `-z 8 9` = 8 tall x 9
 * wide. The temp file is always cleaned up. Returns null on any failure
 * (missing sips, unreadable image, unexpected BMP format).
 *
 * @param {string} srcPath
 * @param {{ binary?: string }} [opts]
 * @returns {Promise<string | null>} 16-char hex hash, or null
 */
export async function computeDHash(srcPath, { binary = 'sips' } = {}) {
  const tmp = path.join(
    os.tmpdir(),
    `omnigen-phash-${process.pid}-${crypto.randomBytes(6).toString('hex')}.bmp`
  );
  try {
    const ok = await run(binary, [
      '-s', 'format', 'bmp',
      '-z', String(HASH_H), String(HASH_W), // height, width
      srcPath,
      '--out', tmp
    ]);
    if (!ok) return null;
    const buf = await fsp.readFile(tmp).catch(() => null);
    if (!buf) return null;
    const grid = decodeBmp(buf);
    return dhashFromGrid(grid);
  } catch {
    return null;
  } finally {
    await fsp.unlink(tmp).catch(() => {});
  }
}

const POPCOUNT = (() => {
  // Precomputed nibble popcounts for fast hex-digit comparison.
  const table = new Array(16);
  for (let i = 0; i < 16; i += 1) {
    table[i] = (i & 1) + ((i >> 1) & 1) + ((i >> 2) & 1) + ((i >> 3) & 1);
  }
  return table;
})();

/**
 * Hamming distance between two hex hash strings (per-nibble XOR popcount).
 * Mismatched lengths/invalid hex yield Infinity so callers never treat a
 * malformed hash as "close".
 *
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
export function hamming(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return Infinity;
  if (a.length !== b.length) return Infinity;
  let dist = 0;
  for (let i = 0; i < a.length; i += 1) {
    const x = parseInt(a[i], 16);
    const y = parseInt(b[i], 16);
    if (Number.isNaN(x) || Number.isNaN(y)) return Infinity;
    dist += POPCOUNT[x ^ y];
  }
  return dist;
}

/**
 * Ensure every active image has a phash, then collapse near-duplicates.
 *
 * Step 1: for active rows missing a phash, compute it from abs_path and
 *   `UPDATE images SET phash=? WHERE id=?`.
 * Step 2: O(n^2) compare every pair of active hashes; when their Hamming
 *   distance is <= threshold, keep one canonical row (highest rating, ties
 *   broken by lowest id) and mark the rest `status='duplicate'`. Already-
 *   demoted rows are skipped so each duplicate is only counted once.
 *
 * @param {ReturnType<typeof import('../config.js').resolveConfig>} config
 * @param {{ threshold?: number, log?: (msg: string) => void }} [opts]
 * @returns {Promise<{ hashed: number, duplicates: number }>}
 */
export async function dedupeVault(config, { threshold = 5, log = console.log } = {}) {
  const vault = openVault(config.dbPath);
  let hashed = 0;
  let duplicates = 0;
  try {
    const setPhash = vault.db.prepare('UPDATE images SET phash = ? WHERE id = ?');
    const setDup = vault.db.prepare("UPDATE images SET status = 'duplicate' WHERE id = ?");

    // --- Step 1: backfill missing perceptual hashes. ---
    const missing = vault.db
      .prepare("SELECT id, abs_path FROM images WHERE status = 'active' AND (phash IS NULL OR phash = '')")
      .all();
    if (missing.length) log(`hashing ${missing.length} image(s) without a phash…`);
    for (const row of missing) {
      if (!row.abs_path) continue;
      const exists = await fsp.stat(row.abs_path).then(() => true).catch(() => false);
      if (!exists) continue;
      const hash = await computeDHash(row.abs_path, { binary: config.thumbBinary || 'sips' });
      if (!hash) continue;
      setPhash.run(hash, row.id);
      hashed += 1;
      if (hashed % 50 === 0) log(`  hashed ${hashed}/${missing.length}…`);
    }
    if (hashed) log(`hashed ${hashed} new image(s).`);

    // --- Step 2: group near-duplicates among active images. ---
    const rows = vault.db
      .prepare(
        "SELECT id, phash, COALESCE(rating, 0) AS rating FROM images " +
        "WHERE status = 'active' AND phash IS NOT NULL AND phash != '' ORDER BY id"
      )
      .all();
    log(`comparing ${rows.length} hashed image(s) (threshold ${threshold})…`);

    const demoted = new Set();
    for (let i = 0; i < rows.length; i += 1) {
      const a = rows[i];
      if (demoted.has(a.id)) continue;
      // `canonical` is the surviving row for this cluster; weaker matches lose.
      let canonical = a;
      for (let j = i + 1; j < rows.length; j += 1) {
        const b = rows[j];
        if (demoted.has(b.id)) continue;
        if (hamming(a.phash, b.phash) > threshold) continue;
        // Keep the higher-rated row; ties go to the lower id (older/original).
        const loser =
          b.rating > canonical.rating ||
          (b.rating === canonical.rating && b.id < canonical.id)
            ? canonical
            : b;
        const keeper = loser === canonical ? b : canonical;
        setDup.run(loser.id);
        demoted.add(loser.id);
        duplicates += 1;
        canonical = keeper;
      }
    }
    log(`dedupe done — hashed: ${hashed}, duplicates marked: ${duplicates}`);
  } finally {
    vault.close();
  }
  return { hashed, duplicates };
}
