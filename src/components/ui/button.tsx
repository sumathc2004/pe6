import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success' | 'dark';
type Size = 'xs' | 'sm' | 'md' | 'lg' | 'icon' | 'icon-sm';

const variants: Record<Variant, string> = {
  // Gold is the call to action; black is structure.
  primary:
    'bg-gradient-to-b from-gold-400 to-gold-500 text-ink-950 shadow-[inset_0_1px_0_rgb(255_255_255/0.35)] hover:from-gold-300 hover:to-gold-400 hover:shadow-[0_8px_18px_-8px_rgb(192_138_46/0.9),inset_0_1px_0_rgb(255_255_255/0.4)] active:from-gold-500 active:to-gold-600 disabled:from-gold-200 disabled:to-gold-200 disabled:text-gold-700/60 disabled:shadow-none',
  secondary: 'bg-brand-100 text-brand-700 hover:bg-brand-200 active:bg-brand-300 disabled:text-brand-300',
  outline: 'border border-slate-300 bg-white text-ink-800 hover:border-ink-900 hover:bg-slate-50 hover:shadow-sm disabled:border-slate-200 disabled:text-slate-400',
  ghost: 'text-slate-600 hover:bg-slate-200/60 hover:text-ink-900 disabled:text-slate-300',
  danger: 'bg-rose-600 text-white hover:bg-rose-700 hover:shadow-[0_8px_18px_-8px_rgb(225_29_72/0.7)] active:bg-rose-800 disabled:bg-rose-300',
  success: 'bg-jade-600 text-white hover:bg-jade-700 disabled:bg-jade-500/50',
  dark: 'bg-ink-900 text-white hover:bg-black hover:text-gold-300 hover:shadow-[0_8px_18px_-10px_rgb(17_17_17/0.8)] disabled:bg-ink-600',
};

const sizes: Record<Size, string> = {
  xs: 'h-7 gap-1 rounded px-2.5 text-xs',
  sm: 'h-9 gap-1.5 rounded-md px-3.5 text-[13px]',
  md: 'h-10 gap-2 rounded-md px-4 text-sm',
  lg: 'h-12 gap-2 rounded-lg px-6 text-[15px]',
  icon: 'size-10 rounded-md',
  'icon-sm': 'size-8 rounded',
};
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  block?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading = false, block = false, className, children, disabled, type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={cn(
        'inline-flex shrink-0 items-center justify-center font-semibold whitespace-nowrap transition-all duration-150 select-none',
        'enabled:hover:-translate-y-px enabled:active:translate-y-0 enabled:active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-gold-500/60 focus-visible:ring-offset-2 focus-visible:outline-none',
        'disabled:cursor-not-allowed [&_svg]:shrink-0',
        variants[variant],
        sizes[size],
        // Full width, but free to share a row: two block buttons side by side split it instead of overflowing.
        block && 'w-full min-w-0 shrink',
        className,
      )}
      {...props}
    >
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
});
