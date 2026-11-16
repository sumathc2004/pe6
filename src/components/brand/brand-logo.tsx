import type { CSSProperties } from 'react';
import Image, { type StaticImageData } from 'next/image';
import { cn } from '@/lib/cn';
import logoLight from '@/assets/brand/pe6-logo.png';
import logoDark from '@/assets/brand/pe6-logo-dark.png';
import markLight from '@/assets/brand/pe6-mark.png';
import markDark from '@/assets/brand/pe6-mark-dark.png';

const NAME = 'PE6 Payments';

/** Which background the artwork sits on: `light` has black lettering, `dark` has white lettering. */
export type BrandTone = 'light' | 'dark';

/**
 * A soft light that sweeps across the artwork every few seconds — masked to the artwork itself,
 * so it only ever touches the logo, never the background around it. Off for reduced motion.
 */
function Sheen({ art }: { art: StaticImageData }) {
  const mask = `url(${art.src})`;
  const style: CSSProperties = { maskImage: mask, WebkitMaskImage: mask, maskSize: '100% 100%', WebkitMaskSize: '100% 100%' };
  return <span aria-hidden className="logo-sheen pointer-events-none absolute inset-0" style={style} />;
}

/**
 * The artwork, imported rather than referenced by URL: its size comes from the file. It is served
 * as the original PNG (`unoptimized`) — the image optimiser re-compresses to lossy WebP, which
 * softens the logo's edges and makes it look like a photograph.
 */
function Art({ art, width, height, priority, className }: { art: StaticImageData; width: number; height: number; priority: boolean; className?: string }) {
  return (
    <span
      className={cn('group/logo relative inline-block shrink-0 transition-transform duration-300 ease-out hover:-translate-y-px hover:scale-[1.03] motion-reduce:transition-none motion-reduce:hover:transform-none', className)}
      style={{ width, height }}
    >
      <Image src={art} alt={NAME} width={width} height={height} priority={priority} unoptimized className="size-full select-none" draggable={false} />
      <Sheen art={art} />
    </span>
  );
}

/** The PE6 "6" with the card, on its own. */
export function BrandMark({ size = 36, tone = 'light', className, priority = false }: { size?: number; tone?: BrandTone; className?: string; priority?: boolean }) {
  return <Art art={tone === 'dark' ? markDark : markLight} width={size} height={size} priority={priority} className={className} />;
}

/** The full logo, sized by its height (the width follows the artwork). */
export function BrandLogo({ height = 44, tone = 'light', className, priority = false }: { height?: number; tone?: BrandTone; className?: string; priority?: boolean }) {
  const art = tone === 'dark' ? logoDark : logoLight;
  return <Art art={art} width={Math.round((height * art.width) / art.height)} height={height} priority={priority} className={className} />;
}
