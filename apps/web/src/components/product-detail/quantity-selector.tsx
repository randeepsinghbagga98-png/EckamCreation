'use client';

import { MinusIcon, PlusIcon } from '@/components/icons';
import { CART_MAX_QUANTITY } from '@/lib/catalogue/purchase';

type QuantitySelectorProps = {
  value: number;
  onChange: (value: number) => void;
};

export function QuantitySelector({ value, onChange }: QuantitySelectorProps) {
  const quantity = Math.max(1, Math.min(CART_MAX_QUANTITY, value));

  return (
    <div className="pdp-quantity">
      <p className="pdp-field-label" id="pdp-quantity-label">
        Quantity
      </p>
      <div
        className="pdp-quantity-control"
        role="group"
        aria-labelledby="pdp-quantity-label"
      >
        <button
          type="button"
          className="pdp-quantity-button"
          aria-label="Decrease quantity"
          disabled={quantity <= 1}
          onClick={() => onChange(quantity - 1)}
        >
          <MinusIcon className="size-3.5" />
        </button>
        <span className="pdp-quantity-value" aria-live="polite">
          {quantity}
        </span>
        <button
          type="button"
          className="pdp-quantity-button"
          aria-label="Increase quantity"
          disabled={quantity >= CART_MAX_QUANTITY}
          onClick={() => onChange(quantity + 1)}
        >
          <PlusIcon className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
