import { useCallback, useEffect, useState } from 'react';

export function useLightbox(count: number, onNeedMore?: () => void) {
  const [index, setIndex] = useState<number | null>(null);

  const open = useCallback((i: number) => setIndex(i), []);
  const close = useCallback(() => setIndex(null), []);

  const prev = useCallback(() => {
    setIndex((i) => (i == null ? i : Math.max(0, i - 1)));
  }, []);

  const next = useCallback(() => {
    setIndex((i) => {
      if (i == null) return i;
      const n = i + 1;
      if (n >= count - 3) onNeedMore?.();
      return n >= count ? i : n;
    });
  }, [count, onNeedMore]);

  useEffect(() => {
    if (index == null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowLeft') prev();
      else if (e.key === 'ArrowRight') next();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [index, close, prev, next]);

  return { index, isOpen: index != null, open, close, prev, next };
}
