import Link from 'next/link';

export function CartEmptyState() {
  return (
    <div className="cart-empty" role="status">
      <p className="text-[11px] font-semibold tracking-[0.28em] uppercase text-[#8B6914]">
        Your cart is empty
      </p>
      <p className="mt-5 max-w-md font-serif text-[28px] sm:text-[34px] font-normal leading-tight text-[#1A1815]">
        Your selected pieces will appear here.
      </p>
      <Link href="/shop" className="cart-cta cart-cta--primary mt-8">
        Explore the shop
      </Link>
    </div>
  );
}
