import { useCallback, useEffect, useState } from 'react';
import { DEFAULT_FILTERS, type Filters, type Order, type Orientation } from '@/lib/types';

const ORIENTATIONS: Orientation[] = ['all', 'square', 'landscape', 'portrait'];
const ORDERS: Order[] = ['new', 'old', 'top'];

function parse(): Filters {
  const p = new URLSearchParams(window.location.search);
  const ori = p.get('orientation') as Orientation;
  const order = p.get('order') as Order;
  return {
    q: p.get('q') || '',
    category: p.get('category') || '',
    orientation: ORIENTATIONS.includes(ori) ? ori : 'all',
    minRating: Math.min(5, Math.max(0, parseInt(p.get('minRating') || '0', 10) || 0)),
    order: ORDERS.includes(order) ? order : 'new'
  };
}

function write(f: Filters) {
  const p = new URLSearchParams(window.location.search); // preserves ?k= token
  const set = (k: string, v: string, def: string) => {
    if (v && v !== def) p.set(k, v);
    else p.delete(k);
  };
  set('q', f.q, '');
  set('category', f.category, '');
  set('orientation', f.orientation, 'all');
  set('minRating', f.minRating ? String(f.minRating) : '', '');
  set('order', f.order, 'new');
  const qs = p.toString();
  window.history.replaceState(null, '', window.location.pathname + (qs ? '?' + qs : ''));
}

export function useFilters() {
  const [filters, setFilters] = useState<Filters>(parse);

  useEffect(() => {
    write(filters);
  }, [filters]);

  const setFilter = useCallback(<K extends keyof Filters>(key: K, value: Filters[K]) => {
    setFilters((f) => ({ ...f, [key]: value }));
  }, []);

  const clearAll = useCallback(() => setFilters({ ...DEFAULT_FILTERS }), []);

  const activeCount =
    (filters.q ? 1 : 0) +
    (filters.category ? 1 : 0) +
    (filters.orientation !== 'all' ? 1 : 0) +
    (filters.minRating > 0 ? 1 : 0);

  return { filters, setFilter, clearAll, activeCount };
}
