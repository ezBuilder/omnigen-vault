// Generate premium app-icon candidates via the image backend, then apply a
// macOS-style squircle mask. Zero deps (node:zlib for PNG decode/encode).
//   node app/gen-icon.mjs            -> writes app/candidates/cand-N.png (masked)
import zlib from 'node:zlib';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { resolveConfig } from '../src/config.js';
import { createCodexProvider } from '../src/codex/provider.js';

const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'candidates');
fs.mkdirSync(DIR, { recursive: true });

const SUFFIX =
  'premium macOS app icon, single centered emblem, smooth glossy gradients, 3D render, ' +
  'soft studio lighting, dark deep-gradient background, highly detailed, crisp, ' +
  'no text, no letters, no words, no numbers';
const PROMPTS = [
  `a glowing layered translucent crystal vault emblem, indigo to magenta gradient, ${SUFFIX}`,
  `an abstract aperture of overlapping vibrant gradient blades forming an iris, ${SUFFIX}`,
  `a luminous faceted gemstone prism refracting rainbow light, deep violet background, ${SUFFIX}`,
  `a minimal isometric stack of glowing rounded photo cards, neon gradient glow, ${SUFFIX}`
];

// ---------- minimal PNG decode (8-bit, color type 2/6, non-interlaced) ----------
function paeth(a, b, c) { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); return pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
function decodePng(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('not png');
  let off = 8, width = 0, height = 0, bitDepth = 0, colorType = 0;
  const idat = [];
  while (off < buf.length) {
    const len = buf.readUInt32BE(off); const type = buf.toString('ascii', off + 4, off + 8);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === 'IHDR') { width = data.readUInt32BE(0); height = data.readUInt32BE(4); bitDepth = data[8]; colorType = data[9]; }
    else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    off += 12 + len;
  }
  if (bitDepth !== 8 || (colorType !== 2 && colorType !== 6)) throw new Error('unsupported png ' + bitDepth + '/' + colorType);
  const ch = colorType === 6 ? 4 : 3;
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = width * ch;
  const out = Buffer.alloc(width * height * 4);
  let prev = Buffer.alloc(stride);
  let p = 0;
  for (let y = 0; y < height; y++) {
    const filter = raw[p++]; const line = Buffer.from(raw.subarray(p, p + stride)); p += stride;
    for (let i = 0; i < stride; i++) {
      const a = i >= ch ? line[i - ch] : 0; const b = prev[i]; const c = i >= ch ? prev[i - ch] : 0;
      let v = line[i];
      if (filter === 1) v += a; else if (filter === 2) v += b; else if (filter === 3) v += (a + b) >> 1; else if (filter === 4) v += paeth(a, b, c);
      line[i] = v & 0xff;
    }
    for (let x = 0; x < width; x++) {
      const s = x * ch, d = (y * width + x) * 4;
      out[d] = line[s]; out[d + 1] = line[s + 1]; out[d + 2] = line[s + 2]; out[d + 3] = ch === 4 ? line[s + 3] : 255;
    }
    prev = line;
  }
  return { width, height, data: out };
}

// ---------- PNG encode (RGBA) ----------
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(b) { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
function chunk(type, data) { const l = Buffer.alloc(4); l.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const cr = Buffer.alloc(4); cr.writeUInt32BE(crc32(td) >>> 0); return Buffer.concat([l, td, cr]); }
function encodePng(width, height, rgba) {
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4); ihdr[8] = 8; ihdr[9] = 6;
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) { raw[y * (width * 4 + 1)] = 0; rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4); }
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

// nearest-neighbor-ish bilinear resize to NxN
function resize(src, sw, sh, n) {
  const out = Buffer.alloc(n * n * 4);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const sx = Math.min(sw - 1, Math.floor((x + 0.5) * sw / n));
    const sy = Math.min(sh - 1, Math.floor((y + 0.5) * sh / n));
    src.copy(out, (y * n + x) * 4, (sy * sw + sx) * 4, (sy * sw + sx) * 4 + 4);
  }
  return out;
}

// squircle mask with slight inset (macOS-style), antialiased edge
function squircleMask(rgba, n) {
  const inset = 0.02 * n; const a = (n / 2) - inset; const cx = n / 2, cy = n / 2;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const nx = (x + 0.5 - cx) / a, ny = (y + 0.5 - cy) / a;
    const d = Math.pow(Math.abs(nx), 5) + Math.pow(Math.abs(ny), 5);
    const o = (y * n + x) * 4 + 3;
    let alpha = 1;
    if (d > 1) alpha = 0; else if (d > 0.93) alpha = (1 - d) / 0.07; // feather edge
    rgba[o] = Math.round(rgba[o] * Math.max(0, Math.min(1, alpha)));
  }
  return rgba;
}

const config = resolveConfig();
const provider = createCodexProvider(config);
const N = 1024;
const made = [];
for (let i = 0; i < PROMPTS.length; i++) {
  try {
    process.stdout.write(`generating candidate ${i + 1}/${PROMPTS.length}…\n`);
    const r = await provider.generateImage({ prompt: PROMPTS[i], size: '1024x1024' });
    const rawBytes = Buffer.from(r.resultBase64, 'base64');
    fs.writeFileSync(path.join(DIR, `raw-${i + 1}.png`), rawBytes);
    let masked;
    try {
      const img = decodePng(rawBytes);
      const sq = resize(img.data, img.width, img.height, N);
      squircleMask(sq, N);
      masked = encodePng(N, N, sq);
    } catch (e) {
      process.stdout.write(`  (mask skipped: ${e.message}; using raw)\n`);
      masked = rawBytes;
    }
    const out = path.join(DIR, `cand-${i + 1}.png`);
    fs.writeFileSync(out, masked);
    made.push(out);
    process.stdout.write(`  saved ${out}\n`);
  } catch (e) {
    process.stdout.write(`  candidate ${i + 1} failed: ${e.message}\n`);
  }
}
process.stdout.write(`DONE: ${made.length} candidates in ${DIR}\n`);
