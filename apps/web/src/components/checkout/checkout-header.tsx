import Link from 'next/link';

export function CheckoutHeader() {
  return (
    <header
      role="banner"
      className="checkout-header sticky top-0 z-40 border-b border-black/10 bg-[#F6F0E5]/96 backdrop-blur-md"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8 sm:py-5 lg:px-12">
        <Link
          href="/"
          className="checkout-brand group inline-flex items-center gap-2.5 rounded-xs focus-visible:outline-2 focus-visible:outline-[#8B6914] focus-visible:outline-offset-4"
          aria-label="Eckam Creation homepage"
        >
          <span className="font-light tracking-[0.28em] sm:tracking-[0.32em] text-[13px] sm:text-base uppercase text-[#1A1815] whitespace-nowrap">
            ECKAM CREATION
          </span>
          <span
            className="mb-0.5 inline-block size-1.5 rounded-full bg-[#D6A84F]"
            aria-hidden="true"
          />
        </Link>
        <p className="text-[10px] font-semibold tracking-[0.22em] uppercase text-[#8B6914]">
          Secure checkout
        </p>
      </div>
    </header>
  );
}
