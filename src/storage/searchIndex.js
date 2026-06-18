// Build the multilingual search haystack for one image: English fields + subject
// and category translations (ko/ja/zh/es), so non-English queries match in FTS.
import { CATEGORY_LABELS } from '../prompts/categoryLabels.js';

/**
 * @param {{subject?:string, style?:string, mood?:string, variant?:string,
 *          category?:string, tags?:string, prompt?:string}} row
 * @param {Record<string, {ko?:string,ja?:string,zh?:string,es?:string}>} [subjectTr]
 * @returns {string}
 */
export function buildHaystack(row, subjectTr = {}) {
  const parts = [row.subject, row.style, row.mood, row.variant, row.category, row.tags, row.prompt];
  const st = row.subject && subjectTr[row.subject];
  if (st) parts.push(st.ko, st.ja, st.zh, st.es);
  const cl = row.category && CATEGORY_LABELS[row.category];
  if (cl) parts.push(cl.en, cl.ko, cl.ja, cl.zh, cl.es);
  return parts.filter(Boolean).join(' ');
}
