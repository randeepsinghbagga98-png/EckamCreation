'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion, useReducedMotion } from 'motion/react';
import { WishlistButton } from '@/components/wishlist/wishlist-button';
import { formatProductPrice, type ProductCardData } from '@/lib/catalogue/product';
import { ArrowRightIcon, EyeIcon } from '../icons';

type ProductCardProps = {
  product: ProductCardData;
  index?: number;
  tone?: 'dark' | 'light';
};

export function ProductCard({ product, index = 0, tone = 'dark' }: ProductCardProps) {
  const reduceMotion = useReducedMotion();
  const priceLabel = product.price ? formatProductPrice(product.price) : null;
  const light = tone === 'light';

  return (
    <motion.article
      className={`product-card relative h-full ${light ? 'product-card--light' : ''}`}
      initial={reduceMotion ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{
        duration: reduceMotion ? 0 : 0.65,
        delay: reduceMotion ? 0 : index * 0.07,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      <WishlistButton
        productId={product.id}
        productName={product.name}
        appearance={light ? 'card-light' : 'card'}
      />
      <Link
        href={product.href}
        className="group flex h-full flex-col rounded-[4px] focus-visible:outline-2 focus-visible:outline-[#8B6914] focus-visible:outline-offset-4"
      >
        <div className="product-card-well relative aspect-[4/5] overflow-hidden rounded-[4px] border border-[#E8D3A4]/16 bg-[#F6F0E5] shadow-[0_18px_40px_rgba(0,0,0,0.28)]">
          <Image
            src={product.imageSrc}
            alt={product.imageAlt}
            fill
            unoptimized
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            className="product-card-image object-contain object-center p-4 sm:p-6"
          />

          <div
            className="product-card-frame"
            aria-hidden="true"
          />

          <span className="product-card-view pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-center gap-2 bg-gradient-to-t from-[#050505]/80 via-[#050505]/30 to-transparent px-4 pb-5 pt-16 text-[10px] font-semibold tracking-[0.22em] uppercase text-[#F6F0E5]">
            <EyeIcon className="size-3.5 text-[#E8D3A4]" />
            View
            <ArrowRightIcon className="product-card-view-arrow size-3.5 text-[#D6A84F]" />
          </span>
        </div>

        <div className="flex flex-1 flex-col pt-4 sm:pt-5">
          <p
            className={`text-[10px] font-semibold tracking-[0.22em] uppercase ${
              light ? 'text-[#8B6914]' : 'text-[#E8D3A4]/70'
            }`}
          >
            {product.category}
          </p>
          <h3
            className={`mt-1.5 font-serif text-[20px] sm:text-[22px] font-normal leading-snug ${
              light ? 'text-[#1A1815]' : 'text-[#F6F0E5]'
            }`}
          >
            {product.name}
          </h3>
          {priceLabel ? (
            <p
              className={`mt-2 text-sm font-light tracking-wide ${
                light ? 'text-[#1A1815]/70' : 'text-[#F6F0E5]/70'
              }`}
            >
              {priceLabel}
            </p>
          ) : null}
        </div>
      </Link>
    </motion.article>
  );
}
