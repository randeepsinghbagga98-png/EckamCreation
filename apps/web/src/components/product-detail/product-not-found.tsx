import Link from 'next/link';

export function ProductNotFound() {
  return (
    <div className="pdp-page">
      <section className="pdp-stage" aria-labelledby="pdp-not-found-heading">
        <div className="mx-auto flex min-h-[60vh] max-w-7xl flex-col justify-center px-5 py-20 sm:px-8 lg:px-12">
          <p className="text-[11px] font-semibold tracking-[0.28em] uppercase text-[#8B6914]">
            Product not found
          </p>
          <h1
            id="pdp-not-found-heading"
            className="mt-4 font-sans text-[clamp(36px,6vw,56px)] font-light tracking-[-0.045em] uppercase text-[#1A1815]"
          >
            Product not found
          </h1>
          <p className="mt-5 max-w-md text-[15px] font-light leading-relaxed text-[#1A1815]/70">
            The product you&apos;re looking for could not be found.
          </p>
          <Link href="/shop" className="pdp-cta pdp-cta--primary mt-8 self-start">
            Back to shop
          </Link>
        </div>
      </section>
    </div>
  );
}
