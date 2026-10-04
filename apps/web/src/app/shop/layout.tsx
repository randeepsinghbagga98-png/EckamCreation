import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Footer } from '@/components/footer/footer';
import { Header } from '@/components/header/header';

export const metadata: Metadata = {
  title: 'Shop Eckam | ECKAM CREATION',
  description:
    'Explore a considered selection of fashion, accessories, beauty, home, kitchen, gifts, and distinctive lifestyle pieces.',
};

export default function ShopLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col selection:bg-[#D6A84F]/30 selection:text-[#F0C66A]">
      <Header />
      <main id="main-content" tabIndex={-1} className="flex-1 focus:outline-none">
        {children}
      </main>
      <Footer />
    </div>
  );
}
