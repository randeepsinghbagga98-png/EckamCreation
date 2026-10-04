'use client';

import { motion, useReducedMotion } from 'motion/react';
import { CUSTOMER_STORIES } from './stories';
import { StoryCard } from './story-card';

type CustomerStoriesProps = {
  stories?: typeof CUSTOMER_STORIES;
};

export function CustomerStories({ stories = CUSTOMER_STORIES }: CustomerStoriesProps) {
  const reduceMotion = useReducedMotion();

  return (
    <section
      id="customer-stories"
      aria-labelledby="customer-stories-heading"
      className="customer-stories relative overflow-x-hidden bg-[#050505] text-[#F6F0E5]"
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#D6A84F]/45 to-transparent"
        aria-hidden="true"
      />

      <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-24 lg:px-12 lg:py-28">
        <motion.header
          className="max-w-2xl"
          initial={reduceMotion ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: reduceMotion ? 0 : 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="mb-5 flex items-center gap-3">
            <span
              className="h-px w-9 sm:w-11 bg-gradient-to-r from-[#D6A84F] to-[#E8D3A4]"
              aria-hidden="true"
            />
            <p className="text-[10px] sm:text-[11px] font-bold tracking-[0.28em] uppercase text-[#D6A84F]">
              Customer Stories
            </p>
          </div>

          <h2
            id="customer-stories-heading"
            className="font-sans text-[clamp(36px,5.6vw,68px)] font-light leading-[0.94] tracking-[-0.04em] uppercase text-[#F6F0E5]"
          >
            <span className="block">Stories ahead.</span>
            <span className="mt-1 block font-serif italic font-normal tracking-normal text-[#E8D3A4] normal-case">
              Real style.
            </span>
          </h2>

          <p className="mt-5 sm:mt-6 max-w-xl text-[15px] sm:text-base font-light leading-relaxed text-[#F6F0E5]/74">
            A dedicated space for customer experiences, perspectives, and stories
            to be added as verified experiences become available.
          </p>
        </motion.header>

        <ul className="mt-14 sm:mt-16 lg:mt-20 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 lg:grid-rows-2 gap-3 sm:gap-4">
          {stories.map((story, index) => (
            <StoryCard key={story.id} story={story} index={index} />
          ))}
        </ul>
      </div>
    </section>
  );
}
