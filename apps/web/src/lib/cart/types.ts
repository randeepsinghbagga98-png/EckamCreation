import type { ProductPrice } from '@/lib/catalogue/product';

export type CartSource = 'presentation' | 'api';

export type CartStatus = 'loading' | 'ready' | 'error';

/**
 * Storefront cart line.
 * Aligns with catalogue cartItem so the Cart API can replace this later.
 */
export type CartLine = {
  id: string;
  productId: string;
  productSlug: string;
  productName: string;
  category: string;
  href: string;
  imageSrc: string;
  imageAlt: string;
  quantity: number;
  variantId?: string;
  variantName?: string | null;
  unitPrice?: ProductPrice | null;
  lineTotal?: ProductPrice | null;
};

export type CartSnapshot = {
  source: CartSource;
  status: CartStatus;
  items: CartLine[];
  itemCount: number;
  currencyCode?: string;
  /** Present only when the server (or every local line) has a live price. */
  subtotal: ProductPrice | null;
  notice: string | null;
  hasUnavailablePreview: boolean;
  pending: boolean;
};

export type CartItemInput = {
  variantId?: string;
  quantity: number;
};
