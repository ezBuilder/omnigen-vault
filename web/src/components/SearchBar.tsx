import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useI18n } from '@/i18n';

export function SearchBar({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { t } = useI18n();
  return (
    <div className="relative w-full">
      <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t('search')}
        autoComplete="off"
        className="h-11 rounded-full border-border/80 bg-card pl-10 pr-10 text-[15px] shadow-sm"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label={t('close')}
          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}
