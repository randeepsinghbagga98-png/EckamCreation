import Link from 'next/link';
import { ABOUT_DESTINATIONS } from '@/lib/about/content';
import { ArrowRightIcon, ArrowUpRightIcon } from '../icons';
import { AboutReveal } from './about-reveal';

export function AboutWorld() {
  return (
    <section
      aria-labelledby="about-world-heading"
      className="about-dark bg-[#050505] text-[#F6F0E5]"
    >
      <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-24 lg:px-12 lg:py-28">
        <div className="grid items-end gap-12 lg:grid-cols-12 lg:gap-16">
          <AboutReveal as="header" className="lg:col-span-6">
            <div className="mb-5 flex items-center gap-3">
              <span
                className="h-px w-9 bg-gradient-to-r from-[#D6A84F] to-[#E8D3A4] sm:w-11"
                aria-hidden="true"
              />
              <p className="text-[10px] font-bold tracking-[0.28em] uppercase text-[#D6A84F] sm:text-[11px]">
                India & the world
              </p>
            </div>
            <h2
              id="about-world-heading"
              className="font-sans text-[clamp(36px,5.6vw,68px)] font-light leading-[0.94] tracking-[-0.04em] uppercase"
            >
              <span className="block">From India,</span>
              <span className="mt-1 block font-serif italic font-normal tracking-normal text-[#E8D3A4] normal-case">
                to the world.
              </span>
            </h2>
            <p className="mt-6 max-w-md text-[15px] font-light leading-relaxed text-[#F6F0E5]/74 sm:text-base">
              Eckam Creation is a storefront shaped for customers shopping from
              India and from international markets. The same curated catalogue
              and editorial journey — wherever you begin.
            </p>
            <p className="mt-4 max-w-md text-[14px] font-light leading-relaxed text-[#F6F0E5]/58">
              The destinations below are how the shop is presented today. They
              describe intended reach, not a shipping or delivery promise.
            </p>
            <Link
              href="/shop"
              className="group mt-8 inline-flex items-center justify-center gap-3 bg-[#D6A84F] px-8 py-4 text-[11px] font-bold tracking-[0.22em] uppercase text-[#050505] transition-colors hover:bg-[#F0C66A] focus-visible:outline-2 focus-visible:outline-[#D6A84F] focus-visible:outline-offset-2 sm:text-xs"
            >
              Explore the shop
              <ArrowUpRightIcon className="size-3.5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
          </AboutReveal>

          <ul className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:col-span-6">
            {ABOUT_DESTINATIONS.map((destination) => (
              <li key={destination.countryCode}>
                <Link
                  href={destination.href}
                  className="destination-card group flex min-h-16 items-center justify-between gap-2.5 px-3 py-3.5 sm:min-h-[4.5rem] sm:px-5 sm:py-4"
                  aria-label={`Explore the shop — ${destination.name}`}
                >
                  <span className="min-w-0">
                    <span className="block text-[10px] font-semibold tracking-[0.22em] uppercase text-[#D6A84F]">
                      {destination.countryCode}
                    </span>
                    <span className="mt-1 block font-serif text-[16px] font-normal leading-snug text-[#F6F0E5] sm:text-[20px]">
                      {destination.name}
                    </span>
                  </span>
                  <ArrowRightIcon
                    className="destination-card-arrow size-3.5 shrink-0 text-[#E8D3A4]"
                    aria-hidden="true"
                  />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
