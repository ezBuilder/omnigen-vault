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
      'Full-text search the existing vault and return matching images (paths + metadata, and the top match inline). ' +
      'Use to reuse an already-generated image instead of making a new one.',
    inputSchema: {
      type: 'object', additionalProperties: false, required: ['query'],
      properties: {
        query: { type: 'string' },
        category: { type: 'string' },
        limit: { type: 'number', description: 'max results (default 5)' },
        inline_top: { type: 'boolean', description: 'also return the top match inline (default true)' }
      }
    }
  },
  {
    name: 'get_image',
    description: 'Return a specific vault image inline by absolute path.',
    inputSchema: {
      type: 'object', additionalProperties: false, required: ['path'],
      properties: { path: { type: 'string' } }
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
  const rows = queryVault(config, { query: String(args.query || ''), category: args.category || null, limit: args.limit || 5 });
  if (!rows.length) return { content: [{ type: 'text', text: `No matches for "${args.query}".` }] };
  const content = [{ type: 'text', text: JSON.stringify(rows.map((r) => ({ path: r.path, category: r.category, subject: r.subject, style: r.style, size: r.size })), null, 2) }];
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

async function doGet(args) {
  const p = String(args.path || '');
  const real = fs.realpathSync(path.resolve(p));
  const root = fs.realpathSync(path.resolve(config.vaultRoot));
  if (!(real === root || real.startsWith(root + path.sep))) throw new Error('path is outside the vault');
  return { content: [{ type: 'image', data: fs.readFileSync(real).toString('base64'), mimeType: 'image/png' }] };
}

async function handle(method, params) {
  switch (method) {
    case 'initialize':
      return { protocolVersion: PROTOCOL_VERSION, capabilities: { tools: {} }, serverInfo: { name: 'omnigen-vault', version: '0.1.0' } };
    case 'ping':
      return {};
    case 'tools/list':
      return { tools: TOOLS };
    case 'tools/call': {
      const { name, arguments: a = {} } = params || {};
      if (name === 'generate_image') return await doGenerate(a);
      if (name === 'search_images') return doSearch(a);
      if (name === 'get_image') return await doGet(a);
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
