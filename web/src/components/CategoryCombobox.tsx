import { useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n';
import type { Facet } from '@/lib/types';

export function CategoryCombobox({
  value,
  onChange,
  categories,
  inline = false
}: {
  value: string;
  onChange: (v: string) => void;
  categories: Facet[];
  /** Render the list inline (no popover) — used inside the mobile filter sheet. */
  inline?: boolean;
}) {
  const { t, tc } = useI18n();
  const [open, setOpen] = useState(false);
  const label = value ? tc(value) : t('all');

  const list = (close?: () => void) => (
    <Command
      filter={(val, search) => {
        const hay = (val + ' ' + tc(val)).toLowerCase();
        return hay.includes(search.toLowerCase()) ? 1 : 0;
      }}
    >
      <CommandInput placeholder={t('searchCategory')} />
      <CommandList className={inline ? 'max-h-[40dvh]' : undefined}>
        <CommandEmpty>{t('none')}</CommandEmpty>
        <CommandGroup>
          <CommandItem
            value="all"
            onSelect={() => {
              onChange('');
              close?.();
            }}
          >
            <Check className={cn('mr-2 size-4', value === '' ? 'opacity-100' : 'opacity-0')} />
            {t('all')}
          </CommandItem>
          {categories.map((c) => (
            <CommandItem
              key={c.name}
              value={c.name}
              onSelect={() => {
                onChange(c.name);
                close?.();
              }}
            >
              <Check className={cn('mr-2 size-4', value === c.name ? 'opacity-100' : 'opacity-0')} />
              <span className="flex-1 truncate">{tc(c.name)}</span>
              <span className="ml-2 text-xs text-muted-foreground">{c.count.toLocaleString()}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  );

  // Mobile (inside the filter bottom-sheet): render the list inline. A nested Radix
  // Popover inside the Sheet can open off-screen, get clipped, or fight the sheet for
  // focus on phones — an inline list avoids that whole class of problems.
  if (inline) {
    return <div className="overflow-hidden rounded-md border">{list()}</div>;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="h-9 w-full justify-between font-normal sm:w-60"
        >
          <span className="truncate">{label}</span>
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        {list(() => setOpen(false))}
      </PopoverContent>
    </Popover>
  );
}
