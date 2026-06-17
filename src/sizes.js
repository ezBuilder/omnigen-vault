// Named resolution presets + resolver.
//
// The private Codex backend only honors a fixed set of sizes (and in practice
// normalizes output to ~1.3-1.6 MP regardless), so presets map to the closest
// supported request size. `bucket` is the folder name used to separate images
// by resolution tier: images/<category>/<bucket>/<file>.png
import { SUPPORTED_SIZES } from './config.js';

const SUPPORTED = new Set(SUPPORTED_SIZES);

// name -> { size: <backend request size>, bucket: <folder name> }
export const RESOLUTION_PRESETS = {
  square: { size: '1024x1024', bucket: 'square' }, // 1:1 ~1MP
  'square-xl': { size: '2048x2048', bucket: 'square-xl' }, // 1:1 large
  landscape: { size: '1536x1024', bucket: 'landscape' }, // 3:2
  portrait: { size: '1024x1536', bucket: 'portrait' }, // 2:3
  hd: { size: '2048x1152', bucket: 'hd' }, // 16:9 (720p intent)
  fhd: { size: '2048x1152', bucket: 'fhd' }, // 16:9 (1080p intent)
  qhd: { size: '3840x2160', bucket: 'qhd' }, // 16:9 (1440p intent)
  uhd: { size: '3840x2160', bucket: 'uhd' }, // 16:9 4K
  '4k': { size: '3840x2160', bucket: 'uhd' },
  wuhd: { size: '3840x2160', bucket: 'wuhd' }, // ultrawide intent (no true 21:9 support)
  'uhd-portrait': { size: '2160x3840', bucket: 'uhd-portrait' } // 9:16 4K
};

export const PRESET_NAMES = Object.keys(RESOLUTION_PRESETS);

/**
 * Resolve a size option into the backend request size + the folder bucket.
 * @param {string} option - preset name | "WxH" | "auto-category" | "rotate" | "auto"
 * @param {{ defaultSize: string, orientation: string }} spec
 * @param {number} [rotateIndex]
 * @returns {{ size: string, bucket: string }} `bucket==='' ` means derive from actual pixels later.
 */
export function resolveSize(option, spec, rotateIndex = 0) {
  if (!option || option === 'auto-category') {
    return { size: spec.defaultSize, bucket: spec.orientation };
  }
  if (option === 'rotate') {
    const s = SUPPORTED_SIZES[rotateIndex % SUPPORTED_SIZES.length];
    return { size: s, bucket: s };
  }
  if (option === 'auto') {
    return { size: 'auto', bucket: '' }; // folder decided from real pixels
  }
  const key = String(option).toLowerCase();
  if (RESOLUTION_PRESETS[key]) {
    return { size: RESOLUTION_PRESETS[key].size, bucket: RESOLUTION_PRESETS[key].bucket };
  }
  if (/^\d+x\d+$/.test(option)) {
    if (!SUPPORTED.has(option)) {
      throw new Error(`Size ${option} is not supported by the backend. Supported: ${SUPPORTED_SIZES.join(', ')}.`);
    }
    return { size: option, bucket: option };
  }
  throw new Error(
    `Unknown size "${option}". Use a preset (${PRESET_NAMES.join(', ')}), a WxH value, auto-category, rotate, or auto.`
  );
}
