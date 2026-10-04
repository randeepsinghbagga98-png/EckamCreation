'use client';

import { motion, useReducedMotion } from 'motion/react';

export function CollectionsHero() {
  const reduceMotion = useReducedMotion();

  return (
    <section
      className="collections-hero relative overflow-x-hidden bg-[#050505] text-[#F6F0E5]"
      aria-labelledby="collections-heading"
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
          The Eckam Edit
        </p>
        <h1
          id="collections-heading"
          className="mt-3 font-sans text-[clamp(36px,6vw,72px)] font-light tracking-[-0.045em] leading-[0.98] uppercase text-[#F6F0E5]"
        >
          Curated for discovery.
        </h1>
        <p className="mt-5 max-w-2xl text-[15px] sm:text-base font-light leading-relaxed text-[#F6F0E5]/68">
          Explore thoughtfully curated edits across jewellery, fashion, home,
          lifestyle and gifting.
        </p>
      </motion.div>
    </section>
  );
}
