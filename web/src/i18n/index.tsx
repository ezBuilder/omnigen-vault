import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Lang } from '@/lib/types';
import { SUPPORTED } from './langs';
import { makeT } from './ui';
import { categoryLabel } from './categories';

interface I18nCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (k: string) => string;
  tc: (slug: string) => string;
}

const Ctx = createContext<I18nCtx | null>(null);

function initialLang(): Lang {
  const stored = localStorage.getItem('omnilang') as Lang | null;
  if (stored && SUPPORTED.has(stored)) return stored;
  const nav = (navigator.language || 'en').slice(0, 2) as Lang;
  return SUPPORTED.has(nav) ? nav : 'en';
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang);
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  const setLang = (l: Lang) => {
    localStorage.setItem('omnilang', l);
    setLangState(l);
  };
  const value: I18nCtx = {
    lang,
    setLang,
    t: makeT(lang),
    tc: (slug: string) => categoryLabel(slug, lang)
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n(): I18nCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('useI18n must be used within I18nProvider');
  return c;
}
