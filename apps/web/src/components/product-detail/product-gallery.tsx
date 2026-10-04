'use client';

import { useState } from 'react';
import Image from 'next/image';
import { motion, useReducedMotion } from 'motion/react';
import { ChevronLeftIcon, ChevronRightIcon } from '@/components/icons';
import type { ProductMedia } from '@/lib/catalogue/product-detail';

type ProductGalleryProps = {
  name: string;
  media: ProductMedia[];
};

export function ProductGallery({ name, media }: ProductGalleryProps) {
  const reduceMotion = useReducedMotion();
  const images = media.length > 0 ? media : [];
  const [activeIndex, setActiveIndex] = useState(0);
  const active = images[activeIndex] ?? images[0];
  const hasMultiple = images.length > 1;

  if (!active) {
    return (
      <div className="pdp-gallery-stage" aria-hidden="true">
        <div className="pdp-gallery-empty" />
      </div>
    );
  }

  function goTo(index: number) {
    setActiveIndex((index + images.length) % images.length);
  }

  return (
    <div className="pdp-gallery">
      <motion.div
        className="pdp-gallery-stage"
        initial={reduceMotion ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="pdp-gallery-track">
          {images.map((image, index) => (
            <div
              key={image.id}
              className={`pdp-gallery-slide ${index === activeIndex ? 'is-active' : ''}`}
              aria-hidden={index !== activeIndex}
            >
              <Image
                src={image.url}
                alt={image.altText || name}
                fill
                priority={index === 0}
                unoptimized
                sizes="(min-width: 1024px) 55vw, 100vw"
                className="pdp-gallery-image"
              />
            </div>
          ))}
        </div>

        {hasMultiple ? (
          <div className="pdp-gallery-controls">
            <button
              type="button"
              className="pdp-gallery-nav"
              aria-label="Previous image"
              onClick={() => goTo(activeIndex - 1)}
            >
              <ChevronLeftIcon className="size-4" />
            </button>
            <button
              type="button"
              className="pdp-gallery-nav"
              aria-label="Next image"
              onClick={() => goTo(activeIndex + 1)}
            >
              <ChevronRightIcon className="size-4" />
            </button>
          </div>
        ) : null}
      </motion.div>

      {hasMultiple ? (
        <ul className="pdp-gallery-thumbs" aria-label="Product images">
          {images.map((image, index) => (
            <li key={image.id}>
              <button
                type="button"
                className={`pdp-gallery-thumb ${index === activeIndex ? 'is-active' : ''}`}
                aria-label={`View image ${index + 1} of ${images.length}`}
                aria-current={index === activeIndex ? 'true' : undefined}
                onClick={() => setActiveIndex(index)}
              >
                <Image
                  src={image.url}
                  alt=""
                  fill
                  unoptimized
                  sizes="72px"
                  className="object-contain object-center p-1.5"
                />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
