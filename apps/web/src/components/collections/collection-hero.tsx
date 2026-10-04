'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'motion/react';
import type { ResolvedCollection } from '@/lib/collections/resolve';

type CollectionHeroProps = {
  collection: ResolvedCollection;
};

export function CollectionHero({ collection }: CollectionHeroProps) {
  const reduceMotion = useReducedMotion();

  return (
    <section
      className="collection-detail-hero relative overflow-x-hidden bg-[#050505] text-[#F6F0E5]"
      aria-labelledby="collection-detail-heading"
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
        <nav className="pdp-breadcrumb" aria-label="Breadcrumb">
          <ol className="pdp-breadcrumb-list">
            <li>
              <Link href="/" className="pdp-breadcrumb-link">
                Home
              </Link>
            </li>
            <li aria-hidden="true" className="pdp-breadcrumb-sep">
              /
            </li>
            <li>
              <Link href="/collections" className="pdp-breadcrumb-link">
                Collections
              </Link>
            </li>
            <li aria-hidden="true" className="pdp-breadcrumb-sep">
              /
            </li>
            <li>
              <span className="pdp-breadcrumb-current" aria-current="page">
                {collection.title}
              </span>
            </li>
          </ol>
        </nav>
        <p className="mt-8 text-[10px] font-bold tracking-[0.28em] uppercase text-[#D6A84F]">
          The Eckam Edit
        </p>
        <h1
          id="collection-detail-heading"
          className="mt-3 font-sans text-[clamp(36px,6vw,64px)] font-light tracking-[-0.045em] leading-[0.98] uppercase text-[#F6F0E5]"
        >
          {collection.title}
        </h1>
        <p className="mt-5 max-w-2xl text-[15px] sm:text-base font-light leading-relaxed text-[#F6F0E5]/68">
          {collection.description}
        </p>
        <p className="mt-4 text-[12px] font-light tracking-wide text-[#F6F0E5]/55">
          {collection.productCount} {collection.productCount === 1 ? 'piece' : 'pieces'}
        </p>
      </motion.div>
    </section>
  );
}
