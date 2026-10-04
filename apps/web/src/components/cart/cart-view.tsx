'use client';

import { motion, useReducedMotion } from 'motion/react';
import {
  removeCartLine,
  retryPresentationCart,
  setCartQuantity,
  useCart,
} from '@/lib/cart/store';
import { CartEmptyState } from './cart-empty-state';
import { CartErrorState } from './cart-error-state';
import { CartList } from './cart-list';
import { CartSkeleton } from './cart-skeleton';
import { CartSummary } from './cart-summary';

export function CartView() {
  const cart = useCart();

  if (cart.status === 'loading') {
    return <CartSkeleton />;
  }

  if (cart.status === 'error') {
    return (
      <div className="cart-page">
        <CartHeader />
        <div className="mx-auto max-w-7xl px-5 pb-20 sm:px-8 lg:px-12">
          <CartErrorState onRetry={retryPresentationCart} />
        </div>
      </div>
    );
  }

  return (
    <div className="cart-page">
      <CartHeader />

      <div className="mx-auto max-w-7xl px-5 pb-20 sm:px-8 lg:px-12">
        {cart.items.length === 0 ? (
          <>
            {cart.notice ? (
              <p className="cart-preview-note" role="status">
                {cart.notice}
              </p>
            ) : null}
            <CartEmptyState />
          </>
        ) : (
          <>
            {cart.source === 'presentation' ? (
              <p className="cart-preview-note" role="status">
                This is a local preview. These pieces have not been saved to a
                server cart.
              </p>
            ) : null}
            {cart.notice ? (
              <p className="cart-preview-note" role="status">
                {cart.notice}
              </p>
            ) : null}

            <div className="cart-layout">
              <CartList
                items={cart.items}
                onQuantityChange={(lineId, quantity) => {
                  void setCartQuantity(lineId, quantity);
                }}
                onRemove={(lineId) => {
                  void removeCartLine(lineId);
                }}
              />
              <CartSummary cart={cart} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function CartHeader() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="mx-auto max-w-7xl px-5 pt-12 pb-8 sm:px-8 sm:pt-16 sm:pb-10 lg:px-12">
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.65, ease: [0.22, 1, 0.36, 1] }}
      >
        <p className="text-[10px] font-bold tracking-[0.28em] uppercase text-[#8B6914]">
          Your selection
        </p>
        <h1 className="mt-3 font-sans text-[clamp(36px,6vw,64px)] font-light tracking-[-0.045em] leading-[0.98] uppercase text-[#1A1815]">
          Shopping cart
        </h1>
        <p className="mt-5 max-w-xl text-[15px] sm:text-base font-light leading-relaxed text-[#1A1815]/68">
          Review your selected pieces before continuing to checkout.
        </p>
      </motion.div>
    </div>
  );
}
