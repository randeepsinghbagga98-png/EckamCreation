'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowRightIcon } from '../icons';
import type { CategoryItem } from './categories';

const SIZE_CLASS: Record<CategoryItem['size'], string> = {
  featured:
    'min-[480px]:col-span-2 lg:col-span-7 lg:row-span-2 min-h-[320px] sm:min-h-[380px] lg:min-h-[560px]',
  companion: 'lg:col-span-5 min-h-[260px] sm:min-h-[280px] lg:min-h-[270px]',
  standard: 'lg:col-span-4 min-h-[260px] sm:min-h-[280px] lg:min-h-[320px]',
  wide: 'min-[480px]:col-span-2 lg:col-span-6 min-h-[260px] sm:min-h-[300px]',
};

const SIZE_IMAGE: Record<CategoryItem['size'], string> = {
  featured: '(min-width: 1024px) 58vw, (min-width: 480px) 100vw, 100vw',
  companion: '(min-width: 1024px) 42vw, (min-width: 480px) 50vw, 100vw',
  standard: '(min-width: 1024px) 33vw, (min-width: 480px) 50vw, 100vw',
  wide: '(min-width: 1024px) 50vw, (min-width: 480px) 100vw, 100vw',
};

type CategoryCardProps = {
  category: CategoryItem;
  index: number;
};

export function CategoryCard({ category, index }: CategoryCardProps) {
  const reduceMotion = useReducedMotion();
  const featured = category.size === 'featured';

  return (
    <motion.li
      className={SIZE_CLASS[category.size]}
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
        href={category.href}
        className="category-card group relative block h-full overflow-hidden rounded-[4px] bg-[#0A0A0A] focus-visible:outline-2 focus-visible:outline-[#8B6914] focus-visible:outline-offset-4"
      >
        <Image
          src={category.imageSrc}
          alt={category.imageAlt}
          fill
          sizes={SIZE_IMAGE[category.size]}
          className="category-card-image object-cover object-center"
        />

        <div
          className="absolute inset-0 bg-gradient-to-t from-black/78 via-black/28 to-black/10 transition-opacity duration-500 group-hover:from-black/86 group-hover:via-black/36"
          aria-hidden="true"
        />
        <div
          className="absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100 group-focus-visible:opacity-100"
          style={{
            background:
              'linear-gradient(180deg, rgba(214,168,79,0.10) 0%, transparent 42%)',
          }}
          aria-hidden="true"
        />

        <span className="category-card-frame" aria-hidden="true" />

        <div
          className={`relative z-10 flex h-full flex-col justify-end ${
            featured ? 'p-6 sm:p-8 lg:p-10' : 'p-5 sm:p-6'
          }`}
        >
          <span
            className="mb-3 h-px w-8 bg-gradient-to-r from-[#D6A84F] to-[#E8D3A4] transition-all duration-500 group-hover:w-14"
            aria-hidden="true"
          />
          <h3
            className={`font-light tracking-tight text-white ${
              featured
                ? 'text-[1.65rem] sm:text-3xl lg:text-[2.15rem] leading-[1.15]'
                : 'text-xl sm:text-[1.35rem] leading-snug'
            }`}
          >
            {category.name}
          </h3>
          <p
            className={`mt-2 max-w-md font-light leading-relaxed text-white/80 ${
              featured ? 'text-[15px] sm:text-base' : 'text-sm sm:text-[15px]'
            }`}
          >
            {category.descriptor}
          </p>
          <span className="mt-4 inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#E8D3A4]">
            Explore
            <ArrowRightIcon className="h-3.5 w-3.5 transition-transform duration-500 group-hover:translate-x-1.5 group-focus-visible:translate-x-1.5" />
          </span>
        </div>
      </Link>
    </motion.li>
  );
}
