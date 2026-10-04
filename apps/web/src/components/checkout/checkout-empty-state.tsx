import Link from 'next/link';

export function CheckoutEmptyState() {
  return (
    <div className="checkout-empty" role="status">
      <p className="text-[11px] font-semibold tracking-[0.28em] uppercase text-[#8B6914]">
        Checkout
      </p>
      <h1 className="mt-5 max-w-xl font-serif text-[clamp(32px,7vw,52px)] font-normal leading-[1.05] text-[#1A1815]">
        YOUR CART IS EMPTY.
      </h1>
      <p className="mt-5 max-w-md text-[15px] font-light leading-relaxed text-[#1A1815]/68">
        There are no pieces ready for checkout.
      </p>
      <Link href="/shop" className="cart-cta cart-cta--primary mt-8">
        Return to shop
      </Link>
    </div>
  );
}
