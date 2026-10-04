'use client';

import { motion, useReducedMotion } from 'motion/react';

type AccountHeaderProps = {
  kicker?: string;
  title: string;
  copy: string;
};

export function AccountHeader({
  kicker = 'Customer',
  title,
  copy,
}: AccountHeaderProps) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="account-heading">
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.65, ease: [0.22, 1, 0.36, 1] }}
      >
        <p className="account-kicker">{kicker}</p>
        <h1 className="account-title">{title}</h1>
        <p className="account-copy">{copy}</p>
      </motion.div>
    </div>
  );
}
