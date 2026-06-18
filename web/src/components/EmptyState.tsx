import { ImageOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/i18n';

export function EmptyState({ onClear }: { onClear?: () => void }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-center text-muted-foreground">
      <ImageOff className="size-8" />
      <p className="text-sm">{t('none')}</p>
      {onClear && (
        <Button variant="outline" size="sm" onClick={onClear}>
          {t('clearFilters')}
        </Button>
      )}
    </div>
  );
}
