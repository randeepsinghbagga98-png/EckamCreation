/**
 * Presentation model for storefront product cards.
 * Aligns with catalogue `productSummary` so API data can replace placeholders later.
 */
export type ProductPrice = {
  amountMinor: string;
  currencyCode: string;
};

export type ProductCardData = {
  id: string;
  slug: string;
  name: string;
  category: string;
  href: string;
  imageSrc: string;
  imageAlt: string;
  /** Present only when catalogue pricing exists. Never invent a value. */
  price?: ProductPrice | null;
};

export function formatProductPrice(price: ProductPrice): string {
  const amount = Number(price.amountMinor) / 100;

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: price.currencyCode,
    maximumFractionDigits: 0,
  }).format(amount);
}
