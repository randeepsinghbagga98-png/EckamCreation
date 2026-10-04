'use client';

import { AnimatePresence } from 'motion/react';
import type { CartLine } from '@/lib/cart/types';
import { CartItem } from './cart-item';

type CartListProps = {
  items: CartLine[];
  onQuantityChange: (lineId: string, quantity: number) => void;
  onRemove: (lineId: string) => void;
};

export function CartList({ items, onQuantityChange, onRemove }: CartListProps) {
  return (
    <ul className="cart-list">
      <AnimatePresence initial={false}>
        {items.map((item, index) => (
          <li key={item.id}>
            <CartItem
              item={item}
              index={index}
              onQuantityChange={onQuantityChange}
              onRemove={onRemove}
            />
          </li>
        ))}
      </AnimatePresence>
    </ul>
  );
}
