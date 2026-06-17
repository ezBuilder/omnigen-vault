// Generate a 1024x1024 RGBA PNG app icon — zero deps (node:zlib only).
// A squircle with an indigo→fuchsia gradient and a clean white "image" glyph
// (sun + mountain peaks). Supersampled for smooth edges.
import zlib from 'node:zlib';
import fs from 'node:fs';

const S = 1024;
const SS = 3; // supersample factor

function lerp(a, b, t) { return a + (b - a) * t; }
function mix(c1, c2, t) { return [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)]; }

const TOP = [99, 102, 241];    // indigo-500
const BOT = [217, 70, 239];    // fuchsia-500
const WHITE = [255, 255, 255];

function inSquircle(nx, ny) { // normalized -1..1, superellipse n=5
  return Math.pow(Math.abs(nx), 5) + Math.pow(Math.abs(ny), 5) <= 1;
}
function inCircle(x, y, cx, cy, r) { const dx = x - cx, dy = y - cy; return dx * dx + dy * dy <= r * r; }
// point in triangle (barycentric)
function inTri(px, py, a, b, c) {
  const d = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1]);
  const u = ((b[1] - c[1]) * (px - c[0]) + (c[0] - b[0]) * (py - c[1])) / d;
  const v = ((c[1] - a[1]) * (px - c[0]) + (a[0] - c[0]) * (py - c[1])) / d;
  return u >= 0 && v >= 0 && u + v <= 1;
}

function sample(x, y) {
  const nx = (x / S) * 2 - 1, ny = (y / S) * 2 - 1;
  if (!inSquircle(nx, ny)) return [0, 0, 0, 0]; // transparent outside
  const bg = mix(TOP, BOT, (x + y) / (2 * S));
  // glyph geometry (in 1024 space)
  const sun = inCircle(x, y, 700, 360, 92);
  const m1 = inTri(x, y, [250, 760], [470, 470], [690, 760]);
  const m2 = inTri(x, y, [520, 760], [730, 520], [860, 760]);
  if (sun || m1 || m2) return [...WHITE, 255];
  return [...bg, 255];
}

const buf = Buffer.alloc(S * S * 4);
for (let y = 0; y < S; y++) {
  for (let x = 0; x < S; x++) {
    let r = 0, g = 0, b = 0, a = 0;
    for (let sy = 0; sy < SS; sy++) {
      for (let sx = 0; sx < SS; sx++) {
        const p = sample(x + (sx + 0.5) / SS, y + (sy + 0.5) / SS);
        r += p[0]; g += p[1]; b += p[2]; a += p[3];
      }
    }
    const n = SS * SS, o = (y * S + x) * 4;
    buf[o] = Math.round(r / n); buf[o + 1] = Math.round(g / n);
    buf[o + 2] = Math.round(b / n); buf[o + 3] = Math.round(a / n);
  }
}

// encode PNG (RGBA, 8-bit)
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td) >>> 0, 0);
  return Buffer.concat([len, td, crc]);
}
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
  return t;
})();
function crc32(buf) { let c = 0xffffffff; for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(S, 0); ihdr.writeUInt32BE(S, 4); ihdr[8] = 8; ihdr[9] = 6;
const raw = Buffer.alloc((S * 4 + 1) * S);
for (let y = 0; y < S; y++) { raw[y * (S * 4 + 1)] = 0; buf.copy(raw, y * (S * 4 + 1) + 1, y * S * 4, (y + 1) * S * 4); }
const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  chunk('IHDR', ihdr),
  chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0))
]);
const out = process.argv[2] || 'app/icon-1024.png';
fs.writeFileSync(out, png);
console.log('wrote', out, png.length, 'bytes');
