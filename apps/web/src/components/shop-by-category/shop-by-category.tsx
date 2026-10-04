'use client';

import { motion, useReducedMotion } from 'motion/react';
import { CATEGORIES } from './categories';
import { CategoryCard } from './category-card';

export function ShopByCategory() {
  const reduceMotion = useReducedMotion();

  return (
    <section
      id="shop-by-category"
      aria-labelledby="shop-by-category-heading"
      className="shop-by-category relative overflow-x-hidden bg-[#F6F0E5] text-[#1A1815]"
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#D6A84F]/45 to-transparent"
        aria-hidden="true"
      />

      <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-24 lg:px-12 lg:py-28">
        <motion.header
          className="mx-auto max-w-2xl text-center"
          initial={reduceMotion ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: reduceMotion ? 0 : 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="section-eyebrow">Explore the world of Eckam</p>
          <h2
            id="shop-by-category-heading"
            className="section-title mt-4 font-sans"
          >
            FIND YOUR{' '}
            <em className="font-serif italic font-normal">EXPRESSION.</em>
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-[15px] sm:text-base font-light leading-relaxed text-[#1A1815]/70">
            Discover thoughtfully curated categories designed to bring style,
            function and character into everyday life.
          </p>
        </motion.header>

        <ul className="mt-14 sm:mt-16 lg:mt-20 grid grid-cols-1 min-[480px]:grid-cols-2 lg:grid-cols-12 gap-3.5 sm:gap-4 lg:gap-5 lg:auto-rows-fr">
          {CATEGORIES.map((category, index) => (
            <CategoryCard key={category.slug} category={category} index={index} />
          ))}
        </ul>
      </div>
    </section>
  );
}
