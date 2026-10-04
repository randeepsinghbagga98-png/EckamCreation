import type { ProductSummaryDto } from '@eckamcreation/api-contracts';
import { CATEGORIES } from '@/components/shop-by-category/categories';
import type { ProductCardData } from '@/lib/catalogue/product';
import { CATALOGUE_PRODUCTS } from '@/lib/catalogue/products';

const FALLBACK_IMAGE = CATEGORIES[0]?.imageSrc ?? '/products/cream-tote.svg';

export function mapSummaryToCard(
  product: ProductSummaryDto,
  categoryName: string,
  categorySlug?: string,
): ProductCardData {
  const local = CATALOGUE_PRODUCTS.find((item) => item.slug === product.slug);
  const categoryImage = CATEGORIES.find(
    (item) => item.slug === categorySlug || item.name === categoryName,
  );

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    category: categoryName,
    href: `/shop/${product.slug}`,
    imageSrc: product.primaryMediaUrl || local?.imageSrc || categoryImage?.imageSrc || FALLBACK_IMAGE,
    imageAlt: local?.imageAlt || product.name,
    price: product.price,
  };
}

export function uniqueProducts(products: ProductCardData[]): ProductCardData[] {
  const seen = new Set<string>();
  const next: ProductCardData[] = [];

  for (const product of products) {
    if (seen.has(product.id)) {
      continue;
    }
    seen.add(product.id);
    next.push(product);
  }

  return next;
}
