'use client';

import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useBack } from '@/components/layout/navigation-history';

/**
 * The heading every page opens with: a small "Back" link above, the title with a gold marker,
 * description and actions on the right, and a rule beneath it.
 */
export function PageHeader({
  title,
  description,
  eyebrow,
  back,
  onBack,
  actions,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  eyebrow?: ReactNode;
  /** Where Back goes when there is no in-app page to return to. */
  back?: string;
  /** A Back that steps within the page instead (it wins over `back`). */
  onBack?: () => void;
  actions?: ReactNode;
  className?: string;
}) {
  const goBack = useBack();
  return (
    <header className={cn('mb-5 border-b border-slate-200 pb-4', className)}>
      {(back || onBack) && (
        <button
          type="button"
          onClick={() => (onBack ? onBack() : back && goBack(back))}
          className="group mb-2 inline-flex items-center gap-1.5 text-[12px] font-semibold tracking-wide text-slate-500 uppercase transition hover:text-ink-900"
          aria-label="Back"
        >
          <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-0.5" /> Back
        </button>
      )}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex min-w-0 items-stretch gap-3">
          <span className="w-1 shrink-0 rounded-full bg-gold-500" aria-hidden />
          <div className="min-w-0">
            {eyebrow && <p className="mb-0.5 text-[10.5px] font-semibold tracking-[0.18em] text-gold-700 uppercase">{eyebrow}</p>}
            <h1 className="text-[22px] leading-tight font-bold tracking-tight text-ink-900 sm:text-[24px]">{title}</h1>
            {description && <p className="mt-0.5 max-w-2xl text-[13px] text-slate-500">{description}</p>}
          </div>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2.5">{actions}</div>}
      </div>
    </header>
  );
}
