'use client';

import { motion, useReducedMotion } from 'motion/react';
import { DestinationCard } from './destination-card';
import { WORLDWIDE_DESTINATIONS } from './destinations';

type WorldwideShoppingProps = {
  destinations?: typeof WORLDWIDE_DESTINATIONS;
};

function GlobeBackdrop() {
  return (
    <svg
      className="worldwide-globe pointer-events-none absolute right-[-12%] top-1/2 h-[130%] w-auto -translate-y-1/2 text-[#E8D3A4] sm:right-[-6%] lg:right-[-2%]"
      viewBox="0 0 640 640"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="320" cy="320" r="248" stroke="currentColor" strokeWidth="0.75" />
      <circle cx="320" cy="320" r="176" stroke="currentColor" strokeWidth="0.6" />
      <ellipse cx="320" cy="320" rx="88" ry="248" stroke="currentColor" strokeWidth="0.6" />
      <ellipse cx="320" cy="320" rx="176" ry="248" stroke="currentColor" strokeWidth="0.55" />
      <ellipse cx="320" cy="320" rx="248" ry="248" stroke="currentColor" strokeWidth="0.5" />
      <path d="M72 320h496" stroke="currentColor" strokeWidth="0.6" />
      <ellipse cx="320" cy="320" rx="248" ry="86" stroke="currentColor" strokeWidth="0.55" />
      <ellipse cx="320" cy="320" rx="248" ry="168" stroke="currentColor" strokeWidth="0.5" />
      <path d="M140 168c56 42 118 64 180 64s124-22 180-64" stroke="currentColor" strokeWidth="0.45" />
      <path d="M140 472c56-42 118-64 180-64s124 22 180 64" stroke="currentColor" strokeWidth="0.45" />
    </svg>
  );
}

export function WorldwideShopping({
  destinations = WORLDWIDE_DESTINATIONS,
}: WorldwideShoppingProps) {
  const reduceMotion = useReducedMotion();

  return (
    <section
      id="worldwide-shopping"
      aria-labelledby="worldwide-shopping-heading"
      className="worldwide-shopping relative isolate overflow-x-hidden bg-[#050505] text-[#F6F0E5]"
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#D6A84F]/45 to-transparent"
        aria-hidden="true"
      />

      <GlobeBackdrop />

      <div
        className="pointer-events-none absolute left-[-8%] top-[18%] h-[320px] w-[320px] rounded-full blur-3xl lg:h-[420px] lg:w-[420px]"
        style={{
          background:
            'radial-gradient(circle, rgba(214,168,79,0.08) 0%, rgba(232,211,164,0.02) 46%, transparent 70%)',
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-24 lg:px-12 lg:py-28">
        <div className="grid items-end gap-12 lg:grid-cols-12 lg:gap-16 xl:gap-20">
          <motion.header
            className="lg:col-span-5"
            initial={reduceMotion ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: reduceMotion ? 0 : 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="mb-5 flex items-center gap-3">
              <span
                className="h-px w-9 sm:w-11 bg-gradient-to-r from-[#D6A84F] to-[#E8D3A4]"
                aria-hidden="true"
              />
              <p className="text-[10px] sm:text-[11px] font-bold tracking-[0.28em] uppercase text-[#D6A84F]">
                Shop without borders
              </p>
            </div>

            <h2
              id="worldwide-shopping-heading"
              className="font-sans text-[clamp(36px,5.6vw,68px)] font-light leading-[0.94] tracking-[-0.04em] uppercase text-[#F6F0E5]"
            >
              <span className="block">From India,</span>
              <span className="mt-1 block font-serif italic font-normal tracking-normal text-[#E8D3A4] normal-case">
                to the world.
              </span>
            </h2>

            <p className="mt-5 sm:mt-6 max-w-md text-[15px] sm:text-base font-light leading-relaxed text-[#F6F0E5]/74">
              Explore Eckam Creation from wherever you are, with a shopping
              experience designed for customers across India and international markets.
            </p>
          </motion.header>

          <ul className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:col-span-7">
            {destinations.map((destination, index) => (
              <DestinationCard
                key={destination.countryCode}
                destination={destination}
                index={index}
              />
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
