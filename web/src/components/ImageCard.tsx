import { Download } from 'lucide-react';
import { withKey } from '@/lib/api';
import { useI18n } from '@/i18n';
import type { ImageItem } from '@/lib/types';

export function ImageCard({
  item,
  onOpen,
  downloadEnabled
}: {
  item: ImageItem;
  onOpen: () => void;
  downloadEnabled: boolean;
}) {
  const { tc } = useI18n();
  const ratio = item.w && item.h ? `${item.w} / ${item.h}` : '1 / 1';
  return (
    <div
      className="group relative mb-3 cursor-zoom-in overflow-hidden rounded-xl border border-border/70 bg-card"
      onClick={onOpen}
    >
      <img
        src={withKey(item.thumb)}
        alt={item.subject}
        loading="lazy"
        decoding="async"
        style={{ aspectRatio: ratio }}
        className="block w-full bg-secondary object-cover transition-transform duration-500 group-hover:scale-[1.03]"
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/95 via-background/50 to-transparent p-3 pt-9 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
        <p className="truncate text-xs font-medium text-foreground">{item.subject}</p>
        <p className="truncate text-[11px] text-muted-foreground">{tc(item.category)}</p>
      </div>
      {downloadEnabled && (
        <a
          href={withKey(item.download)}
          download
          onClick={(e) => e.stopPropagation()}
          aria-label="download"
          className="absolute right-2 top-2 hidden size-8 items-center justify-center rounded-lg border border-border/70 bg-background/70 text-foreground backdrop-blur transition-colors hover:bg-primary hover:text-primary-foreground group-hover:flex"
        >
          <Download className="size-4" />
        </a>
      )}
    </div>
  );
}
