'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowRightIcon } from '../icons';
import { ProductCard } from '../product/product-card';
import { NEW_ARRIVAL_PRODUCTS } from './products';

type NewArrivalsProps = {
  products?: typeof NEW_ARRIVAL_PRODUCTS;
};

export function NewArrivals({ products = NEW_ARRIVAL_PRODUCTS }: NewArrivalsProps) {
  const reduceMotion = useReducedMotion();

  return (
    <section
      id="new-arrivals"
      aria-labelledby="new-arrivals-heading"
      className="new-arrivals relative overflow-x-hidden bg-[#050505] text-[#F6F0E5]"
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#D6A84F]/40 to-transparent"
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
            <p className="text-[10px] font-bold tracking-[0.28em] uppercase text-[#D6A84F]">
              Just in
            </p>
            <h2
              id="new-arrivals-heading"
              className="mt-4 font-sans text-[clamp(36px,5vw,64px)] font-light tracking-[-0.045em] leading-[0.98] uppercase text-[#F6F0E5]"
            >
              New Arrivals
            </h2>
            <p className="mt-5 max-w-xl text-[15px] sm:text-base font-light leading-relaxed text-[#F6F0E5]/68">
              A fresh edit of considered pieces, selected for modern living and
              effortless expression.
            </p>
          </div>

          <Link
            href="/shop"
            className="group inline-flex min-h-11 items-center gap-2 self-start text-[11px] font-semibold tracking-[0.22em] uppercase text-[#E8D3A4] transition-colors hover:text-[#F0C66A] focus-visible:outline-2 focus-visible:outline-[#8B6914] focus-visible:outline-offset-4"
          >
            View all
            <ArrowRightIcon className="size-3.5 transition-transform duration-400 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-1 group-focus-visible:translate-x-1 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0" />
          </Link>
        </motion.header>

        <ul className="mt-14 sm:mt-16 lg:mt-20 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-3.5 gap-y-10 sm:gap-x-5 sm:gap-y-12 lg:gap-x-6 lg:gap-y-14">
          {products.map((product, index) => (
            <li key={product.id} className="min-w-0">
              <ProductCard product={product} index={index} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
