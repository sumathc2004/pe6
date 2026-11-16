'use client';

import { useCallback, useState, type CSSProperties, type ReactNode } from 'react';
import { AnnouncementCenter } from '@/features/announcements/announcement-center';
import { SessionProvider } from '@/features/auth/session-context';
import type { SessionUser } from '@/types/auth';
import { NavigationHistoryProvider } from './navigation-history';
import { Watermark } from '@/components/brand/watermark';
import { Sidebar } from './sidebar';
import { Topbar } from './topbar';

/**
 * The signed-in frame: a slim top bar across the whole width (the logo, the wallet balance,
 * announcements and the account), a dark menu down the left beneath it (a drawer on small screens),
 * and the page in the space that remains.
 */
export function AppShell({ user, children }: { user: SessionUser; children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = useCallback(() => setMenuOpen(false), []);

  return (
    <SessionProvider user={user}>
      <NavigationHistoryProvider>
        <AnnouncementCenter>
          {/* --chrome-h is everything above the page (the 3.5rem top bar and its 1px border + main's vertical padding),
              so a page can size itself to exactly one screen: h-[calc(100dvh-var(--chrome-h))]. */}
          <div className="flex min-h-dvh flex-col" style={{ '--chrome-h': 'calc(6rem + 1px)' } as CSSProperties}>
            <Watermark inApp />
            <Topbar onOpenMenu={() => setMenuOpen(true)} />
            <div className="flex min-h-0 flex-1">
              <Sidebar open={menuOpen} onClose={closeMenu} />
              <main className="mx-auto w-full max-w-[96rem] min-w-0 flex-1 px-4 py-5 sm:px-6 lg:px-8">{children}</main>
            </div>
          </div>
        </AnnouncementCenter>
      </NavigationHistoryProvider>
    </SessionProvider>
  );
}
