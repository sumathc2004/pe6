import type { ReactNode } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';
import { ServiceMark } from '@/components/brand/service-mark';

/**
 * Something you open — an admin tool, a report. One row: the service's mark (a real logo or a 3D
 * illustration), its name, one line of what it does, optional meta, and a chevron. Used by Admin
 * and Reports alike so both read and behave the same.
 *
 * Three states, kept visibly different so nobody mistakes "pointing at" for "chosen":
 *   rest      white, flat hairline border
 *   hover     the border darkens and a gold rule appears on the left edge
 *   selected  a solid black border, a thicker gold rule and a filled chevron
 */
export function ActionCard({
  title,
  description,
  mark,
  meta,
  href,
  onClick,
  selected = false,
  compact = false,
  className,
}: {
  title: string;
  description: string;
  mark: { src: string; logo?: boolean };
  meta?: ReactNode;
  href?: string;
  onClick?: () => void;
  selected?: boolean;
  /** Shorter row with a one-line description — for long lists that must fit one screen. */
  compact?: boolean;
  className?: string;
}) {
  const cls = cn(
    'group relative flex w-full items-center gap-3.5 overflow-hidden rounded-lg border bg-white px-4 text-left outline-none',
    compact ? 'min-h-12 py-1.5' : 'min-h-16 py-2.5',
    'transition-colors duration-150 motion-reduce:transition-none',
    'focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:ring-offset-2',
    selected ? 'border-ink-900' : 'border-slate-200 hover:border-slate-400',
    className,
  );
  const body = (
    <>
      <span
        className={cn('absolute inset-y-0 left-0 bg-gold-500 transition-all duration-150', selected ? 'w-1.5' : 'w-0 group-hover:w-1')}
        aria-hidden
      />
      <ServiceMark src={mark.src} logo={mark.logo} size="sm" className={cn('rounded-md shadow-none', compact ? 'h-9 w-14' : 'h-11 w-16')} />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-display text-[14px] font-semibold text-ink-900">{title}</span>
        <span className={cn('text-[12.5px] leading-snug text-slate-500', compact ? 'line-clamp-1' : 'line-clamp-2')}>{description}</span>
        {meta && <span className="mt-1 flex flex-wrap items-center gap-1.5">{meta}</span>}
      </span>
      <ChevronRight
        className={cn('size-5 shrink-0 transition duration-150', selected ? 'text-ink-900' : 'text-slate-300 group-hover:translate-x-0.5 group-hover:text-ink-900')}
        aria-hidden
      />
    </>
  );
  return href ? (
    <Link href={href} className={cls}>
      {body}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={cls} aria-pressed={selected}>
      {body}
    </button>
  );
}
