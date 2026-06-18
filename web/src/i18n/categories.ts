import { CATEGORY_LABELS, humanizeSlug } from '@labels';
import type { Lang } from '@/lib/types';

export function categoryLabel(slug: string, lang: Lang): string {
  const e = CATEGORY_LABELS[slug];
  return (e && (e[lang] || e.en)) || humanizeSlug(slug);
}

function norm(s: string): string {
  return String(s).toLowerCase().replace(/[\s·.&,_/-]+/g, '');
}

let index: Map<string, string> | null = null;
function buildIndex(): Map<string, string> {
  const m = new Map<string, string>();
  for (const slug of Object.keys(CATEGORY_LABELS)) {
    m.set(norm(slug), slug);
    for (const v of Object.values(CATEGORY_LABELS[slug])) m.set(norm(v), slug);
  }
  return m;
}

// Map a free-text query to a category slug when it matches a localized label.
export function matchCategory(query: string): string | null {
  if (!index) index = buildIndex();
  const n = norm(query);
  if (n.length < 2) return null;
  if (index.has(n)) return index.get(n)!;
  for (const [k, slug] of index) if (k.includes(n)) return slug;
  return null;
}
