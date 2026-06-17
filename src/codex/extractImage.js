// Find the final image_generation_call result in a parsed response.

/**
 * @param {{ items?: Array<any>, events?: Array<any> }} parsed
 * @returns {{ resultBase64: string, revisedPrompt: string | null, callId?: string }}
 */
export function extractImageGeneration(parsed) {
  const items = parsed?.items ?? [];
  const events = parsed?.events ?? [];

  const item = [...items]
    .reverse()
    .find((it) => it?.type === 'image_generation_call' && it?.result);
  if (item) {
    return {
      callId: item.id,
      revisedPrompt: item.revised_prompt ?? null,
      resultBase64: item.result
    };
  }

  // Fall back to the most complete partial image event.
  const partial = [...events]
    .reverse()
    .find(
      (ev) =>
        ev?.data?.type === 'response.image_generation_call.partial_image' &&
        ev?.data?.partial_image_b64
    );
  if (partial) {
    return {
      callId: partial.data.item_id,
      revisedPrompt: partial.data.revised_prompt ?? null,
      resultBase64: partial.data.partial_image_b64
    };
  }

  const e = new Error('Response completed without an image_generation_call result.');
  e.code = 'MISSING_IMAGE_GENERATION_OUTPUT';
  throw e;
}
