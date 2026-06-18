import type { ImageItem, Orientation } from './types';

// Visual orientation from ACTUAL pixels (what the viewer sees); the stored bucket is
// only a fallback for legacy rows without dimensions.
export function orientationOf(it: Pick<ImageItem, 'w' | 'h' | 'bucket'>): Exclude<Orientation, 'all'> {
  const w = it.w ?? 0;
  const h = it.h ?? 0;
  if (w && h) {
    if (w > h) return 'landscape';
    if (h > w) return 'portrait';
    return 'square';
  }
  if (it.bucket === 'landscape') return 'landscape';
  if (it.bucket === 'portrait' || it.bucket === 'poster') return 'portrait';
  return 'square';
}
