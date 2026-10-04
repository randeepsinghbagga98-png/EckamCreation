'use client';

import { MinusIcon, PlusIcon } from '@/components/icons';
import { CART_MAX_QUANTITY } from '@/lib/catalogue/purchase';

type CartQuantityProps = {
  value: number;
  productName: string;
  onChange: (value: number) => void;
};

export function CartQuantity({ value, productName, onChange }: CartQuantityProps) {
  const quantity = Math.max(1, Math.min(CART_MAX_QUANTITY, value));

  return (
    <div
      className="cart-quantity"
      role="group"
      aria-label={`Quantity for ${productName}`}
    >
      <button
        type="button"
        className="cart-quantity-button"
        aria-label={`Decrease quantity of ${productName}`}
        disabled={quantity <= 1}
        onClick={() => onChange(quantity - 1)}
      >
        <MinusIcon className="size-3.5" />
      </button>
      <span className="cart-quantity-value" aria-live="polite">
        {quantity}
      </span>
      <button
        type="button"
        className="cart-quantity-button"
        aria-label={`Increase quantity of ${productName}`}
        disabled={quantity >= CART_MAX_QUANTITY}
        onClick={() => onChange(quantity + 1)}
      >
        <PlusIcon className="size-3.5" />
      </button>
    </div>
  );
}
