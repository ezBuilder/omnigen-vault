import type { AppConfig, Facets, Filters, SearchResponse } from './types';

// Optional access token (?k=) — thread it onto EVERY API/image URL, matching the
// hardened server's gate. The only place a backend URL is built.
const K = new URLSearchParams(window.location.search).get('k');

export function withKey(url: string): string {
  if (!K) return url;
  return url + (url.includes('?') ? '&' : '?') + 'k=' + encodeURIComponent(K);
}

async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(withKey(url), { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as T;
}

export const PAGE_SIZE = 60;

export function searchImages(
  filters: Filters,
  page: { offset: number; limit: number },
  lang: string,
  signal?: AbortSignal
): Promise<SearchResponse> {
  const p = new URLSearchParams();
  if (filters.q) p.set('q', filters.q);
  if (filters.category) p.set('category', filters.category);
  if (filters.orientation && filters.orientation !== 'all') p.set('orientation', filters.orientation);
  if (filters.minRating > 0) p.set('minRating', String(filters.minRating));
  if (filters.order) p.set('order', filters.order);
  if (lang && lang !== 'en') p.set('lang', lang);
  p.set('offset', String(page.offset));
  p.set('limit', String(page.limit));
  return getJson<SearchResponse>('/api/search?' + p.toString(), signal);
}

export function getFacets(signal?: AbortSignal): Promise<Facets> {
  return getJson<Facets>('/api/facets', signal);
}

export function getConfig(signal?: AbortSignal): Promise<AppConfig> {
  return getJson<AppConfig>('/api/config', signal);
}

export async function rateImage(id: number, rating: number): Promise<void> {
  const res = await fetch(withKey('/api/rate'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ id, rating })
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}
