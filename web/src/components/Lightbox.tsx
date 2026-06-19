import { useEffect, useRef, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Copy, Download } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { RatingStars } from './RatingStars';
import { withKey, rateImage } from '@/lib/api';
import { orientationOf } from '@/lib/orientation';
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';
import { useI18n } from '@/i18n';
import type { AppConfig, ImageItem } from '@/lib/types';

export function Lightbox({
  items,
  index,
  onClose,
  onPrev,
  onNext,
  config
}: {
  items: ImageItem[];
  index: number | null;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  config: AppConfig;
}) {
  const { t, tc } = useI18n();
  const { copied, copy } = useCopyToClipboard();
  const item = index != null ? items[index] : undefined;
  const [loaded, setLoaded] = useState(false);
  const [rating, setRating] = useState(0);
  const touch = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    setLoaded(false);
    if (item) setRating(item.rating);
  }, [item?.id]);

  const onTouchStart = (e: React.TouchEvent) => {
    touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touch.current) return;
    const dx = e.changedTouches[0].clientX - touch.current.x;
    const dy = e.changedTouches[0].clientY - touch.current.y;
    touch.current = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) (dx > 0 ? onPrev : onNext)();
    else if (dy > 90 && Math.abs(dy) > Math.abs(dx)) onClose();
  };

  const doCopy = () => {
    if (item) {
      copy(item.prompt);
      toast.success(t('copied'));
    }
  };
  const doRate = (v: number) => {
    if (!item) return;
    setRating(v);
    rateImage(item.id, v).catch(() => {});
  };

  return (
    <Dialog open={index != null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="flex h-[94dvh] max-w-[97vw] flex-col gap-0 overflow-hidden border-border bg-background p-0 sm:max-w-[97vw] md:flex-row"
      >
        <DialogTitle className="sr-only">{item?.subject ?? 'image'}</DialogTitle>
        {item && (
          <>
            <div
              className="relative flex min-h-0 flex-1 items-center justify-center bg-black/40 p-3 md:p-6"
              onTouchStart={onTouchStart}
              onTouchEnd={onTouchEnd}
            >
              {!loaded && <Skeleton className="absolute inset-6 rounded-lg" />}
              <img
                key={item.id}
                src={withKey(item.full)}
                alt={item.subject}
                onLoad={() => setLoaded(true)}
                className="max-h-full max-w-full rounded-lg object-contain"
              />
              <button
                onClick={onPrev}
                aria-label={t('prev')}
                className="absolute left-2 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-background/60 text-foreground backdrop-blur transition-colors hover:bg-background/90 md:left-4"
              >
                <ChevronLeft className="size-6" />
              </button>
              <button
                onClick={onNext}
                aria-label={t('next')}
                className="absolute right-2 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-background/60 text-foreground backdrop-blur transition-colors hover:bg-background/90 md:right-4"
              >
                <ChevronRight className="size-6" />
              </button>
            </div>

            <div className="flex w-full shrink-0 flex-col border-t border-border bg-card md:w-[340px] md:border-l md:border-t-0">
              <div className="flex flex-wrap items-center gap-2 p-4 pb-2">
                <Badge variant="secondary">{tc(item.category)}</Badge>
                <Badge variant="outline">{item.size}</Badge>
                <Badge variant="outline">{t(orientationOf(item))}</Badge>
              </div>
              <p className="px-4 text-[15px] font-medium leading-snug">{item.subject}</p>
              <ScrollArea className="mt-2 max-h-[26dvh] flex-1 px-4 md:max-h-none">
                <p className="whitespace-pre-wrap pb-4 text-[13px] leading-relaxed text-muted-foreground">
                  {item.prompt}
                </p>
              </ScrollArea>
              <div className="mt-auto flex flex-col gap-3 border-t border-border p-4">
                {config.ratingEnabled && (
                  <RatingStars value={rating} onRate={doRate} size={22} />
                )}
                <div className="flex gap-2">
                  <Button variant="secondary" className="flex-1 gap-2" onClick={doCopy}>
                    {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                    {t('copy')}
                  </Button>
                  {config.downloadEnabled && (
                    <Button asChild className="flex-1 gap-2">
                      <a href={withKey(item.download)} download>
                        <Download className="size-4" />
                        {t('download')}
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
