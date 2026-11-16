'use client';

import { useEffect, type ComponentType } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, LayoutDashboard, LogOut, Megaphone, PanelLeftClose, PanelLeftOpen, SlidersHorizontal, Users, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { routes } from '@/config/routes';
import { useSession } from '@/features/auth/session-context';
import { useNavigationHistory } from './navigation-history';

interface NavItem {
  label: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  /** Only the exact address lights it up (a parent page that has children elsewhere in the menu). */
  exact?: boolean;
}

/**
 * The menu, one flat list: Dashboard and Reports for everyone, plus Customers, Announcements and
 * PG settings for admins (those pages are admin-only on the server too). Everything else — Card PG,
 * IMPS, card bills — is reached from the dashboard.
 */
function useNav(): NavItem[] {
  const { isAdmin } = useSession();
  return [
    { label: 'Dashboard', href: routes.home, icon: LayoutDashboard, exact: true },
    { label: 'Reports', href: routes.reports, icon: BarChart3 },
    ...(isAdmin
      ? [
          { label: 'Customers', href: routes.customers, icon: Users },
          { label: 'Announcements', href: routes.announcements, icon: Megaphone },
          { label: 'PG settings', href: routes.pgSettings, icon: SlidersHorizontal },
        ]
      : []),
  ];
}

/**
 * Collapsing is pure CSS: the choice lives in `data-sidebar="collapsed"` on <html> (set before the
 * first paint by a tiny script in the root layout, and kept in localStorage), and the classes below
 * react to it from the `lg` breakpoint up. No React state means no hydration mismatch and no flash
 * of the wrong width on reload. The mobile drawer is never affected.
 */
const COLLAPSE_KEY = 'pe6.sidebar.collapsed';
const RAIL = {
  width: 'in-data-[sidebar=collapsed]:lg:w-16',
  hide: 'in-data-[sidebar=collapsed]:lg:hidden',
  showBlock: 'hidden in-data-[sidebar=collapsed]:lg:block',
  center: 'in-data-[sidebar=collapsed]:lg:justify-center in-data-[sidebar=collapsed]:lg:px-0',
  tightX: 'in-data-[sidebar=collapsed]:lg:px-2',
} as const;

/** The size every row shares — big, easy to read and to hit. */
const ROW = 'group relative flex w-full items-center gap-3.5 rounded-lg px-3 py-[clamp(0.5rem,1.5vh,0.75rem)] text-[15px] leading-none font-medium transition-all duration-150';
/** Idle rows are soft; on hover they turn white with dark lettering. */
const IDLE = 'text-brand-200 hover:bg-white hover:text-ink-950 hover:shadow-[0_8px_18px_-10px_rgb(0_0_0/0.7)]';
const ICON = 'size-5 shrink-0 transition-colors duration-150';

function toggleCollapsed() {
  const root = document.documentElement;
  const collapsing = root.dataset.sidebar !== 'collapsed';
  if (collapsing) root.dataset.sidebar = 'collapsed';
  else delete root.dataset.sidebar;
  try {
    window.localStorage.setItem(COLLAPSE_KEY, collapsing ? '1' : '0');
  } catch {
    /* private mode: it just will not be remembered */
  }
}

/**
 * The left menu. From the lg breakpoint up it is always there and can fold to a narrow icon rail;
 * below lg it is a drawer the top bar opens. It carries no logo: that stays fixed in the top bar.
 */
export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const items = useNav();
  const { signOut } = useSession();
  const { markTopLevel } = useNavigationHistory();

  // Moving to a page closes the drawer.
  useEffect(() => {
    onClose();
  }, [pathname, onClose]);

  const isActive = (item: NavItem) => (item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`));

  return (
    <>
      <div
        className={cn('fixed inset-0 z-40 bg-black/50 transition-opacity lg:hidden', open ? 'opacity-100' : 'pointer-events-none opacity-0')}
        onClick={onClose}
        aria-hidden
      />
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-52 flex-col bg-ink-950 text-brand-200 transition-[transform,width] duration-200 ease-out lg:sticky lg:top-14 lg:z-20 lg:h-[calc(100dvh-3.5rem)] lg:shrink-0 lg:translate-x-0 lg:self-start',
          open ? 'translate-x-0' : '-translate-x-full',
          RAIL.width,
        )}
        aria-label="Main menu"
      >
        {/* The drawer's own title bar (small screens only) — the logo lives in the top bar, never here. */}
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-white/10 px-5 lg:hidden">
          <span className="text-[11px] font-semibold tracking-[0.2em] text-brand-400 uppercase">Menu</span>
          <button type="button" onClick={onClose} className="grid size-9 place-items-center rounded-md text-brand-300 hover:bg-white hover:text-ink-950" aria-label="Close menu">
            <X className="size-5" />
          </button>
        </div>

        <nav className={cn('scrollbar-thin flex-1 overflow-x-hidden overflow-y-auto px-3 py-[clamp(0.6rem,2vh,1rem)]', RAIL.tightX)} aria-label="Pages">
          <ul className="space-y-1">
            {items.map((item) => {
              const active = isActive(item);
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={markTopLevel}
                    title={item.label}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      ROW,
                      RAIL.center,
                      active ? 'bg-gradient-to-r from-gold-500/30 via-gold-500/10 to-transparent text-white ring-1 ring-gold-500/30 ring-inset' : IDLE,
                    )}
                  >
                    <span className={cn('absolute inset-y-2 left-0 w-[3px] rounded-r-full bg-gold-500 transition-opacity duration-150', active ? 'opacity-100' : 'opacity-0')} aria-hidden />
                    <Icon className={cn(ICON, active ? 'text-gold-400' : 'text-brand-400 group-hover:text-gold-600')} />
                    <span className={cn('truncate', RAIL.hide)}>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className={cn('shrink-0 space-y-1 border-t border-white/10 p-3', RAIL.tightX)}>
          <button
            type="button"
            onClick={toggleCollapsed}
            className={cn(ROW, IDLE, 'hidden lg:flex', RAIL.center)}
            aria-label="Collapse or expand the sidebar"
            title="Collapse / expand sidebar"
          >
            <PanelLeftClose className={cn(ICON, 'text-brand-400 group-hover:text-gold-600', RAIL.hide)} />
            <PanelLeftOpen className={cn(ICON, 'text-brand-400 group-hover:text-gold-600', RAIL.showBlock)} />
            <span className={RAIL.hide}>Collapse</span>
          </button>
          <button
            type="button"
            onClick={signOut}
            className={cn(ROW, 'text-brand-200 hover:bg-white hover:text-rose-600 hover:shadow-[0_8px_18px_-10px_rgb(0_0_0/0.7)]', RAIL.center)}
            title="Sign out"
          >
            <LogOut className={cn(ICON, 'text-brand-400 group-hover:text-rose-600')} />
            <span className={RAIL.hide}>Sign out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
