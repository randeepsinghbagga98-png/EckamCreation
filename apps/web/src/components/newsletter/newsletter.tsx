'use client';

import { motion, useReducedMotion } from 'motion/react';
import { NewsletterForm } from './newsletter-form';

export function Newsletter() {
  const reduceMotion = useReducedMotion();

  return (
    <section
      id="newsletter"
      aria-labelledby="newsletter-heading"
      className="newsletter relative overflow-x-hidden bg-[#F6F0E5] text-[#1A1815]"
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#D6A84F]/45 to-transparent"
        aria-hidden="true"
      />

      <div
        className="newsletter-geometry pointer-events-none absolute inset-0"
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-24 lg:px-12 lg:py-28">
        <div className="grid items-end gap-12 lg:grid-cols-12 lg:gap-16">
          <motion.header
            className="lg:col-span-6"
            initial={reduceMotion ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: reduceMotion ? 0 : 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="section-eyebrow">Stay in the know</p>
            <h2
              id="newsletter-heading"
              className="section-title mt-4 font-sans"
            >
              <span className="block">A little more</span>
              <span className="mt-1 block font-serif italic font-normal tracking-normal text-[#8B6914] normal-case">
                Eckam.
              </span>
            </h2>
            <p className="mt-5 sm:mt-6 max-w-md text-[15px] sm:text-base font-light leading-relaxed text-[#1A1815]/70">
              Be the first to discover new collections, considered edits, and stories
              from Eckam Creation.
            </p>
          </motion.header>

          <motion.div
            className="lg:col-span-6"
            initial={reduceMotion ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{
              duration: reduceMotion ? 0 : 0.7,
              delay: reduceMotion ? 0 : 0.08,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            <NewsletterForm />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
