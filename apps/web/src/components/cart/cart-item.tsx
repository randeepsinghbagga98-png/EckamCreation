'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion, useReducedMotion } from 'motion/react';
import { CloseIcon } from '@/components/icons';
import { formatProductPrice } from '@/lib/catalogue/product';
import type { CartLine } from '@/lib/cart/types';
import { CartQuantity } from './cart-quantity';

type CartItemProps = {
  item: CartLine;
  index?: number;
  onQuantityChange: (lineId: string, quantity: number) => void;
  onRemove: (lineId: string) => void;
};

export function CartItem({
  item,
  index = 0,
  onQuantityChange,
  onRemove,
}: CartItemProps) {
  const reduceMotion = useReducedMotion();
  const priceLabel = item.unitPrice ? formatProductPrice(item.unitPrice) : null;
  const lineLabel = item.lineTotal ? formatProductPrice(item.lineTotal) : null;

  return (
    <motion.article
      layout={!reduceMotion}
      className="cart-item"
      initial={reduceMotion ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduceMotion ? undefined : { opacity: 0, y: -10 }}
      transition={{
        duration: reduceMotion ? 0 : 0.45,
        delay: reduceMotion ? 0 : index * 0.05,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      <Link href={item.href} className="cart-item-image">
        {item.imageSrc ? (
          <Image
            src={item.imageSrc}
            alt={item.imageAlt}
            fill
            unoptimized
            sizes="120px"
            className="object-contain object-center p-3"
          />
        ) : (
          <span className="sr-only">{item.imageAlt}</span>
        )}
      </Link>

      <div className="cart-item-body min-w-0">
        <p className="cart-item-category">{item.category}</p>
        <h3 className="cart-item-name">
          <Link href={item.href}>{item.productName}</Link>
        </h3>
        {item.variantName ? (
          <p className="cart-item-variant">{item.variantName}</p>
        ) : null}
        {priceLabel ? <p className="cart-item-price">{priceLabel}</p> : null}

        <div className="cart-item-actions">
          <CartQuantity
            value={item.quantity}
            productName={item.productName}
            onChange={(quantity) => onQuantityChange(item.id, quantity)}
          />
          <button
            type="button"
            className="cart-item-remove"
            onClick={() => onRemove(item.id)}
          >
            <CloseIcon className="size-3.5" />
            Remove
            <span className="sr-only">{item.productName}</span>
          </button>
        </div>
      </div>

      {lineLabel ? <p className="cart-item-line">{lineLabel}</p> : null}
    </motion.article>
  );
}
