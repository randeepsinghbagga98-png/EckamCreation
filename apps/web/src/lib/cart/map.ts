import type { CartDto, CartItemDto } from '@eckamcreation/api-contracts';
import { CATALOGUE_PRODUCTS } from '@/lib/catalogue/products';
import type { CartLine, CartSnapshot } from './types';

function presentationForSlug(slug: string) {
  return CATALOGUE_PRODUCTS.find((product) => product.slug === slug);
}

export function mapCartItem(item: CartItemDto): CartLine {
  const presentation = presentationForSlug(item.productSlug);

  return {
    id: item.id,
    productId: item.productId,
    productSlug: item.productSlug,
    productName: item.productName,
    category: presentation?.category ?? '',
    href: `/shop/${item.productSlug}`,
    imageSrc: presentation?.imageSrc ?? '',
    imageAlt: presentation?.imageAlt ?? item.productName,
    quantity: item.quantity,
    variantId: item.variantId,
    variantName: item.variantName,
    unitPrice: item.unitPrice,
    lineTotal: item.lineTotal,
  };
}

export function mapCartDto(
  cart: CartDto,
  extras: Pick<CartSnapshot, 'notice' | 'hasUnavailablePreview' | 'pending'> = {
    notice: null,
    hasUnavailablePreview: false,
    pending: false,
  },
): CartSnapshot {
  const items = cart.items.map(mapCartItem);

  return {
    source: 'api',
    status: 'ready',
    items,
    itemCount: cart.itemCount,
    currencyCode: cart.currencyCode,
    subtotal: cart.subtotal,
    notice: extras.notice,
    hasUnavailablePreview: extras.hasUnavailablePreview,
    pending: extras.pending,
  };
}
