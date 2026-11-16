import type { Metadata } from 'next';
import { CreditCard, Landmark, Lock, ShieldCheck } from 'lucide-react';
import { BrandLogo } from '@/components/brand/brand-logo';
import { Watermark } from '@/components/brand/watermark';
import { LoginForm } from '@/features/auth/login-form';
import { site } from '@/config/site';

export const metadata: Metadata = { title: 'Sign in' };

const POINTS = [
  { icon: CreditCard, title: 'Collect', text: 'Card payments by link, credited to your wallet.' },
  { icon: Landmark, title: 'Pay out', text: 'IMPS transfers and credit card bills in one place.' },
  { icon: ShieldCheck, title: 'Stay in control', text: 'Ledgers, reports and exports for every rupee.' },
];

/** Two halves: the brand on black, and the sign-in form on white. */
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      {/* ── Brand half ── */}
      <aside className="bg-aurora relative hidden flex-col justify-between overflow-hidden p-12 text-white lg:flex">
        <BrandLogo height={46} tone="dark" priority />

        <div className="max-w-md">
          <p className="text-[11px] font-semibold tracking-[0.22em] text-gold-400 uppercase">{site.name}</p>
          <h2 className="mt-3 text-[38px] leading-[1.1] font-bold tracking-tight">{site.tagline}</h2>
          <ul className="mt-10 space-y-5">
            {POINTS.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex items-start gap-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-md bg-white/10 text-gold-400 ring-1 ring-white/10">
                  <Icon className="size-5" />
                </span>
                <span>
                  <span className="block text-[15px] font-semibold">{title}</span>
                  <span className="block text-[13.5px] text-brand-300">{text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-[12px] text-brand-400">
          © {new Date().getFullYear()} {site.name}
        </p>
      </aside>

      {/* ── Form half ── */}
      <main className="relative flex flex-col justify-center overflow-hidden bg-white px-6 py-12 sm:px-12">
        <Watermark className="absolute inset-0" />
        <div className="relative mx-auto w-full max-w-[380px]">
          <div className="mb-8 lg:hidden">
            <BrandLogo height={52} priority />
          </div>
          <p className="text-[11px] font-semibold tracking-[0.2em] text-gold-700 uppercase">Welcome back</p>
          <h1 className="mt-2 text-[28px] leading-tight font-bold tracking-tight text-ink-900">Sign in to your counter</h1>
          <p className="mt-2 text-[13.5px] text-slate-500">Use the login ID and password issued to your store.</p>
          <div className="mt-8">
            <LoginForm next={next ?? null} />
          </div>
          <p className="mt-8 flex items-center gap-1.5 border-t border-slate-100 pt-5 text-[12px] text-slate-500">
            <Lock className="size-3.5 text-jade-600" /> Secure session · signs out automatically at midnight
          </p>
        </div>
      </main>
    </div>
  );
}
