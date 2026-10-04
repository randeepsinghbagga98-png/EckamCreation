import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRightIcon } from '../icons';

export function AboutHero() {
  return (
    <section
      aria-labelledby="about-hero-heading"
      className="about-hero relative flex min-h-[720px] items-center bg-[#050505] text-white lg:min-h-[84vh] lg:max-h-[940px]"
    >
      <div
        className="pointer-events-none absolute inset-0 z-0 select-none"
        aria-hidden="true"
      >
        <Image
          src="https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&w=2400&q=80"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-center brightness-[0.72] contrast-[1.06]"
        />
      </div>

      <div
        className="pointer-events-none absolute inset-0 z-10"
        style={{
          background:
            'linear-gradient(to right, #050505 0%, #050505 32%, rgba(5,5,5,0.78) 50%, rgba(5,5,5,0.28) 68%, transparent 100%)',
        }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-0 z-10"
        style={{
          background:
            'linear-gradient(to bottom, rgba(5,5,5,0.42) 0%, transparent 22%)',
        }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-0 z-10"
        style={{
          background:
            'linear-gradient(to top, #050505 0%, rgba(5,5,5,0.55) 14%, transparent 34%)',
        }}
        aria-hidden="true"
      />

      <div className="relative z-20 mx-auto w-full max-w-7xl px-5 py-20 sm:px-8 sm:py-24 lg:px-12">
        <div className="about-hero-copy max-w-xl sm:max-w-2xl lg:max-w-[56%]">
          <div className="mb-5 flex items-center gap-3 sm:mb-6">
            <span
              className="h-px w-9 bg-gradient-to-r from-[#D6A84F] to-[#E8D3A4] sm:w-12"
              aria-hidden="true"
            />
            <p className="text-[10px] font-bold tracking-[0.32em] uppercase text-[#D6A84F] sm:text-[11px]">
              The world of Eckam
            </p>
          </div>

          <h1
            id="about-hero-heading"
            className="font-sans text-[clamp(40px,7vw,92px)] font-light leading-[0.92] tracking-[-0.035em] uppercase text-white"
          >
            <span className="block">More than a store.</span>
            <span className="mt-1 block font-serif text-[clamp(34px,5.4vw,68px)] italic font-normal tracking-normal text-[#E8D3A4] normal-case">
              A point of view.
            </span>
          </h1>

          <p className="mt-6 max-w-lg text-[15px] font-light leading-relaxed text-white/80 sm:mt-8 sm:text-base">
            Eckam Creation brings together considered products, refined
            presentation, and a modern shopping experience — created for
            discovery in India and beyond.
          </p>

          <div className="mt-8 flex flex-col items-stretch gap-4 sm:mt-10 sm:flex-row sm:items-center sm:gap-5">
            <Link
              href="/shop"
              className="group inline-flex items-center justify-center gap-3 bg-[#D6A84F] px-8 py-4 text-[11px] font-bold tracking-[0.22em] uppercase text-[#050505] transition-colors hover:bg-[#F0C66A] focus-visible:outline-2 focus-visible:outline-[#D6A84F] focus-visible:outline-offset-2 sm:px-9 sm:text-xs"
            >
              Explore the shop
              <ArrowUpRightIcon className="size-3.5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
            <Link
              href="/collections"
              className="inline-flex items-center justify-center border border-white/25 px-7 py-4 text-[11px] font-semibold tracking-[0.22em] uppercase text-white/90 transition-colors hover:border-[#D6A84F] hover:bg-white/[0.04] hover:text-white focus-visible:outline-2 focus-visible:outline-[#D6A84F] focus-visible:outline-offset-2 sm:px-8 sm:text-xs"
            >
              Discover collections
            </Link>
          </div>
        </div>
      </div>

      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-px bg-gradient-to-r from-transparent via-[#D6A84F]/35 to-transparent"
        aria-hidden="true"
      />
    </section>
  );
}
