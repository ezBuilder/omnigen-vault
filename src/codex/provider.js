// Orchestrates a single image generation against the private Codex backend,
// with retry/backoff for rate limits and transient failures.
import { loadCodexSession, validateCodexSession } from '../auth/codexSession.js';
import { buildResponsesRequest } from './buildRequest.js';
import { extractImageFromStream } from './sse.js';

const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createCodexProvider(config) {
  let cachedSession = null;
  let cachedWarnings = [];

  async function ensureSession() {
    if (!cachedSession) {
      cachedSession = await loadCodexSession(config);
      cachedWarnings = validateCodexSession(cachedSession).warnings;
    }
    return cachedSession;
  }

  /**
   * @param {{ prompt: string, instructions?: string, size?: string, dryRun?: boolean, signal?: AbortSignal }} args
   */
  async function generateImage({ prompt, instructions, size, dryRun = false, signal }) {
    const session = await ensureSession();
    const request = buildResponsesRequest({
      baseUrl: config.baseUrl,
      session,
      prompt,
      instructions,
      model: config.model,
      originator: config.originator,
      size
    });

    if (dryRun) {
      return { mode: 'dry-run', warnings: cachedWarnings, sessionId: request.sessionId };
    }

    let attempt = 0;
    let lastError = null;
    while (attempt <= config.maxRetries) {
      if (signal?.aborted) {
        const e = new Error('Generation aborted.');
        e.code = 'ABORTED';
        throw e;
      }
      attempt += 1;
      // Combine the caller's stop signal with a per-request timeout so a stop
      // cancels the in-flight request immediately instead of waiting it out.
      const timeout = AbortSignal.timeout(config.requestTimeoutMs);
      const composite = signal ? AbortSignal.any([signal, timeout]) : timeout;
      try {
        const response = await fetch(request.url, {
          method: 'POST',
          headers: request.headers,
          body: JSON.stringify(request.body),
          signal: composite
        });

        if (!response.ok) {
          const bodyText = await response.text().catch(() => '');
          if (response.status === 401) {
            const e = new Error('Unauthorized (401). Local ChatGPT auth may be expired — re-login with the Codex CLI.');
            e.code = 'UNAUTHORIZED';
            throw e; // not retryable
          }
          if (RETRYABLE_STATUS.has(response.status) && attempt <= config.maxRetries) {
            const wait = backoffMs(attempt, response);
            lastError = new Error(`HTTP ${response.status} from backend; retrying in ${wait}ms.`);
            await sleep(wait);
            continue;
          }
          const e = new Error(`Backend request failed: HTTP ${response.status}. ${bodyText.slice(0, 200)}`);
          e.code = 'HTTP_ERROR';
          e.status = response.status;
          throw e;
        }

        const generation = await extractImageFromStream(response);
        if (!generation.resultBase64) {
          // Treat a stream that yielded no image as retryable.
          if (attempt <= config.maxRetries) {
            lastError = new Error('Stream completed without an image_generation_call result.');
            await sleep(backoffMs(attempt));
            continue;
          }
          const e = new Error('Stream completed without an image_generation_call result.');
          e.code = 'MISSING_IMAGE_GENERATION_OUTPUT';
          throw e;
        }
        return {
          mode: 'live',
          warnings: cachedWarnings,
          resultBase64: generation.resultBase64,
          revisedPrompt: generation.revisedPrompt,
          responseId: generation.responseId,
          sessionId: request.sessionId,
          status: response.status
        };
      } catch (error) {
        // Caller asked to stop → bail immediately, do not retry.
        if (signal?.aborted) {
          const e = new Error('Generation aborted.');
          e.code = 'ABORTED';
          throw e;
        }
        if (error?.code === 'UNAUTHORIZED' || error?.code === 'HTTP_ERROR' || error?.code === 'AUTH_INCOMPLETE') {
          throw error;
        }
        // Network/timeout/parse errors: retry with backoff.
        lastError = error;
        if (attempt > config.maxRetries) break;
        await sleep(backoffMs(attempt));
      }
    }
    throw lastError || new Error('Image generation failed after retries.');
  }

  return { generateImage, ensureSession, get warnings() { return cachedWarnings; } };
}

function backoffMs(attempt, response) {
  // Honor Retry-After when present.
  const retryAfter = response?.headers?.get?.('retry-after');
  if (retryAfter) {
    const secs = Number(retryAfter);
    if (Number.isFinite(secs)) return Math.min(secs * 1000, 120_000);
  }
  const base = Math.min(1000 * 2 ** (attempt - 1), 60_000);
  const jitter = Math.floor(base * 0.25 * Math.random());
  return base + jitter;
}
