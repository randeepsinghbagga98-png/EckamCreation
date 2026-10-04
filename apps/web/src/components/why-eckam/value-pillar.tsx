'use client';

import { motion, useReducedMotion } from 'motion/react';
import type { ValuePillar } from './pillars';

type ValuePillarCardProps = {
  pillar: ValuePillar;
  index?: number;
};

export function ValuePillarCard({ pillar, index = 0 }: ValuePillarCardProps) {
  const reduceMotion = useReducedMotion();
  const Icon = pillar.Icon;

  return (
    <motion.li
      className="why-eckam-pillar min-w-0"
      initial={reduceMotion ? false : { opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{
        duration: reduceMotion ? 0 : 0.6,
        delay: reduceMotion ? 0 : index * 0.07,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      <article className="h-full">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] font-semibold tracking-[0.22em] text-[#8B6914]">
            {pillar.index}
          </p>
          <Icon className="why-eckam-pillar-icon size-4 text-[#8B6914]" />
        </div>

        <span className="why-eckam-pillar-rule mt-4 block h-px w-8 bg-[#D6A84F]" aria-hidden="true" />

        <h3 className="mt-4 font-sans text-[15px] sm:text-base font-semibold tracking-[0.14em] uppercase text-[#1A1815]">
          {pillar.title}
        </h3>
        <p className="mt-3 text-[14px] sm:text-[15px] font-light leading-relaxed text-[#1A1815]/70">
          {pillar.description}
        </p>
      </article>
    </motion.li>
  );
}
