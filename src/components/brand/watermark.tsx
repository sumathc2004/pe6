import Image from 'next/image';
import { cn } from '@/lib/cn';
import logoLight from '@/assets/brand/pe6-logo.png';

/**
 * The PE6 logo as a very faint watermark. It never takes a click (`pointer-events-none`) and is
 * hidden from screen readers. By default it is fixed to the window and centred in the page area —
 * clear of the top bar and the side menu; pass `className` to place it inside a section instead.
 */
export function Watermark({ className, inApp = false }: { className?: string; inApp?: boolean }) {
  return (
    <div
      aria-hidden
      className={cn(
        'pointer-events-none flex items-center justify-center overflow-hidden',
        // In the portal: fixed, under the top bar (h-14) and beside the menu (its width follows collapse).
        inApp && 'fixed inset-0 z-10 pt-14 lg:pl-52 in-data-[sidebar=collapsed]:lg:pl-16',
        className,
      )}
    >
      <Image src={logoLight} alt="" unoptimized priority={false} draggable={false} className="w-[min(68%,60rem)] max-w-none -rotate-[8deg] opacity-[0.055] select-none" />
    </div>
  );
}
