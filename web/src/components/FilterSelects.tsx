import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { useI18n } from '@/i18n';
import type { Order } from '@/lib/types';

export function RatingSelect({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const { t } = useI18n();
  return (
    <Select value={String(value)} onValueChange={(v) => onChange(Number(v))}>
      <SelectTrigger className="h-9 w-full sm:w-36">
        <SelectValue placeholder={t('anyRating')} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="0">{t('anyRating')}</SelectItem>
        {[1, 2, 3, 4, 5].map((n) => (
          <SelectItem key={n} value={String(n)}>
            {'★'.repeat(n)}
            <span className="text-muted-foreground">{n < 5 ? '+' : ''}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function SortSelect({ value, onChange }: { value: Order; onChange: (v: Order) => void }) {
  const { t } = useI18n();
  return (
    <Select value={value} onValueChange={(v) => onChange(v as Order)}>
      <SelectTrigger className="h-9 w-full sm:w-36">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="new">{t('newest')}</SelectItem>
        <SelectItem value="old">{t('oldest')}</SelectItem>
        <SelectItem value="top">{t('topRated')}</SelectItem>
      </SelectContent>
    </Select>
  );
}
