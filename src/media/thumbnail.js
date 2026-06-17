// Thumbnail generation via macOS `sips` (built-in, zero dependencies).
// Produces small JPEGs for the gallery; failures are non-fatal.
import { spawn } from 'node:child_process';
import fsp from 'node:fs/promises';
import path from 'node:path';

function run(binary, args) {
  return new Promise((resolve) => {
    let child;
    try {
      child = spawn(binary, args, { stdio: ['ignore', 'ignore', 'ignore'] });
    } catch (error) {
      resolve(false);
      return;
    }
    child.on('error', () => resolve(false));
    child.on('close', (code) => resolve(code === 0));
  });
}

export async function thumbnailAvailable(binary = 'sips') {
  return run(binary, ['--version']);
}

/**
 * Create a JPEG thumbnail (longest side = `size`) from a source image.
 * @returns {Promise<boolean>} success
 */
export async function makeThumbnail(srcPath, destPath, { size = 400, binary = 'sips' } = {}) {
  await fsp.mkdir(path.dirname(destPath), { recursive: true });
  return run(binary, ['-s', 'format', 'jpeg', '-Z', String(size), srcPath, '--out', destPath]);
}
