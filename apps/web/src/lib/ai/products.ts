import { CATALOGUE_PRODUCTS } from '@/lib/catalogue/products';
import { formatProductPrice } from '@/lib/catalogue/product';
import { productHref, safeMediaUrl } from './safety';
import type { AiChatProduct } from './types';

export type AiProductCardData = {
  id: string;
  slug: string;
  name: string;
  href: string;
  priceLabel: string | null;
  inStock?: boolean;
  imageSrc: string | null;
  imageAlt: string;
  category: string | null;
};

export function toAiProductCard(product: AiChatProduct): AiProductCardData {
  const local = CATALOGUE_PRODUCTS.find((item) => item.slug === product.slug);
  const price =
    product.price && product.price.amountMinor && product.price.currencyCode
      ? formatProductPrice(product.price)
      : null;

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    href: productHref(product.slug),
    priceLabel: price,
    inStock: product.inStock,
    imageSrc: safeMediaUrl(product.primaryMediaUrl) || local?.imageSrc || null,
    imageAlt: local?.imageAlt || product.name,
    category: product.category ?? local?.category ?? null,
  };
}
