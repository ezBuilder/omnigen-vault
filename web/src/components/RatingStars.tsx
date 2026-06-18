import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

export function RatingStars({
  value,
  onRate,
  size = 18,
  readOnly = false
}: {
  value: number;
  onRate?: (v: number) => void;
  size?: number;
  readOnly?: boolean;
}) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((v) => (
        <button
          key={v}
          type="button"
          disabled={readOnly}
          onClick={() => onRate?.(value === v ? 0 : v)}
          className={cn('transition-transform', readOnly ? 'cursor-default' : 'cursor-pointer hover:scale-110')}
          aria-label={String(v)}
        >
          <Star
            style={{ width: size, height: size }}
            className={cn(v <= value ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30')}
          />
        </button>
      ))}
    </div>
  );
}
