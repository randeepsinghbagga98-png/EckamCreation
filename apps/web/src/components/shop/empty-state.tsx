import Link from 'next/link';

export function ShopEmptyState() {
  return (
    <div className="shop-empty" role="status">
      <p className="text-[11px] font-semibold tracking-[0.28em] uppercase text-[#8B6914]">
        No pieces found
      </p>
      <p className="mt-4 max-w-md text-[15px] font-light leading-relaxed text-[#1A1815]/70">
        Try adjusting your filters or explore the full collection.
      </p>
      <Link href="/shop" className="cart-cta cart-cta--primary mt-8">
        View all
      </Link>
    </div>
  );
}
