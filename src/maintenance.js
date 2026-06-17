// Re-evaluate quarantined images with the current OCR settings and promote the
// ones that are actually text-free into the clean library. A move, never a
// delete — images that still show text stay in quarantine.
import fsp from 'node:fs/promises';
import path from 'node:path';

import { openVault } from './storage/db.js';
import { detectText, ocrAvailable } from './text/ocr.js';
import { imagePath } from './storage/paths.js';

async function moveFile(from, to) {
  await fsp.mkdir(path.dirname(to), { recursive: true });
  try {
    await fsp.rename(from, to); // same volume → atomic
  } catch (error) {
    if (error?.code === 'EXDEV') {
      await fsp.copyFile(from, to);
      await fsp.unlink(from).catch(() => {});
    } else {
      throw error;
    }
  }
}

export async function recheckQuarantine(config, { log = console.log } = {}) {
  if (config.ocrEnabled && !(await ocrAvailable(config.ocrBinary))) {
    throw new Error(`OCR binary "${config.ocrBinary}" not found.`);
  }
  const vault = openVault(config.dbPath);
  let promoted = 0;
  let kept = 0;
  let missing = 0;
  try {
    const rows = vault.listByStatus('quarantined');
    log(`rechecking ${rows.length} quarantined image(s)…`);
    for (const row of rows) {
      if (!row.abs_path) {
        missing += 1;
        continue;
      }
      const exists = await fsp.stat(row.abs_path).then(() => true).catch(() => false);
      if (!exists) {
        missing += 1;
        continue;
      }
      const ocr = await detectText(row.abs_path, {
        binary: config.ocrBinary,
        minConfidence: config.ocrMinConfidence,
        minWordLen: config.ocrMinWordLen,
        wordThreshold: config.ocrWordThreshold
      });
      if (ocr.hasText) {
        kept += 1;
        continue;
      }
      const spec = { category: row.category, subject: row.subject };
      const bucket = row.bucket || row.size_label;
      const dest = imagePath(config.imagesDir, spec, bucket, row.size_label, row.sha256);
      await moveFile(row.abs_path, dest);
      vault.setStatus(row.id, 'active', dest, path.relative(config.vaultRoot, dest));
      promoted += 1;
    }
  } finally {
    vault.close();
  }
  log(`recheck done — promoted: ${promoted}, still text: ${kept}, missing files: ${missing}`);
  return { promoted, kept, missing };
}
