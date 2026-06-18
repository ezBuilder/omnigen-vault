/// <reference types="vite/client" />

declare module '@labels' {
  export const CATEGORY_LABELS: Record<string, Record<string, string>>;
  export function humanizeSlug(slug: string): string;
  export function categoryLabel(slug: string, lang?: string): string;
}
