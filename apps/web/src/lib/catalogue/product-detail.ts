import type { ProductDetailDto } from '@eckamcreation/api-contracts';
import { CATEGORIES } from '@/components/shop-by-category/categories';
import { mapSummaryToCard } from '@/lib/collections/map';
import { listCatalogueProducts } from './api';
import type { ProductCardData, ProductPrice } from './product';
import { CATALOGUE_PRODUCTS } from './products';

export type ProductMedia = {
  id: string;
  url: string;
  altText: string;
  isPrimary: boolean;
};

export type ProductVariantAttribute = {
  code: string;
  name: string;
  value: string;
};

export type ProductVariant = {
  id: string;
  sku?: string;
  name: string | null;
  isDefault: boolean;
  attributes: ProductVariantAttribute[];
  price?: ProductPrice | null;
  inStock?: boolean;
};

/**
 * Storefront product-detail model.
 * Aligns with catalogue `productDetail` so API data can replace this later.
 */
export type ProductDetailData = {
  id: string;
  slug: string;
  name: string;
  category: string;
  categorySlug?: string;
  href: string;
  description?: string | null;
  details?: string | null;
  shipping?: string | null;
  price?: ProductPrice | null;
  inStock?: boolean;
  defaultVariantId?: string | null;
  media: ProductMedia[];
  variants: ProductVariant[];
};

export const DETAILS_PENDING_COPY = 'Details will be available soon.';

export function getCategorySlug(categoryName: string): string | undefined {
  return CATEGORIES.find((item) => item.name === categoryName)?.slug;
}

export function toProductDetail(product: ProductCardData): ProductDetailData {
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    category: product.category,
    categorySlug: getCategorySlug(product.category),
    href: product.href,
    description: null,
    details: null,
    shipping: null,
    price: product.price ?? null,
    media: [
      {
        id: `${product.id}-primary`,
        url: product.imageSrc,
        altText: product.imageAlt,
        isPrimary: true,
      },
    ],
    variants: [],
  };
}

export function getProductBySlug(slug: string): ProductDetailData | null {
  const product = CATALOGUE_PRODUCTS.find((item) => item.slug === slug);
  return product ? toProductDetail(product) : null;
}

export function toLiveProductDetail(live: ProductDetailDto): ProductDetailData {
  const primaryCategory =
    live.categories.find((category) => category.isPrimary) ?? live.categories[0];
  const categoryName = primaryCategory?.name ?? 'Catalogue';
  const categorySlug = primaryCategory?.slug ?? getCategorySlug(categoryName);
  const local = CATALOGUE_PRODUCTS.find((item) => item.slug === live.slug);
  const categoryImage = CATEGORIES.find(
    (item) => item.slug === categorySlug || item.name === categoryName,
  );

  const liveMedia = [...live.media]
    .filter((item) => item.url)
    .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.sortOrder - b.sortOrder)
    .map((item) => ({
      id: item.id,
      url: item.url,
      altText: item.altText || live.name,
      isPrimary: item.isPrimary,
    }));

  const fallbackUrl = local?.imageSrc || categoryImage?.imageSrc || '';
  const media =
    liveMedia.length > 0
      ? liveMedia
      : fallbackUrl
        ? [
            {
              id: `${live.id}-primary`,
              url: fallbackUrl,
              altText: local?.imageAlt || live.name,
              isPrimary: true,
            },
          ]
        : [];

  return {
    id: live.id,
    slug: live.slug,
    name: live.name,
    category: categoryName,
    categorySlug,
    href: `/shop/${live.slug}`,
    description: live.description,
    details: null,
    shipping: null,
    price: live.price,
    inStock: live.inStock,
    defaultVariantId: live.defaultVariantId,
    media,
    variants: live.variants
      .filter((variant) => variant.isActive)
      .map((variant) => ({
        id: variant.id,
        sku: variant.sku,
        name: variant.name,
        isDefault: variant.isDefault || variant.id === live.defaultVariantId,
        attributes: variant.attributes,
        price: variant.price,
        inStock: variant.inStock,
      })),
  };
}

export async function getRelatedProducts(slug: string, limit = 4): Promise<ProductCardData[]> {
  try {
    const listed = await listCatalogueProducts({ limit: '12', sort: 'created_at' });
    return listed.items
      .filter((item) => item.slug !== slug)
      .slice(0, limit)
      .map((item) => mapSummaryToCard(item, 'Catalogue'));
  } catch {
    return [];
  }
}

export type VariantAttributeGroup = {
  code: string;
  name: string;
  values: string[];
};

export function groupVariantAttributes(
  variants: ProductVariant[],
): VariantAttributeGroup[] {
  const groups = new Map<string, VariantAttributeGroup>();

  for (const variant of variants) {
    for (const attribute of variant.attributes) {
      const existing = groups.get(attribute.code);
      if (existing) {
        if (!existing.values.includes(attribute.value)) {
          existing.values.push(attribute.value);
        }
      } else {
        groups.set(attribute.code, {
          code: attribute.code,
          name: attribute.name,
          values: [attribute.value],
        });
      }
    }
  }

  return [...groups.values()];
}
