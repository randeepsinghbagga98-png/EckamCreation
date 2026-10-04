import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { CheckoutHeader } from '@/components/checkout/checkout-header';

export const metadata: Metadata = {
  title: 'Checkout | ECKAM CREATION',
  description: 'Review your selection and enter your details to continue.',
};

export default function CheckoutLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F6F0E5] text-[#1A1815] flex flex-col selection:bg-[#D6A84F]/30 selection:text-[#1A1815]">
      <CheckoutHeader />
      <main id="main-content" tabIndex={-1} className="flex-1 focus:outline-none">
        {children}
      </main>
    </div>
  );
}
