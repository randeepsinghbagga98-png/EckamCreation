'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowRightIcon } from '@/components/icons';
import type { ResolvedCollection } from '@/lib/collections/resolve';

const SIZE_CLASS: Record<ResolvedCollection['size'], string> = {
  featured:
    'min-[480px]:col-span-2 lg:col-span-7 lg:row-span-2 min-h-[320px] sm:min-h-[380px] lg:min-h-[560px]',
  companion: 'lg:col-span-5 min-h-[260px] sm:min-h-[280px] lg:min-h-[270px]',
  standard: 'lg:col-span-4 min-h-[260px] sm:min-h-[280px] lg:min-h-[320px]',
  wide: 'min-[480px]:col-span-2 lg:col-span-6 min-h-[260px] sm:min-h-[300px]',
};

const SIZE_IMAGE: Record<ResolvedCollection['size'], string> = {
  featured: '(min-width: 1024px) 58vw, (min-width: 480px) 100vw, 100vw',
  companion: '(min-width: 1024px) 42vw, (min-width: 480px) 50vw, 100vw',
  standard: '(min-width: 1024px) 33vw, (min-width: 480px) 50vw, 100vw',
  wide: '(min-width: 1024px) 50vw, (min-width: 480px) 100vw, 100vw',
};

type CollectionCardProps = {
  collection: ResolvedCollection;
  index: number;
};

export function CollectionCard({ collection, index }: CollectionCardProps) {
  const reduceMotion = useReducedMotion();
  const featured = collection.size === 'featured';

  return (
    <motion.li
      className={SIZE_CLASS[collection.size]}
      initial={reduceMotion ? false : { opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{
        duration: reduceMotion ? 0 : 0.7,
        delay: reduceMotion ? 0 : index * 0.06,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      <Link
        href={`/collections/${collection.slug}`}
        className="collection-card category-card group relative block h-full overflow-hidden rounded-[4px] bg-[#0A0A0A] focus-visible:outline-2 focus-visible:outline-[#8B6914] focus-visible:outline-offset-4"
      >
        <Image
          src={collection.imageSrc}
          alt={collection.imageAlt}
          fill
          unoptimized={collection.imageSrc.startsWith('/')}
          sizes={SIZE_IMAGE[collection.size]}
          className="category-card-image object-cover object-center"
        />
        <div
          className="absolute inset-0 bg-gradient-to-t from-black/78 via-black/28 to-black/10"
          aria-hidden="true"
        />
        <span className="category-card-frame" aria-hidden="true" />
        <div
          className={`relative z-10 flex h-full flex-col justify-end ${
            featured ? 'p-6 sm:p-8 lg:p-10' : 'p-5 sm:p-6'
          }`}
        >
          <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-[#D6A84F]">
            {collection.eyebrow}
          </p>
          <h2
            className={`mt-2 font-light tracking-tight text-white ${
              featured
                ? 'text-[1.65rem] sm:text-3xl lg:text-[2.15rem] leading-[1.15]'
                : 'text-xl sm:text-[1.35rem] leading-snug'
            }`}
          >
            {collection.title}
          </h2>
          <p
            className={`mt-2 max-w-md font-light leading-relaxed text-white/80 ${
              featured ? 'text-[15px] sm:text-base' : 'text-sm sm:text-[15px]'
            }`}
          >
            {collection.description}
          </p>
          <p className="mt-3 text-[11px] font-light text-white/70">
            {collection.productCount} {collection.productCount === 1 ? 'piece' : 'pieces'}
          </p>
          <span className="mt-4 inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#E8D3A4]">
            Shop the edit
            <ArrowRightIcon className="h-3.5 w-3.5 transition-transform duration-500 group-hover:translate-x-1.5" />
          </span>
        </div>
      </Link>
    </motion.li>
  );
}
