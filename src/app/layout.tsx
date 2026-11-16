import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono, Sora } from 'next/font/google';
import { site } from '@/config/site';
import { Providers } from './providers';
import './globals.css';

// Type system: Geist for everything you read, Manrope for headings and money (geometric, rich,
// with tabular figures), Geist Mono for references — IDs, UTRs, account numbers.
const geist = Geist({ subsets: ['latin'], variable: '--font-geist', display: 'swap' });
const sora = Sora({ subsets: ['latin'], variable: '--font-sora', display: 'swap' });
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono', display: 'swap' });

export const metadata: Metadata = {
  title: { default: `${site.name} — ${site.tagline}`, template: `%s · ${site.name}` },
  description: site.description,
  applicationName: site.name,
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: '#0b0b0b',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" className={`${geist.variable} ${sora.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <head>
        {/* Applies the remembered sidebar width before first paint, so a reload never flashes the wrong one. */}
        <script dangerouslySetInnerHTML={{ __html: "try{if(localStorage.getItem('pe6.sidebar.collapsed')==='1')document.documentElement.dataset.sidebar='collapsed'}catch(e){}" }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
