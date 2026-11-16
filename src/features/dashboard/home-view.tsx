'use client';

import { useState, type ComponentType, type CSSProperties } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ArrowUpRight, BarChart3, CalendarDays, ChevronRight, CreditCard, History, Landmark, Plus, Settings, Store, Wallet, Zap } from 'lucide-react';
import { cn } from '@/lib/cn';
import { count, rupees, rupeesCompact } from '@/lib/format';
import { features } from '@/config/features';
import { routes } from '@/config/routes';
import { useSession } from '@/features/auth/session-context';
import { PaymentResultDialog } from '@/features/payment-gateway/payment-result-dialog';
import { AddCreditDialog } from '@/features/wallet/add-credit-dialog';
import { useMoneyMoved, useWallet } from '@/features/wallet/use-wallet';
import { useDashboardSummary } from './admin-kpis';
import { DifferenceHistoryDialog } from './difference-history-dialog';

const icon = (name: string) => `/services/${name}.png`;
const logo = (file: string) => `/logos/${file}`;

function greeting(date = new Date()) {
  const h = date.getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

/** Admin only: the business numbers, one card each, refreshed every 30 seconds. */
function AdminOverview() {
  const { data, isPending } = useDashboardSummary();
  const [history, setHistory] = useState(false);
  const diff = data?.difference ?? 0;
  const items = [
    { label: 'Pipe balance', hint: 'Held with the payment pipes', value: rupees(data?.totalPipeBalance), short: rupeesCompact(data?.totalPipeBalance) },
    { label: 'Wallet balance', hint: `${count(data?.walletCount ?? 0)} wallets`, value: rupees(data?.totalWalletBalance), short: rupeesCompact(data?.totalWalletBalance) },
    { label: 'Difference', hint: 'Pipe minus wallets', value: rupees(diff), short: rupeesCompact(diff), tone: diff >= 0 ? 'text-jade-600' : 'text-rose-600', history: true },
  ];
  return (
    <dl className="grid min-h-0 grid-rows-3 gap-[clamp(0.5rem,1.4vh,0.8rem)]">
      {items.map((it) => (
        <div key={it.label} className="group relative flex min-h-0 items-center justify-between gap-3 overflow-hidden rounded-xl border border-slate-200 bg-white px-[clamp(0.9rem,2vh,1.25rem)] transition duration-200 hover:border-gold-500 hover:shadow-[0_14px_26px_-18px_rgb(192_138_46/0.7)]">
          <span className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-gold-300 to-gold-600" aria-hidden />
          <div className="min-w-0">
            <dt className="text-[10.5px] font-semibold tracking-[0.16em] text-slate-500 uppercase">{it.label}</dt>
            <dd className="text-[11.5px] text-slate-400 [@media(max-height:700px)]:hidden">{it.hint}</dd>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className={cn('text-[clamp(1.2rem,3.2vh,1.7rem)] leading-none font-bold tabular', it.tone ?? 'text-ink-900')} title={it.value}>
              {isPending ? <span className="skeleton inline-block h-6 w-20 rounded" /> : it.short}
            </span>
            {it.history && (
              <button type="button" onClick={() => setHistory(true)} className="grid size-7 place-items-center rounded-md text-slate-400 transition hover:bg-gold-100 hover:text-gold-800" aria-label="Difference history" title="Difference history">
                <History className="size-4" />
              </button>
            )}
          </div>
        </div>
      ))}
      <DifferenceHistoryDialog open={history} onClose={() => setHistory(false)} />
    </dl>
  );
}

/** For everyone else, the same spot holds shortcuts instead. */
function Shortcuts({ isDistributor }: { isDistributor: boolean }) {
  const items: { href: string; label: string; hint: string; icon: ComponentType<{ className?: string }> }[] = [
    { href: routes.reports, label: 'Reports', hint: 'Transfers, collections, bills and ledger', icon: BarChart3 },
    ...(isDistributor ? [{ href: routes.myRetailers, label: 'My retailers', hint: 'Mapped retailers and your commission', icon: Store }] : []),
    { href: routes.profile, label: 'Profile & PIN', hint: 'Password, PIN and store details', icon: Settings },
  ];
  return (
    <ul className="grid min-h-0 gap-[clamp(0.5rem,1.4vh,0.8rem)]" style={{ gridTemplateRows: `repeat(${items.length}, minmax(0, 1fr))` }}>
      {items.map(({ href, label, hint, icon: Icon }) => (
        <li key={href} className="min-h-0">
          <Link href={href} className="group relative flex h-full items-center gap-3 overflow-hidden rounded-xl border border-slate-200 bg-white px-4 transition duration-200 hover:border-gold-500 hover:shadow-[0_14px_26px_-18px_rgb(192_138_46/0.7)]">
            <span className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-gold-300 to-gold-600" aria-hidden />
            <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-ink-950 text-gold-400 transition group-hover:bg-gold-500 group-hover:text-ink-950">
              <Icon className="size-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-display text-[14px] font-semibold text-ink-900">{label}</span>
              <span className="block truncate text-[12px] text-slate-500 [@media(max-height:700px)]:hidden">{hint}</span>
            </span>
            <ChevronRight className="size-5 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-ink-900" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

interface Service {
  label: string;
  desc: string;
  href: string;
  img: string;
  logo?: boolean;
  off?: boolean;
  instant?: boolean;
  group: string;
  /** Tiles alternate between the logo's two colours. */
  look: 'gold' | 'black';
}

const LOOKS: Record<Service['look'], { tile: string; pill: string; title: string; desc: string; chip: string }> = {
  // The gold runs highlight → shadow, exactly as in the logo's ribbon.
  gold: {
    tile: 'border-gold-600/40 bg-[linear-gradient(135deg,#f8d878_0%,#e3b758_36%,#c89838_68%,#a87828_100%)] hover:shadow-[0_20px_36px_-18px_rgb(152_104_24/0.85)]',
    pill: 'bg-ink-950 text-gold-300',
    title: 'text-ink-950',
    desc: 'text-ink-900/75',
    chip: 'bg-ink-950 text-gold-300',
  },
  black: {
    tile: 'bg-aurora border-ink-900 hover:shadow-[0_20px_36px_-18px_rgb(17_17_17/0.9)]',
    pill: 'bg-white/10 text-gold-300 ring-1 ring-white/15',
    title: 'text-white',
    desc: 'text-brand-300',
    chip: 'bg-gold-500 text-ink-950',
  },
};

/** One way in, drawn in the logo's gold or black. Sizes follow the screen's height so the row always fits. */
function ServiceTile({ s }: { s: Service }) {
  const l = LOOKS[s.look];
  const body = (
    <>
      {/* a light sweep across the tile on hover */}
      <span className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-0 transition-[left,opacity] duration-700 ease-out group-hover:left-[130%] group-hover:opacity-100 motion-reduce:hidden" aria-hidden />
      <span className="relative flex items-start justify-between gap-2">
        <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9.5px] font-semibold tracking-[0.14em] uppercase', l.pill)}>
          {s.group}
          {s.instant && !s.off && <Zap className="size-2.5 fill-current" aria-label="Instant" />}
        </span>
        {s.off ? (
          <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold tracking-wider text-slate-500 uppercase">Off</span>
        ) : (
          <span className={cn('grid size-7 place-items-center rounded-full opacity-0 transition duration-200 group-hover:opacity-100', l.chip)} aria-hidden>
            <ArrowUpRight className="size-4" />
          </span>
        )}
      </span>
      <span className="relative flex min-h-0 flex-1 items-center justify-center">
        <span
          className={cn(
            'grid place-items-center transition-transform duration-300 ease-out group-hover:-translate-y-1 group-hover:scale-110 group-hover:-rotate-3',
            s.logo
              ? 'h-[clamp(2.6rem,9vh,4.2rem)] w-[clamp(5.6rem,17vh,9rem)] rounded-lg bg-white shadow-[0_10px_22px_-12px_rgb(17_17_17/0.55)] ring-1 ring-black/5'
              : 'size-[clamp(3.2rem,14vh,6.8rem)] drop-shadow-[0_14px_16px_rgb(17_17_17/0.32)]',
            s.off && 'opacity-50 grayscale',
          )}
        >
          <Image src={s.img} alt="" width={s.logo ? 200 : 160} height={s.logo ? 80 : 160} unoptimized={s.img.endsWith('.svg')} className={cn('object-contain', s.logo ? 'h-[56%] w-[82%]' : 'size-full')} />
        </span>
      </span>
      <span className="relative block">
        <span className={cn('block truncate font-display text-[clamp(0.95rem,2.1vh,1.1rem)] font-semibold', l.title)}>{s.label}</span>
        <span className={cn('mt-0.5 line-clamp-2 block text-[12px] leading-snug [@media(max-height:660px)]:hidden', l.desc)}>{s.desc}</span>
      </span>
    </>
  );
  const cls = cn(
    'group relative isolate flex min-h-0 flex-col gap-1 overflow-hidden rounded-xl border p-[clamp(0.7rem,1.8vh,1rem)] text-left outline-none transition duration-200',
    'focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:ring-offset-2',
    l.tile,
    s.off ? 'cursor-not-allowed saturate-50' : 'hover:-translate-y-0.5 active:translate-y-0',
  );
  return s.off ? (
    <div className={cls} aria-disabled title={`${s.label} — switched off`}>
      {body}
    </div>
  ) : (
    <Link href={s.href} className={cls}>
      {body}
    </Link>
  );
}

const ACTION = 'inline-flex h-[clamp(2.2rem,5.2vh,2.6rem)] items-center gap-2 rounded-md px-4 text-[13.5px] font-semibold transition duration-150 active:scale-[0.98]';
const GLASS = 'bg-white/10 text-white ring-1 ring-white/15 hover:-translate-y-px hover:bg-white/[0.16] hover:ring-gold-400/60';

function QuickAction({ href, label, icon: Icon, gold = false }: { href: string; label: string; icon: ComponentType<{ className?: string }>; gold?: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        ACTION,
        gold ? 'bg-gradient-to-b from-gold-400 to-gold-500 text-ink-950 shadow-[inset_0_1px_0_rgb(255_255_255/0.35)] hover:-translate-y-px hover:from-gold-300 hover:to-gold-400 hover:shadow-[0_8px_18px_-8px_rgb(192_138_46/0.9)]' : GLASS,
      )}
    >
      <Icon className="size-4" /> {label}
    </Link>
  );
}

/**
 * The dashboard, sized to exactly one screen on a laptop or desktop: the balance card beside the
 * business numbers (shortcuts for non-admins), then every service as a gold or black tile.
 * Everything scales with the viewport's height; below `lg` it simply scrolls. A payer returning
 * from the gateway (`?t=…`) sees their payment's result here first.
 */
export function HomeView() {
  const { user, isAdmin, isDistributor } = useSession();
  const wallet = useWallet();
  const moneyMoved = useMoneyMoved();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // The gateway's token is read once and then dropped from the address, so a refresh does not repeat the popup.
  const [paymentToken] = useState(() => searchParams.get('t')?.trim() || '');
  const [crediting, setCrediting] = useState(false);

  const balance = wallet.data?.currentBalance ?? user.balanceAtLogin;
  const name = (user.fullName || user.username).trim().split(/\s+/)[0];
  const payOutOff = features.payOutDisabled;

  const services: Service[] = [
    { label: 'Card PG', desc: 'Collect card payments with a payment link, straight into your wallet.', href: routes.gateway, img: icon('card'), group: 'Pay in', look: 'gold' },
    { label: 'IMPS', desc: 'Send money to any bank account in seconds, with saved accounts.', href: routes.imps, img: logo('imps.svg'), logo: true, off: payOutOff, group: 'Pay out', look: 'black' },
    { label: 'PE6 BillPayments', desc: 'Pay credit card bills from your wallet, instantly and securely.', href: routes.cardBills, img: logo('pe6-billpay.svg'), logo: true, off: payOutOff, instant: true, group: 'Pay out', look: 'gold' },
    { label: 'Reports', desc: 'Transfers, card collections, bills and ledger — filter and export.', href: routes.reports, img: '/services/reports.svg', group: 'Insights', look: 'black' },
    ...(isDistributor ? [{ label: 'Retailers', desc: 'The retailers mapped to you and the commission you earn.', href: routes.myRetailers, img: icon('store'), group: 'Network', look: 'gold' as const }] : []),
    ...(isAdmin ? [{ label: 'Admin', desc: 'Customers, distributors, PG settings and admin-wide reports.', href: routes.admin, img: icon('gear'), group: 'Control', look: 'gold' as const }] : []),
  ];
  const cols = Math.min(services.length, 5);

  return (
    <div className="flex flex-col gap-[clamp(0.75rem,2.2vh,1.5rem)] lg:h-[calc(100dvh-var(--chrome-h))]">
      {paymentToken && <PaymentResultDialog token={paymentToken} onSuccess={moneyMoved} onDone={() => router.replace(pathname)} />}

      <section className="grid shrink-0 gap-[clamp(0.75rem,2vh,1.25rem)] xl:h-[clamp(13.5rem,37vh,20rem)] xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        {/* ── Balance ── */}
        <div className="bg-aurora relative flex min-h-0 flex-col justify-between gap-[clamp(0.5rem,1.6vh,1rem)] overflow-hidden rounded-xl p-[clamp(1rem,2.8vh,1.75rem)] text-white">
          <div>
            <p className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12px] text-brand-300" suppressHydrationWarning>
              <span className="font-semibold text-white">
                {greeting()}, {name}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="size-3.5 text-gold-400" />
                {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
              </span>
            </p>
            <div className="mt-[clamp(0.5rem,1.8vh,1rem)] flex items-center gap-2 text-[10.5px] font-semibold tracking-[0.2em] text-gold-400 uppercase">
              <Wallet className="size-4" /> Available balance
            </div>
            <p className="mt-1 text-[clamp(1.9rem,5.6vh,3.1rem)] leading-none font-bold tracking-tight tabular" suppressHydrationWarning>
              {rupees(balance)}
            </p>
            <p className="mt-1.5 text-[12px] text-brand-300 [@media(max-height:700px)]:hidden">
              {user.storeName || user.fullName} · Wallet #{user.walletId}
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <QuickAction href={routes.gateway} label="Collect payment" icon={CreditCard} gold />
            {!payOutOff && <QuickAction href={routes.imps} label="Send IMPS" icon={Landmark} />}
            <QuickAction href={routes.reports} label="Reports" icon={BarChart3} />
            {isAdmin && (
              <button type="button" onClick={() => setCrediting(true)} className={cn(ACTION, GLASS)}>
                <Plus className="size-4" /> Add credit
              </button>
            )}
          </div>
        </div>

        {/* ── Business numbers (admins) / shortcuts ── */}
        {isAdmin ? <AdminOverview /> : <Shortcuts isDistributor={isDistributor} />}
      </section>

      {/* ── Services: they share whatever height is left ── */}
      <section className="flex min-h-0 flex-1 flex-col">
        <div className="mb-[clamp(0.4rem,1.2vh,0.75rem)] flex shrink-0 items-center gap-3">
          <h2 className="text-[12px] font-semibold tracking-[0.18em] text-slate-500 uppercase">Services</h2>
          <span className="h-px flex-1 bg-slate-200" aria-hidden />
        </div>
        <div
          className="grid min-h-0 flex-1 gap-[clamp(0.5rem,1.6vh,1rem)] sm:grid-cols-2 lg:grid-cols-[repeat(var(--cols),minmax(0,1fr))] lg:grid-rows-1"
          style={{ '--cols': cols } as CSSProperties}
        >
          {services.map((s) => (
            <ServiceTile key={s.label} s={s} />
          ))}
        </div>
      </section>

      {isAdmin && <AddCreditDialog open={crediting} onClose={() => setCrediting(false)} />}
    </div>
  );
}
