'use client';

import { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { ChevronDownIcon } from '@/components/icons';
import {
  DETAILS_PENDING_COPY,
  type ProductDetailData,
} from '@/lib/catalogue/product-detail';

type ProductAccordionsProps = {
  product: ProductDetailData;
};

const PANELS = [
  { id: 'description', label: 'Description', field: 'description' },
  { id: 'details', label: 'Details', field: 'details' },
  { id: 'shipping', label: 'Shipping & Returns', field: 'shipping' },
] as const;

export function ProductAccordions({ product }: ProductAccordionsProps) {
  const reduceMotion = useReducedMotion();
  const [openId, setOpenId] = useState<string>('description');

  return (
    <div className="pdp-accordions">
      {PANELS.map((panel) => {
        const open = openId === panel.id;
        const copy = product[panel.field]?.trim() || DETAILS_PENDING_COPY;
        const panelId = `pdp-panel-${panel.id}`;
        const buttonId = `pdp-accordion-${panel.id}`;

        return (
          <div key={panel.id} className="pdp-accordion">
            <h2 className="pdp-accordion-heading">
              <button
                type="button"
                id={buttonId}
                className="pdp-accordion-trigger"
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => setOpenId(open ? '' : panel.id)}
              >
                {panel.label}
                <ChevronDownIcon
                  className={`size-4 shrink-0 transition-transform duration-300 ${
                    open ? 'rotate-180' : ''
                  } motion-reduce:transition-none`}
                />
              </button>
            </h2>
            <AnimatePresence initial={false}>
              {open ? (
                <motion.div
                  id={panelId}
                  role="region"
                  aria-labelledby={buttonId}
                  className="pdp-accordion-panel"
                  initial={reduceMotion ? false : { height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={reduceMotion ? undefined : { height: 0, opacity: 0 }}
                  transition={{ duration: reduceMotion ? 0 : 0.28, ease: [0.22, 1, 0.36, 1] }}
                >
                  <p>{copy}</p>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
