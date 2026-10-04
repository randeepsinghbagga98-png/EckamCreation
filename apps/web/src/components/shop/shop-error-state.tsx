'use client';

import { useRouter } from 'next/navigation';

export function ShopErrorState() {
  const router = useRouter();

  return (
    <div className="shop-empty" role="alert">
      <p className="text-[11px] font-semibold tracking-[0.28em] uppercase text-[#8B6914]">
        Catalogue temporarily unavailable
      </p>
      <p className="mt-4 max-w-md text-[15px] font-light leading-relaxed text-[#1A1815]/70">
        Please try again.
      </p>
      <button
        type="button"
        className="cart-cta cart-cta--primary mt-8"
        onClick={() => router.refresh()}
      >
        Try again
      </button>
    </div>
  );
}
