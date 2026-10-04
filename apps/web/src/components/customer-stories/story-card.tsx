'use client';

import type { ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowRightIcon } from '../icons';
import type { CustomerStory } from '@/lib/catalogue/story';

const SIZE_CLASS: Record<CustomerStory['size'], string> = {
  featured:
    'md:col-span-2 lg:col-span-7 lg:row-span-2 min-h-[340px] sm:min-h-[400px] lg:min-h-[560px]',
  standard: 'lg:col-span-5 min-h-[280px] sm:min-h-[300px] lg:min-h-[270px]',
};

const SIZE_IMAGE: Record<CustomerStory['size'], string> = {
  featured: '(min-width: 1024px) 58vw, (min-width: 768px) 100vw, 100vw',
  standard: '(min-width: 1024px) 42vw, (min-width: 768px) 50vw, 100vw',
};

type StoryCardProps = {
  story: CustomerStory;
  index?: number;
};

export function StoryCard({ story, index = 0 }: StoryCardProps) {
  const reduceMotion = useReducedMotion();
  const featured = story.size === 'featured';
  const forthcoming = story.status === 'forthcoming';

  return (
    <motion.li
      className={`min-w-0 ${SIZE_CLASS[story.size]}`}
      initial={reduceMotion ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{
        duration: reduceMotion ? 0 : 0.7,
        delay: reduceMotion ? 0 : index * 0.08,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      <StorySurface
        href={forthcoming ? undefined : story.href}
        className="story-card group relative flex h-full flex-col overflow-hidden rounded-[4px] bg-[#0A0A0A] focus-visible:outline-2 focus-visible:outline-[#8B6914] focus-visible:outline-offset-4"
        aria-label={
          forthcoming
            ? `${story.title}. Forthcoming. ${story.excerpt}`
            : `${story.category}: ${story.title}`
        }
      >
        <div className="relative min-h-[200px] flex-1 overflow-hidden">
          <Image
            src={story.imageSrc}
            alt={story.imageAlt}
            fill
            sizes={SIZE_IMAGE[story.size]}
            className="story-card-image object-cover object-center"
          />
          <div
            className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/35 to-transparent"
            aria-hidden="true"
          />
          <span className="story-card-frame" aria-hidden="true" />
        </div>

        <div
          className={`relative z-10 ${
            featured ? 'p-5 sm:p-7 lg:p-8' : 'p-5 sm:p-6'
          }`}
        >
          <p className="text-[10px] font-semibold tracking-[0.22em] uppercase text-[#D6A84F]">
            {story.category}
          </p>
          <h3
            className={`mt-2 font-serif font-normal leading-snug text-[#F6F0E5] ${
              featured ? 'text-[26px] sm:text-[30px]' : 'text-[22px] sm:text-[24px]'
            }`}
          >
            {story.title}
          </h3>
          <p className="mt-2.5 max-w-md text-[14px] sm:text-[15px] font-light leading-relaxed text-[#F6F0E5]/70">
            {story.excerpt}
          </p>
          <span className="mt-4 inline-flex items-center gap-2 text-[10px] font-semibold tracking-[0.22em] uppercase text-[#E8D3A4]">
            {forthcoming ? 'Coming soon' : 'Read story'}
            <ArrowRightIcon className="story-card-arrow size-3.5" />
          </span>
        </div>
      </StorySurface>
    </motion.li>
  );
}

function StorySurface({
  href,
  className,
  'aria-label': ariaLabel,
  children,
}: {
  href?: string;
  className: string;
  'aria-label': string;
  children: ReactNode;
}) {
  if (href) {
    return (
      <Link href={href} className={className} aria-label={ariaLabel}>
        {children}
      </Link>
    );
  }

  return (
    <div className={className} aria-label={ariaLabel}>
      {children}
    </div>
  );
}
