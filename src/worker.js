// Concurrent, resumable, low-memory generation loop.
//
// A fixed pool of N slots each pull the next prompt index, generate, OCR-verify
// text-free, save by category+resolution, thumbnail, and index in SQLite.
// Memory stays bounded: the SSE body is streamed (never fully buffered) and each
// slot holds at most one image buffer at a time. A disk-usage ceiling and an
// OS-volume guard ensure unbounded generation can never fill the boot disk.
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { UNSUPPORTED_WARNING } from './config.js';
import { resolveSize } from './sizes.js';
import { createCodexProvider } from './codex/provider.js';
import { createPromptStream } from './prompts/promptStream.js';
import { buildPrompt, NO_TEXT_INSTRUCTIONS } from './prompts/negative.js';
import { detectText, ocrAvailable } from './text/ocr.js';
import { decodeImage, writeImage } from './storage/saveImage.js';
import { imagePath, slug } from './storage/paths.js';
import { openVault } from './storage/db.js';
import { assertSafeVolume, diskLimitStatus, diskLimitReason } from './storage/disk.js';
import { makeThumbnail, thumbnailAvailable } from './media/thumbnail.js';
import { parseCaps, overCapCategories, parseUntil } from './quota.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function readPngSize(buffer) {
  if (buffer.length < 24 || buffer.toString('ascii', 12, 16) !== 'IHDR') {
    return { width: null, height: null };
  }
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function buildTags(spec) {
  const head = (s) => slug(String(s).split(',')[0], 32);
  return JSON.stringify(
    [spec.category, head(spec.style), head(spec.mood), head(spec.palette), head(spec.lighting)].filter(Boolean)
  );
}

function assertVaultReachable(vaultRoot) {
  const mount = path.parse(vaultRoot).dir;
  if (!fs.existsSync(mount)) {
    const e = new Error(`Backup disk path not reachable: ${mount}. Is the external drive mounted?`);
    e.code = 'VAULT_UNREACHABLE';
    throw e;
  }
}

export async function runWorker(config, { log = console.log } = {}) {
  assertVaultReachable(config.vaultRoot);
  assertSafeVolume(config); // never fill the OS/boot disk
  log(UNSUPPORTED_WARNING);

  const disk0 = diskLimitStatus(config);
  log(
    `disk: ${disk0.usedPercent.toFixed(1)}% used · ${(disk0.freeBytes / 1e9).toFixed(0)}GB free · ` +
      `limit ${config.maxDiskPercent}% / floor ${config.minFreeGb}GB`
  );

  const vault = openVault(config.dbPath);
  const provider = createCodexProvider(config);
  await provider.ensureSession();
  for (const w of provider.warnings) log(`warning: ${w}`);

  let thumbsOn = config.thumbnails;
  if (thumbsOn && !(await thumbnailAvailable(config.thumbBinary))) {
    log(`warning: thumbnailer "${config.thumbBinary}" not found — skipping thumbnails.`);
    thumbsOn = false;
  }

  const stream = createPromptStream({ categories: config.categories, theme: config.theme });
  log(`categories (${stream.scopeNames.length}): ${stream.scopeNames.join(', ')}`);
  log(`base space ~${stream.baseSpaceSize.toLocaleString()} combos · concurrency ${config.concurrency} · size ${config.size}`);

  let ocrOn = config.ocrEnabled;
  if (ocrOn && !(await ocrAvailable(config.ocrBinary))) {
    log(`warning: OCR binary "${config.ocrBinary}" not found — prompt-only text avoidance.`);
    ocrOn = false;
  }

  const tmpDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'omnigen-'));

  // Optional per-category active-image caps and a scheduled local stop time.
  const caps = parseCaps(config.categoryCaps || '');
  if (caps.size) {
    log(`category caps: ${[...caps].map(([k, n]) => `${k}=${n}`).join(', ')}`);
  }
  const reachedUntil = config.until ? parseUntil(config.until) : null;
  if (config.until) log(`scheduled stop at local ${config.until}`);

  // Over-cap set is recomputed periodically (not every image) to bound query load.
  let overCap = caps.size ? overCapCategories(vault, caps) : new Set();

  const state = {
    cursor: Number(vault.getState('cursor', '0')) || 0,
    running: true,
    produced: 0,
    quarantined: 0,
    stored: 0, // produced + quarantined (everything written to disk)
    duplicates: 0,
    errors: 0,
    sinceCheckpoint: 0,
    startMs: Date.now()
  };

  const grab = () => {
    const i = state.cursor;
    state.cursor += 1;
    return i;
  };

  function checkpoint(force = false) {
    if (!force && state.sinceCheckpoint < config.checkpointEvery) return;
    state.sinceCheckpoint = 0;
    vault.setState('cursor', state.cursor);
  }

  // Aborts in-flight requests so a stop is near-instant rather than waiting out
  // long backend responses.
  const abort = new AbortController();
  const stop = () => {
    if (state.running) {
      state.running = false;
      abort.abort();
      log('\nstopping — cancelling in-flight requests (cursor saved)');
    } else {
      // a second signal forces an immediate exit
      process.exit(0);
    }
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);

  // Generate + verify + store one prompt spec. Returns when done (or skipped).
  async function processSpec(spec, gi) {
    if (caps.size && overCap.has(spec.category)) return; // category at/over its cap
    if (vault.hasCombo(spec.comboKey)) return;
    const { size, bucket: bucketPre } = resolveSize(config.size, spec, gi);

    for (let emphasis = 0; emphasis <= config.textRetries && state.running; emphasis += 1) {
      const prompt = buildPrompt(spec.basePrompt, emphasis);
      let result;
      try {
        result = await provider.generateImage({ prompt, instructions: NO_TEXT_INSTRUCTIONS, size, signal: abort.signal });
      } catch (error) {
        if (error.code === 'ABORTED') return; // stopping — quiet, not an error
        state.errors += 1;
        if (error.code === 'UNAUTHORIZED') {
          log(`! UNAUTHORIZED — stopping. Re-login with the Codex CLI.`);
          state.running = false;
        } else {
          log(`! gen failed [${spec.category}] ${error.code || ''} ${error.message}`.slice(0, 160));
        }
        return;
      }

      let decoded;
      try {
        decoded = decodeImage(result.resultBase64);
      } catch (error) {
        state.errors += 1;
        log(`! decode failed [${spec.category}] ${error.message}`);
        return;
      }
      result.resultBase64 = null; // free the base64 string ASAP

      if (vault.hasSha(decoded.sha256)) {
        state.duplicates += 1;
        return;
      }

      const { width, height } = readPngSize(decoded.bytes);
      // Record actual pixel dimensions (the backend may not honor the request exactly).
      const sizeLabel = width && height ? `${width}x${height}` : size === 'auto' ? 'auto' : size;
      // Folder bucket: chosen resolution tier, or actual pixels when size was "auto".
      const bucket = bucketPre || (width && height ? `${width}x${height}` : 'unsized');

      let ocr = { hasText: false, charCount: 0, text: '', ran: false };
      if (ocrOn) {
        const tmpFile = path.join(tmpDir, `${decoded.sha256.slice(0, 16)}.png`);
        await writeImage(decoded.bytes, tmpFile);
        ocr = await detectText(tmpFile, {
          binary: config.ocrBinary,
          minConfidence: config.ocrMinConfidence,
          minWordLen: config.ocrMinWordLen,
          wordThreshold: config.ocrWordThreshold
        });
        await fsp.unlink(tmpFile).catch(() => {});
      }

      if (ocr.hasText && emphasis < config.textRetries) {
        continue; // regenerate with stronger no-text emphasis
      }

      const status = ocr.hasText ? 'quarantined' : 'active';
      const baseDir = ocr.hasText ? config.quarantineDir : config.imagesDir;
      const finalPath = imagePath(baseDir, spec, bucket, sizeLabel, decoded.sha256);
      await writeImage(decoded.bytes, finalPath);

      // Gallery thumbnail (active images only). Non-fatal on failure.
      let thumbAbs = null;
      let thumbRel = null;
      if (thumbsOn && status === 'active') {
        thumbAbs = path.join(config.thumbsDir, spec.category, bucket, `${decoded.sha256.slice(0, 16)}.jpg`);
        const okThumb = await makeThumbnail(finalPath, thumbAbs, {
          size: config.thumbSize,
          binary: config.thumbBinary
        });
        if (okThumb) {
          thumbRel = path.relative(config.vaultRoot, thumbAbs);
        } else {
          thumbAbs = null;
        }
      }

      vault.insertImage({
        combo_key: spec.comboKey,
        global_index: spec.globalIndex,
        category: spec.category,
        subject: spec.subject,
        style: spec.style,
        lighting: spec.lighting,
        palette: spec.palette,
        composition: spec.composition,
        mood: spec.mood,
        variant: spec.variant,
        prompt,
        revised_prompt: result.revisedPrompt,
        rel_path: path.relative(config.vaultRoot, finalPath),
        abs_path: finalPath,
        width,
        height,
        size_label: sizeLabel,
        bytes: decoded.bytes.length,
        sha256: decoded.sha256,
        bucket,
        thumb_rel: thumbRel,
        thumb_abs: thumbAbs,
        model: config.model,
        provider: config.provider,
        response_id: result.responseId,
        session_id: result.sessionId,
        ocr_ran: ocr.ran,
        ocr_char_count: ocr.charCount,
        ocr_text: ocr.text,
        status,
        tags: buildTags(spec),
        created_at: new Date().toISOString()
      });

      state.sinceCheckpoint += 1;
      state.stored += 1;
      if (status === 'quarantined') {
        state.quarantined += 1;
      } else {
        state.produced += 1;
        const rate = state.produced / Math.max(1, (Date.now() - state.startMs) / 1000);
        log(`✓ [${state.produced}] ${spec.category} · ${sizeLabel} · ${rate.toFixed(2)}/s · ${spec.subject.slice(0, 40)}`);
      }
      checkpoint();
      return;
    }
  }

  // One pool slot: keep grabbing indices until stopped / limit reached.
  async function slot() {
    while (state.running) {
      // bound on images written to disk (clean + quarantined) so the run always
      // terminates, even if many images are quarantined.
      if (config.limit && state.stored >= config.limit) {
        state.running = false;
        break;
      }
      // scheduled stop: halt at the configured local clock time.
      if (reachedUntil && reachedUntil(Date.now())) {
        if (state.running) {
          state.running = false;
          log(`! scheduled stop time ${config.until} reached — stopping.`);
        }
        break;
      }
      // refresh the over-cap set periodically so quotas track live counts.
      if (caps.size && state.stored % config.diskCheckEvery === 0) {
        overCap = overCapCategories(vault, caps);
      }
      // disk safety: stop before we fill the volume (each iteration ≈ one image,
      // so statfs here is effectively throttled to per-image).
      const disk = diskLimitStatus(config);
      if (!disk.ok) {
        if (state.running) {
          state.running = false;
          log(`! disk limit reached: ${diskLimitReason(disk, config)} — stopping.`);
        }
        break;
      }
      const gi = grab();
      try {
        await processSpec(stream.at(gi), gi);
      } catch (error) {
        state.errors += 1;
        log(`! slot error: ${error.message}`.slice(0, 160));
      }
      if (config.minDelayMs > 0) await sleep(config.minDelayMs);
    }
  }

  try {
    await Promise.all(Array.from({ length: config.concurrency }, () => slot()));
  } finally {
    process.off('SIGINT', stop);
    process.off('SIGTERM', stop);
    await fsp.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
    checkpoint(true);
    const s = vault.stats();
    vault.close();
    const secs = (Date.now() - state.startMs) / 1000;
    log(`\n--- summary ---`);
    log(`produced: ${state.produced} · text-quarantined: ${state.quarantined} · dupes: ${state.duplicates} · errors: ${state.errors}`);
    log(`time: ${secs.toFixed(0)}s · rate: ${(state.produced / Math.max(1, secs)).toFixed(2)}/s · cursor: ${state.cursor}`);
    log(`vault total active: ${s.total} · quarantined: ${s.quarantined} · ${(s.bytes / 1e6).toFixed(1)} MB`);
    const diskEnd = diskLimitStatus(config);
    log(`disk: ${diskEnd.usedPercent.toFixed(1)}% used · ${(diskEnd.freeBytes / 1e9).toFixed(0)}GB free (limit ${config.maxDiskPercent}%)`);
  }

  return { produced: state.produced, quarantined: state.quarantined, duplicates: state.duplicates, cursor: state.cursor };
}
