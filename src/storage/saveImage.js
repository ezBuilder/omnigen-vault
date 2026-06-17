// Decode a base64 PNG payload, hash it, and write it to disk.
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

function assertRawBase64(value) {
  if (/^data:/i.test(value)) {
    const e = new Error('Expected raw base64 PNG bytes, not a data URL.');
    e.code = 'UNSUPPORTED_DATA_URL';
    throw e;
  }
  if (!/^[A-Za-z0-9+/=\s]+$/.test(value)) {
    const e = new Error('Image payload is not standard base64.');
    e.code = 'INVALID_BASE64';
    throw e;
  }
}

/** Decode base64 -> Buffer + sha256, without touching disk. */
export function decodeImage(resultBase64) {
  assertRawBase64(resultBase64);
  const bytes = Buffer.from(resultBase64.trim(), 'base64');
  if (!bytes.length) {
    const e = new Error('Decoded image payload is empty.');
    e.code = 'EMPTY_IMAGE_PAYLOAD';
    throw e;
  }
  const sha256 = crypto.createHash('sha256').update(bytes).digest('hex');
  return { bytes, sha256 };
}

/** Write a decoded buffer to outputPath (creating parent dirs). */
export async function writeImage(bytes, outputPath) {
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, bytes);
  return outputPath;
}
