import Link from 'next/link';

export function CollectionEmptyState() {
  return (
    <div className="collections-empty" role="status">
      <p className="text-[11px] font-semibold tracking-[0.28em] uppercase text-[#8B6914]">
        Coming soon
      </p>
      <h2 className="mt-4 font-sans text-[clamp(28px,5vw,42px)] font-light tracking-[-0.04em] uppercase text-[#1A1815]">
        This edit is being prepared.
      </h2>
      <Link href="/shop" className="cart-cta cart-cta--primary mt-8">
        Explore shop
      </Link>
    </div>
  );
}
