'use client';

import { motion, useReducedMotion } from 'motion/react';
import { SearchForm } from './search-form';

type SearchHeroProps = {
  query: string;
};

export function SearchHero({ query }: SearchHeroProps) {
  const reduceMotion = useReducedMotion();

  return (
    <section
      className="search-hero relative overflow-x-hidden bg-[#050505] text-[#F6F0E5]"
      aria-labelledby="search-heading"
    >
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#D6A84F]/40 to-transparent"
        aria-hidden="true"
      />
      <motion.div
        className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16 lg:px-12 lg:py-20"
        initial={reduceMotion ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        <p className="text-[10px] font-bold tracking-[0.28em] uppercase text-[#D6A84F]">
          Search
        </p>
        <h1
          id="search-heading"
          className="mt-3 font-sans text-[clamp(32px,5.4vw,64px)] font-light tracking-[-0.045em] leading-[0.98] uppercase text-[#F6F0E5]"
        >
          Find something you&apos;ll love.
        </h1>
        <div className="relative mt-8 max-w-3xl">
          <SearchForm key={query} initialQuery={query} />
        </div>
      </motion.div>
    </section>
  );
}
