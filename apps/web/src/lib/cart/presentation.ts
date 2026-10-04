import type { ProductCardData, ProductPrice } from '@/lib/catalogue/product';
import { CART_MAX_QUANTITY } from '@/lib/catalogue/purchase';
import type { CartItemInput, CartLine, CartSnapshot } from './types';

export function clampCartQuantity(value: number): number {
  return Math.max(1, Math.min(CART_MAX_QUANTITY, Math.trunc(value)));
}

export function lineTotalFor(
  unitPrice: ProductPrice | null | undefined,
  quantity: number,
): ProductPrice | null {
  if (!unitPrice) {
    return null;
  }

  return {
    currencyCode: unitPrice.currencyCode,
    amountMinor: String(Number(unitPrice.amountMinor) * quantity),
  };
}

export function createCartLine(
  product: ProductCardData,
  quantity: number,
  variant?: { id?: string; name?: string | null },
): CartLine {
  const nextQuantity = clampCartQuantity(quantity);

  return {
    id: `local-${product.id}`,
    productId: product.id,
    productSlug: product.slug,
    productName: product.name,
    category: product.category,
    href: product.href,
    imageSrc: product.imageSrc,
    imageAlt: product.imageAlt,
    quantity: nextQuantity,
    variantId: variant?.id,
    variantName: variant?.name ?? null,
    unitPrice: product.price ?? null,
    lineTotal: lineTotalFor(product.price, nextQuantity),
  };
}

export function computeSubtotal(items: CartLine[]): ProductPrice | null {
  if (items.length === 0) {
    return null;
  }

  const priced = items.filter((item) => item.lineTotal);
  if (priced.length !== items.length) {
    return null;
  }

  const currencyCode = priced[0]?.lineTotal?.currencyCode;
  if (!currencyCode || priced.some((item) => item.lineTotal?.currencyCode !== currencyCode)) {
    return null;
  }

  const amountMinor = priced.reduce(
    (sum, item) => sum + Number(item.lineTotal?.amountMinor ?? 0),
    0,
  );

  return { currencyCode, amountMinor: String(amountMinor) };
}

export function toCartSnapshot(
  items: CartLine[],
  source: CartSnapshot['source'] = 'presentation',
  status: CartSnapshot['status'] = 'ready',
): CartSnapshot {
  return {
    source,
    status,
    items,
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    currencyCode: items[0]?.unitPrice?.currencyCode ?? items[0]?.lineTotal?.currencyCode,
    subtotal: computeSubtotal(items),
    notice: null,
    hasUnavailablePreview: false,
    pending: false,
  };
}

export const CART_LOAD_ERROR_MESSAGE = "We couldn't load your cart. Please try again.";
export const CART_MUTATION_ERROR_MESSAGE =
  'Your selection could not be updated. Please try again.';
export const PREVIEW_UNAVAILABLE_MESSAGE =
  'Some preview selections are not available in the live catalogue yet.';

/**
 * Adapter for POST /v1/carts/current/items.
 * Intended for a future fetch — this page does not call the API yet.
 */
export function toCartApiItemInput(line: CartLine): CartItemInput | null {
  if (!line.variantId) {
    return null;
  }

  return {
    variantId: line.variantId,
    quantity: line.quantity,
  };
}
