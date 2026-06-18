import { useMemo } from 'react';
import { Header } from '@/components/Header';
import { MasonryGrid } from '@/components/MasonryGrid';
import { Lightbox } from '@/components/Lightbox';
import { useFilters } from '@/hooks/useFilters';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useConfig, useFacets, useInfiniteImages } from '@/hooks/useGalleryData';
import { useLightbox } from '@/hooks/useLightbox';
import { useI18n } from '@/i18n';
import type { AppConfig } from '@/lib/types';

const FALLBACK_CONFIG: AppConfig = { ratingEnabled: false, downloadEnabled: true, isPublic: true };

export default function App() {
  const { lang } = useI18n();
  const { filters, setFilter, clearAll, activeCount } = useFilters();
  const debouncedQ = useDebouncedValue(filters.q, 180);
  const queryFilters = useMemo(() => ({ ...filters, q: debouncedQ }), [filters, debouncedQ]);

  const { data: facets } = useFacets();
  const { data: config } = useConfig();
  const cfg = config ?? FALLBACK_CONFIG;

  const query = useInfiniteImages(queryFilters, lang);
  const items = useMemo(() => query.data?.pages.flatMap((p) => p.items) ?? [], [query.data]);
  const total = query.data?.pages[0]?.total;

  const lb = useLightbox(items.length, () => {
    if (query.hasNextPage && !query.isFetchingNextPage) query.fetchNextPage();
  });

  return (
    <div className="min-h-screen">
      <Header
        filters={filters}
        setFilter={setFilter}
        facets={facets}
        total={total}
        activeCount={activeCount}
        onClearAll={clearAll}
      />
      <main className="mx-auto max-w-screen-2xl pt-4">
        <MasonryGrid
          items={items}
          onOpen={lb.open}
          downloadEnabled={cfg.downloadEnabled}
          isLoading={query.isPending}
          isEmpty={!query.isPending && items.length === 0}
          hasMore={!!query.hasNextPage}
          isFetchingMore={query.isFetchingNextPage}
          onMore={() => query.fetchNextPage()}
          onClearFilters={clearAll}
        />
      </main>
      <Lightbox
        items={items}
        index={lb.index}
        onClose={lb.close}
        onPrev={lb.prev}
        onNext={lb.next}
        config={cfg}
      />
    </div>
  );
}
