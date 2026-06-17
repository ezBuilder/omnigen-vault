import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import { createPromptStream } from '../src/prompts/promptStream.js';
import { resolveSize } from '../src/sizes.js';
import { imagePath } from '../src/storage/paths.js';
import { buildPrompt, NO_TEXT_SUFFIX } from '../src/prompts/negative.js';
import { parseSseText, extractImageFromStream } from '../src/codex/sse.js';
import { decodeImage } from '../src/storage/saveImage.js';
import { imageFilename, slug } from '../src/storage/paths.js';
import { openVault } from '../src/storage/db.js';
import { CATEGORY_NAMES } from '../src/prompts/taxonomy.js';
import { diskUsage, diskLimitStatus, isOnSystemVolume } from '../src/storage/disk.js';
import { buildGallery } from '../src/gallery/build.js';
import { resolveConfig } from '../src/config.js';

test('prompt stream is deterministic and round-robins categories', () => {
  const a = createPromptStream();
  const b = createPromptStream();
  assert.equal(a.at(0).comboKey, b.at(0).comboKey);
  assert.equal(a.at(12345).basePrompt, b.at(12345).basePrompt);
  // first N indices hit N distinct categories in order
  const n = CATEGORY_NAMES.length;
  const cats = Array.from({ length: n }, (_, i) => a.at(i).category);
  assert.deepEqual(new Set(cats).size, n);
});

test('prompt stream comboKeys are unique across a large range', () => {
  const s = createPromptStream();
  const seen = new Set();
  for (let i = 0; i < 5000; i += 1) {
    const k = s.at(i).comboKey;
    assert.ok(!seen.has(k), `dup comboKey at ${i}: ${k}`);
    seen.add(k);
  }
});

test('prompt stream never runs dry (variant wrap past base space)', () => {
  const s = createPromptStream({ categories: ['nature-landscapes'] });
  const big = s.baseSpaceSize + 10; // beyond one full pass
  const spec = s.at(big * CATEGORY_NAMES.length);
  assert.ok(spec.basePrompt.length > 0);
  assert.equal(spec.category, 'nature-landscapes');
});

test('buildPrompt always injects the no-text directive', () => {
  const p = buildPrompt('a red fox in snow');
  assert.ok(p.includes(NO_TEXT_SUFFIX));
  assert.ok(buildPrompt('x', 2).includes('STRICTLY no text'));
});

test('parseSseText extracts an image_generation_call result', () => {
  const sse = [
    'event: response.created',
    'data: {"type":"response.created","response":{"id":"resp_1"}}',
    '',
    'event: response.output_item.done',
    'data: {"type":"response.output_item.done","item":{"type":"image_generation_call","id":"ig_1","result":"QUJD","revised_prompt":"rp"}}',
    '',
    'event: response.completed',
    'data: {"type":"response.completed","response":{"id":"resp_1"}}',
    ''
  ].join('\n');
  const parsed = parseSseText(sse);
  assert.equal(parsed.responseId, 'resp_1');
  const item = parsed.items.find((i) => i.type === 'image_generation_call');
  assert.equal(item.result, 'QUJD');
});

test('extractImageFromStream stops at the image and returns it', async () => {
  const png = '1x1';
  const sse =
    'event: response.created\ndata: {"type":"response.created","response":{"id":"r9"}}\n\n' +
    `event: response.output_item.done\ndata: {"type":"response.output_item.done","item":{"type":"image_generation_call","result":"QUJD"}}\n\n`;
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(sse));
      controller.close();
    }
  });
  const fakeResponse = { body: stream };
  const out = await extractImageFromStream(fakeResponse);
  assert.equal(out.resultBase64, 'QUJD');
  assert.equal(out.responseId, 'r9');
  void png;
});

test('decodeImage rejects data URLs and decodes raw base64', () => {
  assert.throws(() => decodeImage('data:image/png;base64,QUJD'), /data URL/);
  const { bytes, sha256 } = decodeImage(Buffer.from('hello').toString('base64'));
  assert.equal(bytes.toString(), 'hello');
  assert.equal(sha256.length, 64);
});

test('paths slug + filename are filesystem-safe', () => {
  assert.equal(slug('A Red Fox, in Snow!'), 'a-red-fox-in-snow');
  const name = imageFilename({ subject: 'a red fox', sizeLabel: '2048x2048' }, 'a'.repeat(64));
  assert.match(name, /^a-red-fox__2048x2048__a{12}\.png$/);
});

test('resolveSize maps presets, modes, and raw sizes to request size + bucket', () => {
  const spec = { defaultSize: '3840x2160', orientation: 'landscape' };
  assert.deepEqual(resolveSize('fhd', spec), { size: '2048x1152', bucket: 'fhd' });
  assert.deepEqual(resolveSize('uhd', spec), { size: '3840x2160', bucket: 'uhd' });
  assert.deepEqual(resolveSize('4k', spec), { size: '3840x2160', bucket: 'uhd' });
  assert.deepEqual(resolveSize('square', spec), { size: '1024x1024', bucket: 'square' });
  assert.deepEqual(resolveSize('auto-category', spec), { size: '3840x2160', bucket: 'landscape' });
  assert.deepEqual(resolveSize('2048x2048', spec), { size: '2048x2048', bucket: '2048x2048' });
  assert.deepEqual(resolveSize('auto', spec), { size: 'auto', bucket: '' });
  assert.throws(() => resolveSize('9000x9000', spec), /not supported/);
  assert.throws(() => resolveSize('bogus', spec), /Unknown size/);
});

test('imagePath separates by category then resolution bucket', () => {
  const spec = { category: 'animals-wildlife', subject: 'a red fox' };
  const p = imagePath('/vault/images', spec, 'fhd', '1536x1024', 'a'.repeat(64));
  assert.match(p, /\/images\/animals-wildlife\/fhd\/a-red-fox__1536x1024__a{12}\.png$/);
});

test('theme mode builds a single synthetic category from the given word(s)', () => {
  const s = createPromptStream({ theme: 'a fluffy cat, a sleepy cat' });
  assert.deepEqual(s.scopeNames, ['theme-a-fluffy-cat']);
  assert.ok(s.at(0).subject.includes('cat'));
  // unicode themes keep a usable folder name
  const k = createPromptStream({ theme: '고양이' });
  assert.equal(k.scopeNames[0], 'theme-고양이');
});

test('disk usage + limits + system-volume detection', () => {
  const u = diskUsage('/');
  assert.ok(u.totalBytes > 0 && u.freeBytes >= 0);
  assert.ok(u.usedPercent >= 0 && u.usedPercent <= 100);
  assert.equal(isOnSystemVolume('/'), true);

  const base = { vaultRoot: '/', minFreeGb: 0 };
  assert.equal(diskLimitStatus({ ...base, maxDiskPercent: 100 }).overPercent, false);
  assert.equal(diskLimitStatus({ ...base, maxDiskPercent: 0 }).overPercent, true);
  assert.equal(diskLimitStatus({ vaultRoot: '/', maxDiskPercent: 100, minFreeGb: 1e12 }).underFree, true);
});

test('buildGallery emits a self-contained HTML with the image data', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'omnigen-gal-'));
  const config = resolveConfig({ vaultRoot: dir });
  const v = openVault(config.dbPath);
  v.insertImage({
    combo_key: 'k1', category: 'birds', subject: 'an owl perched at dusk',
    prompt: 'an owl perched at dusk, no text', rel_path: 'images/birds/square/o.png',
    abs_path: path.join(dir, 'o.png'), size_label: '1024x1024', bucket: 'square',
    thumb_rel: 'thumbs/birds/square/o.jpg', sha256: 'c'.repeat(64), status: 'active',
    created_at: new Date().toISOString()
  });
  v.close();

  const res = buildGallery(config, { out: config.galleryPath });
  assert.equal(res.count, 1);
  const html = fs.readFileSync(config.galleryPath, 'utf8');
  assert.match(html, /const DATA =/);
  assert.match(html, /an owl perched at dusk/);
  assert.match(html, /thumbs\/birds\/square\/o\.jpg/);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('vault inserts, dedupes by sha, and full-text searches', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'omnigen-db-'));
  const dbPath = path.join(dir, 'index.sqlite');
  const v = openVault(dbPath);
  try {
    const rec = {
      combo_key: 'nature-landscapes#0#v0',
      global_index: 0,
      category: 'nature-landscapes',
      subject: 'a misty mountain range at dawn',
      style: 'photorealistic',
      lighting: 'golden hour',
      palette: 'warm',
      composition: 'wide',
      mood: 'serene',
      variant: '',
      prompt: 'a misty mountain range at dawn',
      revised_prompt: null,
      rel_path: 'images/nature-landscapes/x.png',
      abs_path: path.join(dir, 'x.png'),
      width: 3840,
      height: 2160,
      size_label: '3840x2160',
      bytes: 123,
      sha256: 'f'.repeat(64),
      model: 'gpt-5.4',
      provider: 'private-codex',
      response_id: 'r1',
      session_id: 's1',
      ocr_ran: 1,
      ocr_char_count: 0,
      ocr_text: '',
      status: 'active',
      tags: JSON.stringify(['nature-landscapes', 'photorealistic']),
      created_at: new Date().toISOString()
    };
    const id = v.insertImage(rec);
    assert.ok(id > 0);
    assert.ok(v.hasSha('f'.repeat(64)));
    assert.ok(v.hasCombo('nature-landscapes#0#v0'));

    // duplicate sha is ignored
    v.insertImage(rec);
    assert.equal(v.stats().total, 1);

    // FTS finds it by subject word
    const hits = v.search('mountain misty');
    assert.equal(hits.length, 1);
    assert.equal(hits[0].subject, 'a misty mountain range at dawn');

    // category filter
    assert.equal(v.search('mountain', { category: 'flora-plants' }).length, 0);

    // cursor state round-trips
    v.setState('cursor', 42);
    assert.equal(v.getState('cursor'), '42');
  } finally {
    v.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
