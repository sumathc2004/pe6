import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

/** Every surface: white, a flat hairline border, the same small radius everywhere. */
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-xl border border-slate-200 bg-white', className)} {...props} />;
}

export type HeadingTone = 'navy' | 'gold';

const CHIP: Record<HeadingTone, string> = {
  navy: 'bg-ink-900 text-gold-400',
  gold: 'bg-gold-500 text-ink-950',
};

/**
 * The one section heading used across the portal — Home's groups, Admin's groups, Reports, and
 * every card on every page: a gradient chip in the logo's navy (or gold), the title in the display
 * face, one line of caption, and actions on the right. Same anatomy everywhere, so people learn
 * it once.
 */
export function SectionHeading({
  title,
  description,
  icon,
  actions,
  tone = 'navy',
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  actions?: ReactNode;
  tone?: HeadingTone;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-wrap items-center justify-between gap-3', className)}>
      <div className="flex min-w-0 items-center gap-3">
        {icon && <span className={cn('grid size-8 shrink-0 place-items-center rounded-md [&_svg]:size-4', CHIP[tone])}>{icon}</span>}
        <div className="min-w-0">
          <h2 className="truncate text-[15px] leading-tight font-bold text-ink-900">{title}</h2>
          {description && <p className="line-clamp-2 text-[12px] leading-snug text-slate-500">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** A card's heading row: the section heading with a hairline under it. */
export function CardHeader({
  title,
  description,
  icon,
  actions,
  tone,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  actions?: ReactNode;
  tone?: HeadingTone;
  className?: string;
}) {
  return <SectionHeading title={title} description={description} icon={icon} actions={actions} tone={tone} className={cn('border-b border-slate-100 px-4 py-3', className)} />;
}

export function CardBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-5', className)} {...props} />;
}
