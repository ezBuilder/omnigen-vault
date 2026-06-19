import { useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from '@/components/ui/sheet';
import { SearchBar } from './SearchBar';
import { LanguageMenu } from './LanguageMenu';
import { FilterControls } from './FilterControls';
import { useI18n } from '@/i18n';
import type { Facets, Filters } from '@/lib/types';

export function Header({
  filters,
  setFilter,
  facets,
  total,
  activeCount,
  onClearAll
}: {
  filters: Filters;
  setFilter: <K extends keyof Filters>(k: K, v: Filters[K]) => void;
  facets?: Facets;
  total?: number;
  activeCount: number;
  onClearAll: () => void;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const count = total != null ? `${total.toLocaleString()} ${t('results')}` : '';

  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-screen-2xl flex-col gap-3 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 font-semibold">
            <img src="/icon.png" alt="" className="size-7 rounded-[7px]" />
            <span className="text-[15px]">{t('title')}</span>
          </div>
          <span className="hidden text-xs text-muted-foreground sm:inline">{count}</span>
          <div className="ml-auto flex items-center gap-2">
            <div className="hidden w-[min(440px,42vw)] md:block">
              <SearchBar value={filters.q} onChange={(v) => setFilter('q', v)} />
            </div>
            <LanguageMenu />
          </div>
        </div>

        <div className="md:hidden">
          <SearchBar value={filters.q} onChange={(v) => setFilter('q', v)} />
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <FilterControls filters={filters} setFilter={setFilter} facets={facets} layout="row" />
          {activeCount > 0 && (
            <Button variant="ghost" size="sm" onClick={onClearAll} className="text-muted-foreground">
              {t('clearFilters')}
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" className="gap-2">
                <SlidersHorizontal className="size-4" />
                {t('filters')}
                {activeCount > 0 && (
                  <Badge variant="secondary" className="ml-1 px-1.5">
                    {activeCount}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="max-h-[88dvh] overflow-y-auto rounded-t-2xl">
              <SheetHeader className="text-left">
                <SheetTitle>{t('filters')}</SheetTitle>
              </SheetHeader>
              <div className="py-4">
                <FilterControls filters={filters} setFilter={setFilter} facets={facets} layout="stack" />
              </div>
              <SheetFooter className="flex-row gap-2">
                <Button variant="outline" className="flex-1" onClick={onClearAll}>
                  {t('reset')}
                </Button>
                <SheetClose asChild>
                  <Button className="flex-1">{t('apply')}</Button>
                </SheetClose>
              </SheetFooter>
            </SheetContent>
          </Sheet>
          <span className="ml-auto text-xs text-muted-foreground">{count}</span>
        </div>
      </div>
    </header>
  );
}
