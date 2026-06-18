// Model Context Protocol server for omnigen-vault (zero deps: newline-delimited
// JSON-RPC 2.0 over stdio). Exposes tools so any MCP client (Claude Desktop,
// Codex, Cursor, Antigravity, …) can generate or fetch images and receive them
// inline. Launch: `node bin/omnigen-mcp` (or the `omnigen-mcp` bin).
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { resolveConfig } from '../config.js';
import { createCodexProvider } from '../codex/provider.js';
import { buildPrompt, NO_TEXT_INSTRUCTIONS } from '../prompts/negative.js';
import { resolveSize } from '../sizes.js';
import { decodeImage, writeImage } from '../storage/saveImage.js';
import { imagePath, slug } from '../storage/paths.js';
import { openVault } from '../storage/db.js';
import { makeThumbnail, thumbnailAvailable } from '../media/thumbnail.js';
import { queryVault } from '../query.js';
import { detectText } from '../text/ocr.js';
import { CATEGORY_LABELS } from '../prompts/categoryLabels.js';

const PKG = (() => {
  try { return JSON.parse(fs.readFileSync(new URL('../../package.json', import.meta.url), 'utf8')); }
  catch { return { version: '0.0.0' }; }
})();
const PROTOCOL_VERSION = '2024-11-05';
const config = resolveConfig();
const provider = createCodexProvider(config);

function readPngSize(buf) {
  if (buf.length < 24 || buf.toString('ascii', 12, 16) !== 'IHDR') return { width: null, height: null };
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

const TOOLS = [
  {
    name: 'generate_image',
    description:
      'Generate a brand-new, text-free image from a prompt and return it inline (PNG). ' +
      'Also saves it into the vault and indexes it for later search. Use for "make me an image of …".',
    inputSchema: {
      type: 'object', additionalProperties: false, required: ['prompt'],
      properties: {
        prompt: { type: 'string', description: 'what to depict (English works best)' },
        size: { type: 'string', description: 'square|landscape|portrait|hd|fhd|qhd|uhd|WxH (default square)' },
        no_text: { type: 'boolean', description: 'forbid + OCR-verify no text in the image (default true)' },
        verify_text_free: { type: 'boolean', description: 'run OCR and report if text leaked (default false)' }
      }
    }
  },
  {
    name: 'search_images',
    description:
      'Full-text search the existing vault and return matching images (id, path, localized ' +
      'subject + prompt, metadata; plus the top match inline). Multilingual: queries in Korean/' +
      'Japanese/Chinese/Spanish work. Use to reuse an already-generated image instead of making a new one.',
    inputSchema: {
      type: 'object', additionalProperties: false, required: ['query'],
      properties: {
        query: { type: 'string', description: 'keywords in any supported language' },
        category: { type: 'string', description: 'restrict to a category slug (see list_categories)' },
        orientation: { type: 'string', description: 'square|landscape|portrait' },
        min_rating: { type: 'number', description: 'only images rated >= this (0-5)' },
        lang: { type: 'string', description: 'localize subject + prompt: en|ko|ja|zh|es (default en)' },
        limit: { type: 'number', description: 'max results (default 5)' },
        inline_top: { type: 'boolean', description: 'also return the top match inline (default true)' }
      }
    }
  },
  {
    name: 'get_image',
    description: 'Return a specific vault image inline by its id (from search_images) or absolute path.',
    inputSchema: {
      type: 'object', additionalProperties: false,
      properties: {
        id: { type: 'number', description: 'image id from search_images' },
        path: { type: 'string', description: 'absolute path inside the vault' }
      }
    }
  },
  {
    name: 'list_categories',
    description: 'List all vault categories with localized labels and image counts, for browsing/filtering.',
    inputSchema: {
      type: 'object', additionalProperties: false,
      properties: { lang: { type: 'string', description: 'label language: en|ko|ja|zh|es (default en)' } }
    }
  }
];

async function doGenerate(args) {
  const prompt = String(args.prompt || '').trim();
  if (!prompt) throw new Error('prompt is required');
  const noText = args.no_text !== false;
  const spec = { category: 'mcp', orientation: 'square', defaultSize: '2048x2048' };
  const { size, bucket } = resolveSize(args.size || 'square', spec, 0);
  const full = noText ? buildPrompt(prompt, 0) : prompt;
  const result = await provider.generateImage({
    prompt: full, instructions: noText ? NO_TEXT_INSTRUCTIONS : '', size
  });
  const decoded = decodeImage(result.resultBase64);
  const { width, height } = readPngSize(decoded.bytes);
  const sizeLabel = width && height ? `${width}x${height}` : size;
  const subject = prompt.slice(0, 80);
  const finalPath = imagePath(config.imagesDir, { category: 'mcp', subject }, bucket || sizeLabel, sizeLabel, decoded.sha256);
  await writeImage(decoded.bytes, finalPath);

  let ocrNote = '';
  if (args.verify_text_free) {
    const ocr = await detectText(finalPath, {
      binary: config.ocrBinary, minConfidence: config.ocrMinConfidence,
      minWordLen: config.ocrMinWordLen, wordThreshold: config.ocrWordThreshold
    });
    ocrNote = ocr.hasText ? `\n⚠ OCR detected possible text: "${ocr.text}"` : '\n✓ OCR: no text detected';
  }

  // index + thumbnail (best-effort)
  let thumbRel = null;
  try {
    const vault = openVault(config.dbPath);
    let thumbAbs = null;
    if (config.thumbnails && (await thumbnailAvailable(config.thumbBinary))) {
      thumbAbs = path.join(config.thumbsDir, 'mcp', bucket || sizeLabel, `${decoded.sha256.slice(0, 16)}.jpg`);
      if (await makeThumbnail(finalPath, thumbAbs, { size: config.thumbSize, binary: config.thumbBinary })) {
        thumbRel = path.relative(config.vaultRoot, thumbAbs);
      } else thumbAbs = null;
    }
    vault.insertImage({
      combo_key: `mcp#${decoded.sha256.slice(0, 16)}#${crypto.randomUUID().slice(0, 8)}`,
      category: 'mcp', subject, style: 'mcp on-demand', prompt: full,
      rel_path: path.relative(config.vaultRoot, finalPath), abs_path: finalPath,
      width, height, size_label: sizeLabel, bytes: decoded.bytes.length, sha256: decoded.sha256,
      bucket: bucket || sizeLabel, thumb_rel: thumbRel, thumb_abs: thumbAbs,
      provider: config.provider, status: 'active', tags: JSON.stringify(['mcp']),
      created_at: new Date().toISOString()
    });
    vault.close();
  } catch { /* indexing is best-effort */ }

  return {
    content: [
      { type: 'text', text: `Generated ${sizeLabel} image → ${finalPath}${ocrNote}` },
      { type: 'image', data: decoded.bytes.toString('base64'), mimeType: 'image/png' }
    ]
  };
}

function doSearch(args) {
  const rows = queryVault(config, {
    query: String(args.query || ''),
    category: args.category || null,
    orientation: args.orientation || null,
    minRating: args.min_rating || 0,
    lang: String(args.lang || 'en'),
    limit: args.limit || 5
  });
  if (!rows.length) return { content: [{ type: 'text', text: `No matches for "${args.query}".` }] };
  const meta = rows.map((r) => ({
    id: r.id, path: r.path, category: r.category, subject: r.subject,
    prompt: r.prompt, size: r.size, orientation: r.orientation, rating: r.rating
  }));
  const content = [{ type: 'text', text: JSON.stringify(meta, null, 2) }];
  if (args.inline_top !== false) {
    try {
      const top = rows[0];
      if (top?.path && fs.existsSync(top.path)) {
        content.push({ type: 'image', data: fs.readFileSync(top.path).toString('base64'), mimeType: 'image/png' });
      }
    } catch { /* inline best-effort */ }
  }
  return { content };
}

function imagePathById(id) {
  const vault = openVault(config.dbPath);
  try {
    const row = vault.db.prepare('SELECT abs_path FROM images WHERE id = ? AND status = ?').get(Number(id), 'active');
    return row ? row.abs_path : null;
  } finally {
    vault.close();
  }
}

async function doGet(args) {
  let p = String(args.path || '');
  if (!p && args.id != null) {
    p = imagePathById(args.id);
    if (!p) throw new Error(`no active image with id ${args.id}`);
  }
  if (!p) throw new Error('id or path is required');
  const real = fs.realpathSync(path.resolve(p));
  const root = fs.realpathSync(path.resolve(config.vaultRoot));
  if (!(real === root || real.startsWith(root + path.sep))) throw new Error('path is outside the vault');
  return { content: [{ type: 'image', data: fs.readFileSync(real).toString('base64'), mimeType: 'image/png' }] };
}

function doCategories(args) {
  const lang = String(args.lang || 'en');
  const vault = openVault(config.dbPath);
  try {
    const out = vault.stats().byCategory.map((c) => {
      const e = CATEGORY_LABELS[c.category];
      return { category: c.category, label: (e && (e[lang] || e.en)) || c.category, count: c.c };
    });
    return { content: [{ type: 'text', text: JSON.stringify(out, null, 2) }] };
  } finally {
    vault.close();
  }
}

async function handle(method, params) {
  switch (method) {
    case 'initialize':
      return { protocolVersion: PROTOCOL_VERSION, capabilities: { tools: {} }, serverInfo: { name: 'omnigen-vault', version: PKG.version } };
    case 'ping':
      return {};
    case 'tools/list':
      return { tools: TOOLS };
    case 'tools/call': {
      const { name, arguments: a = {} } = params || {};
      if (name === 'generate_image') return await doGenerate(a);
      if (name === 'search_images') return doSearch(a);
      if (name === 'get_image') return await doGet(a);
      if (name === 'list_categories') return doCategories(a);
      throw new Error(`unknown tool: ${name}`);
    }
    default:
      throw new Error(`method not found: ${method}`);
  }
}

// ---- stdio JSON-RPC loop (newline-delimited) ----
let buf = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  buf += chunk;
  let idx;
  while ((idx = buf.indexOf('\n')) !== -1) {
    const line = buf.slice(0, idx).trim();
    buf = buf.slice(idx + 1);
    if (line) dispatch(line);
  }
});

async function dispatch(line) {
  let msg;
  try { msg = JSON.parse(line); } catch { return; }
  if (msg.method && msg.id === undefined) return; // notification (e.g. initialized) → no reply
  try {
    const result = await handle(msg.method, msg.params);
    reply({ jsonrpc: '2.0', id: msg.id, result });
  } catch (err) {
    reply({ jsonrpc: '2.0', id: msg.id, error: { code: -32603, message: String(err?.message || err) } });
  }
}

function reply(obj) {
  process.stdout.write(JSON.stringify(obj) + '\n');
}
