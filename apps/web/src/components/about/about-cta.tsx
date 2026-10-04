import Link from 'next/link';
import { ArrowUpRightIcon } from '../icons';
import { AboutReveal } from './about-reveal';

export function AboutCta() {
  return (
    <section
      aria-labelledby="about-cta-heading"
      className="about-dark bg-[#050505] text-[#F6F0E5]"
    >
      <div className="mx-auto max-w-7xl px-5 py-20 text-center sm:px-8 sm:py-24 lg:px-12 lg:py-28">
        <AboutReveal className="mx-auto max-w-3xl">
          <h2
            id="about-cta-heading"
            className="font-sans text-[clamp(36px,5.6vw,72px)] font-light leading-[0.94] tracking-[-0.04em] uppercase"
          >
            Find your
            <span className="mt-1 block font-serif italic font-normal tracking-normal text-[#E8D3A4] normal-case">
              next favourite.
            </span>
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-[15px] font-light leading-relaxed text-[#F6F0E5]/72 sm:text-base">
            Explore the collection and discover pieces selected for the way you
            shop, live, gift and express yourself.
          </p>
          <div className="mt-10 flex flex-col items-stretch justify-center gap-4 sm:flex-row sm:items-center sm:gap-5">
            <Link
              href="/shop"
              className="group inline-flex items-center justify-center gap-3 bg-[#D6A84F] px-8 py-4 text-[11px] font-bold tracking-[0.22em] uppercase text-[#050505] transition-colors hover:bg-[#F0C66A] focus-visible:outline-2 focus-visible:outline-[#D6A84F] focus-visible:outline-offset-2 sm:px-9 sm:text-xs"
            >
              Shop Eckam
              <ArrowUpRightIcon className="size-3.5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
            <Link
              href="/collections"
              className="inline-flex items-center justify-center border border-white/25 px-7 py-4 text-[11px] font-semibold tracking-[0.22em] uppercase text-white/90 transition-colors hover:border-[#D6A84F] hover:bg-white/[0.04] hover:text-white focus-visible:outline-2 focus-visible:outline-[#D6A84F] focus-visible:outline-offset-2 sm:px-8 sm:text-xs"
            >
              Explore collections
            </Link>
          </div>
        </AboutReveal>
      </div>
    </section>
  );
}
