// Text-free enforcement at the prompt level.
// The private image_generation tool has no separate negative field, so we bake
// strong "no text" guidance into both the prompt and the request instructions.

export const NO_TEXT_SUFFIX =
  'Absolutely no text of any kind: no letters, no words, no numbers, no captions, ' +
  'no labels, no signage, no typography, no watermark, no signature, no logo, no ' +
  'brand marks, no UI, no subtitles. The image must be purely visual with zero ' +
  'written characters.';

export const NO_TEXT_INSTRUCTIONS =
  'You are generating a purely visual image. Under no circumstances render any ' +
  'text, letters, numbers, words, captions, watermarks, logos, or written symbols ' +
  'anywhere in the image. If the subject would normally include text (signs, ' +
  'labels, screens, books), depict it blank or abstract with no legible characters.';

/**
 * Compose the final prompt sent to the backend.
 * @param {string} base
 * @param {number} [emphasis] extra reinforcement level for regeneration retries
 */
export function buildPrompt(base, emphasis = 0) {
  let prompt = `${base.trim()}. ${NO_TEXT_SUFFIX}`;
  for (let i = 0; i < emphasis; i += 1) {
    prompt += ' STRICTLY no text or characters anywhere.';
  }
  return prompt;
}
