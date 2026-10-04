'use client';

import { motion, useReducedMotion } from 'motion/react';

export function ShopHero() {
  const reduceMotion = useReducedMotion();

  return (
    <section
      className="shop-hero relative overflow-x-hidden bg-[#050505] text-[#F6F0E5]"
      aria-labelledby="shop-heading"
    >
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#D6A84F]/40 to-transparent"
        aria-hidden="true"
      />

      <motion.div
        className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-14 lg:px-12 lg:py-16"
        initial={reduceMotion ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        <p className="text-[10px] font-bold tracking-[0.28em] uppercase text-[#D6A84F]">
          The Eckam Collection
        </p>
        <h1
          id="shop-heading"
          className="mt-3 font-sans text-[clamp(36px,6vw,64px)] font-light tracking-[-0.045em] leading-[0.98] uppercase text-[#F6F0E5]"
        >
          Shop Eckam
        </h1>
        <p className="mt-5 max-w-2xl text-[15px] sm:text-base font-light leading-relaxed text-[#F6F0E5]/68">
          Explore a considered selection of fashion, accessories, beauty, home,
          kitchen, gifts, and distinctive lifestyle pieces.
        </p>
      </motion.div>
    </section>
  );
}
