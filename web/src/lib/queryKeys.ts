import type { Filters } from './types';

export const qk = {
  search: (f: Filters, lang: string) =>
    ['search', lang, f.q, f.category, f.orientation, f.minRating, f.order] as const,
  facets: ['facets'] as const,
  config: ['config'] as const
};
