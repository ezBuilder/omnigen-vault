import { useEffect, useRef } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ImageCard } from './ImageCard';
import { EmptyState } from './EmptyState';
import { useI18n } from '@/i18n';
import type { ImageItem } from '@/lib/types';

export function MasonryGrid({
  items,
  onOpen,
  downloadEnabled,
  isLoading,
  isEmpty,
  hasMore,
  isFetchingMore,
  onMore,
  onClearFilters
}: {
  items: ImageItem[];
  onOpen: (index: number) => void;
  downloadEnabled: boolean;
  isLoading: boolean;
  isEmpty: boolean;
  hasMore: boolean;
  isFetchingMore: boolean;
  onMore: () => void;
  onClearFilters: () => void;
}) {
  const { t } = useI18n();
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hasMore) return;
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) onMore();
      },
      { rootMargin: '900px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, onMore]);

  if (isEmpty) return <EmptyState onClear={onClearFilters} />;

  return (
    <div className="px-3 pb-20 sm:px-6">
      <div className="columns-2 gap-3 sm:columns-3 md:columns-4 xl:columns-5 [&>*]:break-inside-avoid">
        {items.map((it, i) => (
          <ImageCard key={it.id} item={it} onOpen={() => onOpen(i)} downloadEnabled={downloadEnabled} />
        ))}
        {isLoading &&
          Array.from({ length: 12 }).map((_, i) => (
            <Skeleton
              key={`sk${i}`}
              className="mb-3 w-full rounded-xl"
              style={{ height: 130 + (i % 4) * 56 }}
            />
          ))}
      </div>
      <div ref={sentinel} className="h-px w-full" />
      {hasMore && (
        <div className="mt-6 flex justify-center">
          <Button variant="outline" onClick={onMore} disabled={isFetchingMore}>
            {isFetchingMore ? t('loading') : t('more')}
          </Button>
        </div>
      )}
    </div>
  );
}
