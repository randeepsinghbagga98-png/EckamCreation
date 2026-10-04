'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowRightIcon } from '../icons';
import type { DestinationItem } from './destinations';

type DestinationCardProps = {
  destination: DestinationItem;
  index?: number;
};

export function DestinationCard({ destination, index = 0 }: DestinationCardProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.li
      className="min-w-0"
      initial={reduceMotion ? false : { opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{
        duration: reduceMotion ? 0 : 0.6,
        delay: reduceMotion ? 0 : index * 0.06,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      <Link
        href={destination.href}
        className="destination-card group flex min-h-16 items-center justify-between gap-2.5 rounded-[4px] px-3 py-3.5 sm:min-h-[4.5rem] sm:gap-3 sm:px-5 sm:py-4"
        aria-label={`Explore the shop — ${destination.name}`}
      >
        <span className="min-w-0">
          <span className="block text-[10px] font-semibold tracking-[0.22em] uppercase text-[#D6A84F]">
            {destination.countryCode}
          </span>
          <span className="mt-1 block font-serif text-[16px] sm:text-[20px] font-normal leading-snug text-[#F6F0E5]">
            {destination.name}
          </span>
        </span>
        <ArrowRightIcon
          className="destination-card-arrow size-3.5 shrink-0 text-[#E8D3A4]"
          aria-hidden="true"
        />
      </Link>
    </motion.li>
  );
}
