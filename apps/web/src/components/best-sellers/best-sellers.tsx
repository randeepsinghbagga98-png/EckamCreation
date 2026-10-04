'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowRightIcon } from '../icons';
import { ProductCard } from '../product/product-card';
import { BEST_SELLER_PRODUCTS } from './products';

type BestSellersProps = {
  products?: typeof BEST_SELLER_PRODUCTS;
};

export function BestSellers({ products = BEST_SELLER_PRODUCTS }: BestSellersProps) {
  const reduceMotion = useReducedMotion();

  return (
    <section
      id="best-sellers"
      aria-labelledby="best-sellers-heading"
      className="best-sellers relative overflow-x-hidden bg-[#F6F0E5] text-[#1A1815]"
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#D6A84F]/45 to-transparent"
        aria-hidden="true"
      />

      <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-24 lg:px-12 lg:py-28">
        <motion.header
          className="flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between"
          initial={reduceMotion ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: reduceMotion ? 0 : 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="max-w-2xl">
            <p className="section-eyebrow">The Edit</p>
            <h2 id="best-sellers-heading" className="section-title mt-4 font-sans">
              Best Sellers
            </h2>
            <p className="mt-5 max-w-xl text-[15px] sm:text-base font-light leading-relaxed text-[#1A1815]/70">
              Discover the pieces customers return to — thoughtfully selected for
              lasting style, everyday use, and distinctive character.
            </p>
          </div>

          <Link
            href="/shop"
            className="group inline-flex min-h-11 items-center gap-2 self-start text-[11px] font-semibold tracking-[0.22em] uppercase text-[#8B6914] transition-colors hover:text-[#B8892E] focus-visible:outline-2 focus-visible:outline-[#8B6914] focus-visible:outline-offset-4"
          >
            View all
            <ArrowRightIcon className="size-3.5 transition-transform duration-400 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-1 group-focus-visible:translate-x-1 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0" />
          </Link>
        </motion.header>

        <ul className="mt-14 sm:mt-16 lg:mt-20 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-3.5 gap-y-10 sm:gap-x-5 sm:gap-y-12 lg:gap-x-6 lg:gap-y-14">
          {products.map((product, index) => (
            <li key={product.id} className="min-w-0">
              <ProductCard product={product} index={index} tone="light" />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
