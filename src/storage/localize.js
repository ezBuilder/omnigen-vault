// Localize an image's display subject + prompt into the viewer's language by
// composing translated bounded vocabulary (subject + style/lighting/palette/
// composition/mood/variant + the fixed prompt suffix). No per-image translation:
// the prompt is rebuilt from translated parts, mirroring how it was generated.
import fs from 'node:fs';
import { NO_TEXT_SUFFIX, DESIGN_SUFFIX } from '../prompts/negative.js';

function loadJson(rel) {
  try {
    return JSON.parse(fs.readFileSync(new URL(rel, import.meta.url), 'utf8'));
  } catch {
    return {};
  }
}

const subjectTr = loadJson('../prompts/subjectTranslations.json');
const dimTr = loadJson('../prompts/dimensionTranslations.json');
const DESIGN_CATS = new Set(['web-design', 'mobile-design', 'app-design']);
export const LOCALES = new Set(['ko', 'ja', 'zh', 'es']);

function pick(map, val, lang) {
  const e = val && map[val];
  return (e && e[lang]) || val;
}

/**
 * Localized { subject, prompt } for a row, or the English originals when `lang`
 * is English/unknown. `row` must carry the dimension columns.
 */
export function localizeFields(row, lang) {
  if (!LOCALES.has(lang)) return { subject: row.subject, prompt: row.prompt };
  const subject = pick(subjectTr, row.subject, lang);
  const parts = [];
  if (row.subject) parts.push(subject);
  for (const v of [row.style, row.lighting, row.palette, row.composition, row.mood, row.variant]) {
    if (v) parts.push(pick(dimTr, v, lang));
  }
  const suffix = DESIGN_CATS.has(row.category) ? DESIGN_SUFFIX : NO_TEXT_SUFFIX;
  const prompt = parts.join(', ') + '. ' + pick(dimTr, suffix, lang);
  return { subject, prompt };
}
