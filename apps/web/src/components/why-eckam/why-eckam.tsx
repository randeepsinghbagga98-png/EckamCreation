'use client';

import { motion, useReducedMotion } from 'motion/react';
import { WHY_ECKAM_PILLARS } from './pillars';
import { ValuePillarCard } from './value-pillar';

type WhyEckamProps = {
  pillars?: typeof WHY_ECKAM_PILLARS;
};

export function WhyEckam({ pillars = WHY_ECKAM_PILLARS }: WhyEckamProps) {
  const reduceMotion = useReducedMotion();

  return (
    <section
      id="why-eckam"
      aria-labelledby="why-eckam-heading"
      className="why-eckam relative overflow-x-hidden bg-[#F6F0E5] text-[#1A1815]"
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#D6A84F]/45 to-transparent"
        aria-hidden="true"
      />

      <div
        className="why-eckam-geometry pointer-events-none absolute inset-0"
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-24 lg:px-12 lg:py-28">
        <div className="grid items-start gap-14 lg:grid-cols-12 lg:gap-16 xl:gap-20">
          <motion.header
            className="lg:col-span-5"
            initial={reduceMotion ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: reduceMotion ? 0 : 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="section-eyebrow">The Eckam Standard</p>
            <h2 id="why-eckam-heading" className="section-title mt-4 font-sans">
              Why Eckam
            </h2>
            <p className="mt-5 sm:mt-6 max-w-md text-[15px] sm:text-base font-light leading-relaxed text-[#1A1815]/70">
              A considered approach to discovering products — where thoughtful design,
              curated collections, and a refined shopping experience come together.
            </p>
          </motion.header>

          <ol className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-10 sm:gap-y-12 lg:col-span-7 lg:gap-x-10 lg:gap-y-14">
            {pillars.map((pillar, index) => (
              <ValuePillarCard key={pillar.id} pillar={pillar} index={index} />
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
