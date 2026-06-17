// Build the POST /responses payload for the private Codex image_generation tool.
import crypto from 'node:crypto';

import { SUPPORTED_SIZES } from '../config.js';

const SIZE_SET = new Set(SUPPORTED_SIZES);

/**
 * @param {{
 *   baseUrl: string,
 *   session: { accessToken: string, accountId: string, installationId?: string | null },
 *   prompt: string,
 *   instructions?: string,
 *   model: string,
 *   originator: string,
 *   size?: string,
 *   sessionId?: string
 * }} opts
 */
export function buildResponsesRequest({
  baseUrl,
  session,
  prompt,
  instructions = '',
  model,
  originator,
  size,
  sessionId = crypto.randomUUID()
}) {
  if (!prompt || !prompt.trim()) {
    throw new Error('Prompt is required.');
  }
  if (size && size !== 'auto' && !SIZE_SET.has(size)) {
    throw new Error(`Unsupported size "${size}". Supported: ${SUPPORTED_SIZES.join(', ')}.`);
  }

  const url = new URL('responses', baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`).toString();

  const headers = {
    Authorization: `Bearer ${session.accessToken}`,
    'ChatGPT-Account-ID': session.accountId,
    'Content-Type': 'application/json',
    Accept: 'text/event-stream',
    originator,
    session_id: sessionId
  };

  const body = {
    model,
    instructions,
    input: [
      {
        type: 'message',
        role: 'user',
        content: [{ type: 'input_text', text: prompt }]
      }
    ],
    tools: [
      {
        type: 'image_generation',
        output_format: 'png',
        ...(size && size !== 'auto' ? { size } : {})
      }
    ],
    tool_choice: 'auto',
    parallel_tool_calls: false,
    reasoning: null,
    store: false,
    stream: true,
    include: ['reasoning.encrypted_content'],
    client_metadata: session.installationId
      ? { 'x-codex-installation-id': session.installationId }
      : undefined
  };

  return { url, headers, body, sessionId };
}
