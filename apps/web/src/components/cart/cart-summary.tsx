'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'motion/react';
import { formatProductPrice } from '@/lib/catalogue/product';
import type { CartSnapshot } from '@/lib/cart/types';

type CartSummaryProps = {
  cart: CartSnapshot;
};

export function CartSummary({ cart }: CartSummaryProps) {
  const reduceMotion = useReducedMotion();
  const subtotalLabel = cart.subtotal ? formatProductPrice(cart.subtotal) : null;

  return (
    <motion.aside
      className="cart-summary"
      aria-labelledby="cart-summary-heading"
      initial={reduceMotion ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.55, ease: [0.22, 1, 0.36, 1] }}
    >
      <h2 id="cart-summary-heading" className="cart-summary-heading">
        Order summary
      </h2>

      <dl className="cart-summary-rows">
        <div>
          <dt>Subtotal</dt>
          <dd>{subtotalLabel ?? 'Available when pricing is connected.'}</dd>
        </div>
        <div>
          <dt>Shipping</dt>
          <dd>Calculated at checkout.</dd>
        </div>
        <div>
          <dt>Tax</dt>
          <dd>Calculated at checkout.</dd>
        </div>
        <div className="cart-summary-total">
          <dt>Total</dt>
          <dd>{subtotalLabel ?? 'Available at checkout.'}</dd>
        </div>
      </dl>

      <Link href="/checkout" className="cart-cta cart-cta--primary w-full">
        Proceed to checkout
      </Link>
      <Link href="/shop" className="cart-cta cart-cta--ghost w-full">
        Continue shopping
      </Link>
    </motion.aside>
  );
}
