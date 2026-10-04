'use client';

import { useState } from 'react';
import { WishlistButton } from '@/components/wishlist/wishlist-button';
import { addServerCartItem } from '@/lib/cart/store';
import type { ProductCardData } from '@/lib/catalogue/product';
import {
  ADDED_TO_CART_MESSAGE,
  CART_ADD_ERROR_MESSAGE,
  LIVE_CATALOGUE_UNAVAILABLE_MESSAGE,
  PENDING_CHECKOUT_MESSAGE,
  PRODUCT_UNAVAILABLE_MESSAGE,
  type AddToCartIntent,
} from '@/lib/catalogue/purchase';

type PurchaseActionsProps = {
  intent: AddToCartIntent;
  product: ProductCardData;
  canPurchase?: boolean;
};

export function PurchaseActions({
  intent,
  product,
  canPurchase = true,
}: PurchaseActionsProps) {
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onAddToCart() {
    if (pending) {
      return;
    }

    if (!intent.variantId) {
      setNotice(LIVE_CATALOGUE_UNAVAILABLE_MESSAGE);
      return;
    }

    if (!canPurchase) {
      setNotice(PRODUCT_UNAVAILABLE_MESSAGE);
      return;
    }

    setPending(true);
    setNotice(null);

    try {
      await addServerCartItem({
        variantId: intent.variantId,
        quantity: intent.quantity,
      });
      setNotice(ADDED_TO_CART_MESSAGE);
    } catch {
      setNotice(CART_ADD_ERROR_MESSAGE);
    } finally {
      setPending(false);
    }
  }

  function onBuyNow() {
    void intent;
    setNotice(PENDING_CHECKOUT_MESSAGE);
  }

  return (
    <div className="pdp-purchase">
      <div className="pdp-purchase-row">
        <button
          type="button"
          className="pdp-cta pdp-cta--primary"
          onClick={() => void onAddToCart()}
          disabled={pending || !canPurchase}
          aria-busy={pending}
        >
          {pending ? 'Adding…' : 'Add to cart'}
        </button>
        <button type="button" className="pdp-cta pdp-cta--ghost" onClick={onBuyNow}>
          Buy now
        </button>
      </div>
      <WishlistButton
        productId={intent.productId}
        variantId={intent.variantId}
        productName={product.name}
        appearance="pdp"
      />
      {notice ? (
        <p className="pdp-purchase-notice" role="status" aria-live="polite">
          {notice}
        </p>
      ) : null}
    </div>
  );
}
