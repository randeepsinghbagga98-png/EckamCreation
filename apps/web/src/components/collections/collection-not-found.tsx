import Link from 'next/link';

export function CollectionNotFound() {
  return (
    <div className="collections-page overflow-x-hidden bg-[#F6F0E5] text-[#1A1815]">
      <section className="mx-auto flex min-h-[60vh] max-w-7xl flex-col justify-center px-5 py-20 sm:px-8 lg:px-12">
        <p className="text-[11px] font-semibold tracking-[0.28em] uppercase text-[#8B6914]">
          Collection not found
        </p>
        <h1 className="mt-4 font-sans text-[clamp(36px,6vw,56px)] font-light tracking-[-0.045em] uppercase text-[#1A1815]">
          Collection not found
        </h1>
        <p className="mt-5 max-w-md text-[15px] font-light leading-relaxed text-[#1A1815]/70">
          The collection you&apos;re looking for isn&apos;t available.
        </p>
        <Link href="/collections" className="cart-cta cart-cta--primary mt-8 self-start">
          Back to collections
        </Link>
      </section>
    </div>
  );
}
