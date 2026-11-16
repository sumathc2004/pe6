'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/** Underlined tabs: the active one carries a gold rule. */
export function SegmentedTabs<T extends string>({
  items,
  value,
  onChange,
  className,
  label,
}: {
  items: { value: T; label: ReactNode; count?: number }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  label?: string;
}) {
  return (
    <div role="tablist" aria-label={label} className={cn('scrollbar-thin inline-flex max-w-full gap-5 overflow-x-auto overflow-y-hidden border-b border-slate-200', className)}>
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.value)}
            className={cn(
              '-mb-px inline-flex items-center gap-2 border-b-2 px-0.5 py-2 text-[13px] font-semibold whitespace-nowrap transition',
              active ? 'border-gold-500 text-ink-900' : 'border-transparent text-slate-500 hover:text-ink-800',
            )}
          >
            {item.label}
            {item.count !== undefined && (
              <span className={cn('rounded-full px-1.5 text-[11px] tabular', active ? 'bg-ink-900 text-gold-300' : 'bg-slate-200 text-slate-500')}>{item.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
