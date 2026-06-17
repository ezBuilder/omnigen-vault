// Text-free verification via tesseract OCR.
// We run OCR in sparse-text mode and count legible alphanumeric characters;
// above a threshold the image is treated as containing text and rejected.
import { spawn } from 'node:child_process';

function run(binary, args) {
  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    let child;
    try {
      child = spawn(binary, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (error) {
      resolve({ ok: false, stdout: '', stderr: String(error?.message || error), code: -1 });
      return;
    }
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (c) => (stdout += c));
    child.stderr.on('data', (c) => (stderr += c));
    child.on('error', (err) => resolve({ ok: false, stdout, stderr: String(err?.message || err), code: -1 }));
    child.on('close', (code) => resolve({ ok: code === 0, stdout, stderr, code }));
  });
}

/** Is the OCR binary callable? */
export async function ocrAvailable(binary = 'tesseract') {
  const res = await run(binary, ['--version']);
  return res.ok || /tesseract/i.test(res.stdout + res.stderr);
}

/**
 * Detect legible text in an image file using confidence-filtered OCR.
 *
 * tesseract sparse mode emits dozens of low-confidence junk "words" for natural
 * textures, so we parse the TSV output and keep only words that are confident
 * AND multi-character AND alphanumeric — what real rendered text looks like.
 *
 * @param {string} filePath
 * @param {{ binary?: string, minConfidence?: number, minWordLen?: number, wordThreshold?: number }} [opts]
 * @returns {Promise<{ hasText: boolean, wordCount: number, charCount: number, text: string, ran: boolean }>}
 */
export async function detectText(
  filePath,
  { binary = 'tesseract', minConfidence = 70, minWordLen = 3, wordThreshold = 2 } = {}
) {
  // --psm 11 (sparse) finds scattered text; tsv gives per-word confidence.
  const res = await run(binary, [filePath, 'stdout', '--psm', '11', 'tsv']);
  if (!res.ok && !res.stdout) {
    return { hasText: false, wordCount: 0, charCount: 0, text: '', ran: false };
  }

  const words = [];
  let charCount = 0;
  const lines = (res.stdout || '').split('\n');
  for (let i = 1; i < lines.length; i += 1) {
    const cols = lines[i].split('\t');
    if (cols.length < 12) continue;
    const conf = parseFloat(cols[10]);
    const raw = cols[11] ?? '';
    const clean = raw.replace(/[^A-Za-z0-9]/g, '');
    if (Number.isFinite(conf) && conf >= minConfidence && clean.length >= minWordLen) {
      words.push(clean);
      charCount += clean.length;
    }
  }

  return {
    hasText: words.length >= wordThreshold,
    wordCount: words.length,
    charCount,
    text: words.join(' ').slice(0, 500),
    ran: true
  };
}
