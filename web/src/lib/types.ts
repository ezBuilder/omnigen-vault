export type Lang = 'en' | 'ko' | 'ja' | 'zh' | 'es';
export type Orientation = 'all' | 'square' | 'landscape' | 'portrait';
export type Order = 'new' | 'old' | 'top';

export interface ImageItem {
  id: number;
  subject: string;
  category: string;
  size: string;
  w: number | null;
  h: number | null;
  bucket: string;
  rating: number;
  style: string;
  prompt: string;
  thumb: string;
  full: string;
  download: string;
}

export interface SearchResponse {
  items: ImageItem[];
  total: number;
}

export interface Facet {
  name: string;
  count: number;
}

export interface Facets {
  categories: Facet[];
  buckets: Facet[];
}

export interface AppConfig {
  ratingEnabled: boolean;
  downloadEnabled: boolean;
  isPublic: boolean;
}

export interface Filters {
  q: string;
  category: string;
  orientation: Orientation;
  minRating: number;
  order: Order;
}

export const DEFAULT_FILTERS: Filters = {
  q: '',
  category: '',
  orientation: 'all',
  minRating: 0,
  order: 'new'
};
