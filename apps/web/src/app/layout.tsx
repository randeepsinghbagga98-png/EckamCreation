import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { EckamAiRoot } from '@/components/ai/eckam-ai-root';
import { siteUrl } from '@/lib/site-url';
import './globals.css';

const appName = process.env.NEXT_PUBLIC_APP_NAME?.trim() || 'Eckam Creation';
const description =
  'Curated products and a considered shopping experience from Eckam Creation.';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: `${appName} | Designed To Be Desired`,
    template: `%s | ${appName}`,
  },
  description,
  applicationName: appName,
  authors: [{ name: 'Eckam Creation' }],
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: appName,
    title: `${appName} | Designed To Be Desired`,
    description,
  },
  twitter: {
    card: 'summary_large_image',
    title: `${appName} | Designed To Be Desired`,
    description,
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: '#050505',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark bg-[#050505] scroll-smooth">
      <body className="min-h-screen bg-[#050505] text-white antialiased overflow-x-hidden selection:bg-[#D6A84F]/30 selection:text-[#F0C66A]">
        {/* Accessible Skip Link */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:bg-[#D6A84F] focus:text-[#050505] focus:font-bold focus:text-xs focus:tracking-widest focus:uppercase focus:rounded-xs focus:shadow-lg focus:outline-none"
        >
          Skip to main content
        </a>
        {children}
        <EckamAiRoot />
      </body>
    </html>
  );
}
