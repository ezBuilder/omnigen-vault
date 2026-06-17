// SSE parsing for the Codex /responses stream.
//
// Two modes:
//  - parseSseText(): parse a full buffered body (used by tests).
//  - extractImageFromStream(): stream the response body, keep ONLY the image
//    result + response id, discard every other event immediately, and stop as
//    soon as the full image arrives. This keeps peak memory at ~one image and
//    avoids waiting for trailing reasoning events.

export function parseBlock(block) {
  let event = 'message';
  const dataLines = [];
  for (const line of block.split(/\r?\n/)) {
    if (!line || line.startsWith(':')) continue;
    if (line.startsWith('event:')) {
      event = line.slice(6).trim();
    } else if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).replace(/^ /, ''));
    }
  }
  const dataText = dataLines.join('\n');
  let data = null;
  if (dataText && dataText !== '[DONE]') {
    try {
      data = JSON.parse(dataText);
    } catch (error) {
      const e = new Error(`Malformed SSE JSON for event "${event}": ${error.message}`);
      e.code = 'MALFORMED_SSE_JSON';
      throw e;
    }
  }
  return { event, data };
}

// Pull image payload / response id out of a single parsed event.
function absorb(ev, acc) {
  const type = ev.data?.type;
  if (type === 'response.created' || type === 'response.completed') {
    acc.responseId = ev.data?.response?.id ?? acc.responseId;
  }
  if (type === 'response.output_item.done') {
    const item = ev.data?.item;
    if (item?.type === 'image_generation_call' && item?.result) {
      acc.resultBase64 = item.result;
      acc.revisedPrompt = item.revised_prompt ?? acc.revisedPrompt;
      acc.complete = true; // full image in hand
    }
  } else if (
    type === 'response.image_generation_call.partial_image' &&
    ev.data?.partial_image_b64 &&
    !acc.complete
  ) {
    // keep latest partial as a fallback only
    acc.resultBase64 = ev.data.partial_image_b64;
    acc.revisedPrompt = ev.data.revised_prompt ?? acc.revisedPrompt;
  }
}

/** Buffered parse — returns { items, events, responseId }. */
export function parseSseText(text) {
  const blocks = text.replace(/\r\n/g, '\n').split(/\n\n+/).map((b) => b.trim()).filter(Boolean);
  const events = [];
  const items = [];
  let responseId = null;
  for (const block of blocks) {
    const ev = parseBlock(block);
    events.push(ev);
    const type = ev.data?.type;
    if (type === 'response.created' || type === 'response.completed') {
      responseId = ev.data?.response?.id ?? responseId;
    }
    if (type === 'response.output_item.done' && ev.data?.item) {
      items.push(ev.data.item);
    }
  }
  return { items, events, responseId };
}

/**
 * Stream a fetch Response body, returning the image as soon as it is complete.
 * @param {Response} response
 * @returns {Promise<{ resultBase64: string|null, revisedPrompt: string|null, responseId: string|null }>}
 */
export async function extractImageFromStream(response) {
  const body = response.body;
  if (!body) {
    // No streaming body (e.g. mocked) — fall back to buffered parse.
    const text = await response.text();
    const parsed = parseSseText(text);
    const item = [...parsed.items].reverse().find((it) => it?.type === 'image_generation_call' && it?.result);
    return {
      resultBase64: item?.result ?? null,
      revisedPrompt: item?.revised_prompt ?? null,
      responseId: parsed.responseId
    };
  }

  const reader = body.getReader();
  const decoder = new TextDecoder();
  const acc = { resultBase64: null, revisedPrompt: null, responseId: null, complete: false };
  let buf = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (value) {
        buf += decoder.decode(value, { stream: true });
        buf = buf.replace(/\r\n/g, '\n');
        let idx;
        while ((idx = buf.indexOf('\n\n')) !== -1) {
          const block = buf.slice(0, idx);
          buf = buf.slice(idx + 2);
          if (block.trim()) absorb(parseBlock(block), acc);
          if (acc.complete) break;
        }
        if (acc.complete) break; // stop reading; we have the full image
      }
      if (done) break;
    }
  } finally {
    // Release the network connection immediately to free memory/sockets.
    reader.cancel().catch(() => {});
  }

  return {
    resultBase64: acc.resultBase64,
    revisedPrompt: acc.revisedPrompt,
    responseId: acc.responseId
  };
}
