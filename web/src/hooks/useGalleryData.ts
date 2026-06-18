import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { getConfig, getFacets, PAGE_SIZE, searchImages } from '@/lib/api';
import { qk } from '@/lib/queryKeys';
import type { Filters } from '@/lib/types';

export function useInfiniteImages(filters: Filters, lang: string) {
  return useInfiniteQuery({
    queryKey: qk.search(filters, lang),
    queryFn: ({ pageParam, signal }) =>
      searchImages(filters, { offset: pageParam, limit: PAGE_SIZE }, lang, signal),
    initialPageParam: 0,
    getNextPageParam: (last, all) => {
      const loaded = all.reduce((n, p) => n + p.items.length, 0);
      return loaded < last.total ? loaded : undefined;
    }
  });
}

export function useFacets() {
  return useQuery({
    queryKey: qk.facets,
    queryFn: ({ signal }) => getFacets(signal),
    staleTime: 60_000
  });
}

export function useConfig() {
  return useQuery({
    queryKey: qk.config,
    queryFn: ({ signal }) => getConfig(signal),
    staleTime: Infinity
  });
}
