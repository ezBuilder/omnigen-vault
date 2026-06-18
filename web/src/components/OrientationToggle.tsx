import { LayoutGrid, RectangleHorizontal, RectangleVertical, Square } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useI18n } from '@/i18n';
import type { Facet, Orientation } from '@/lib/types';

const ITEMS: { value: Orientation; icon: typeof Square; key?: string }[] = [
  { value: 'all', icon: LayoutGrid },
  { value: 'square', icon: Square, key: 'square' },
  { value: 'landscape', icon: RectangleHorizontal, key: 'landscape' },
  { value: 'portrait', icon: RectangleVertical, key: 'portrait' }
];

export function OrientationToggle({
  value,
  onChange,
  buckets
}: {
  value: Orientation;
  onChange: (v: Orientation) => void;
  buckets?: Facet[];
}) {
  const { t } = useI18n();
  const count = (name?: string) => (name ? buckets?.find((b) => b.name === name)?.count : undefined);
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(v) => onChange((v || 'all') as Orientation)}
      className="flex-wrap justify-start gap-1"
    >
      {ITEMS.map(({ value: v, icon: Icon, key }) => {
        const c = count(key);
        return (
          <ToggleGroupItem key={v} value={v} aria-label={key ? t(key) : t('orientation')} className="h-9 gap-1.5 px-3">
            <Icon className="size-4" />
            {key && <span className="text-xs">{t(key)}</span>}
            {c != null && <span className="text-xs text-muted-foreground">{c.toLocaleString()}</span>}
          </ToggleGroupItem>
        );
      })}
    </ToggleGroup>
  );
}
