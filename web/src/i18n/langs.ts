import type { Lang } from '@/lib/types';

export const LANGS: { code: Lang; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'ko', label: '한국어' },
  { code: 'ja', label: '日本語' },
  { code: 'zh', label: '中文' },
  { code: 'es', label: 'Español' }
];

export const SUPPORTED = new Set<Lang>(LANGS.map((l) => l.code));
