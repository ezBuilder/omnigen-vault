import type { ReactNode } from 'react';
import { CategoryCombobox } from './CategoryCombobox';
import { OrientationToggle } from './OrientationToggle';
import { RatingSelect, SortSelect } from './FilterSelects';
import { useI18n } from '@/i18n';
import type { Facets, Filters } from '@/lib/types';

export function FilterControls({
  filters,
  setFilter,
  facets,
  layout
}: {
  filters: Filters;
  setFilter: <K extends keyof Filters>(k: K, v: Filters[K]) => void;
  facets?: Facets;
  layout: 'row' | 'stack';
}) {
  const { t } = useI18n();
  const stack = layout === 'stack';

  const field = (label: string, node: ReactNode) =>
    stack ? (
      <div key={label} className="space-y-1.5">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        {node}
      </div>
    ) : (
      node
    );

  return (
    <div className={stack ? 'flex flex-col gap-4' : 'flex flex-wrap items-center gap-2'}>
      {field(
        t('category'),
        <CategoryCombobox
          value={filters.category}
          onChange={(v) => setFilter('category', v)}
          categories={facets?.categories ?? []}
          inline={stack}
        />
      )}
      {field(
        t('orientation'),
        <OrientationToggle
          value={filters.orientation}
          onChange={(v) => setFilter('orientation', v)}
          buckets={facets?.buckets}
        />
      )}
      {field(
        t('rate'),
        <RatingSelect value={filters.minRating} onChange={(v) => setFilter('minRating', v)} />
      )}
      {field(t('sort'), <SortSelect value={filters.order} onChange={(v) => setFilter('order', v)} />)}
    </div>
  );
}
