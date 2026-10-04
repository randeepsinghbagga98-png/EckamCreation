import { cache } from 'react';
import { CATEGORIES, type CategoryItem } from '@/components/shop-by-category/categories';
import { listCatalogueProducts } from '@/lib/catalogue/api';
import type { ProductCardData } from '@/lib/catalogue/product';
import { CATALOGUE_PRODUCTS } from '@/lib/catalogue/products';
import { mapSummaryToCard } from '@/lib/collections/map';
import { toCatalogueApiQuery, type CatalogueQuery, type ShopSort } from './query';

export type ShopCategoryOption = Pick<CategoryItem, 'slug' | 'name'>;

export type ShopCatalogueResult = {
  status: 'ok' | 'error';
  products: ProductCardData[];
  categories: ShopCategoryOption[];
};

const loadCategoryIndex = cache(async () => {
  const entries = await Promise.all(
    CATEGORIES.map(async (category) => {
      const data = await listCatalogueProducts({
        category: category.slug,
        limit: '50',
      });
      return { category, items: data.items };
    }),
  );

  const bySlug = new Map<string, CategoryItem>();
  for (const entry of entries) {
    for (const item of entry.items) {
      if (!bySlug.has(item.slug)) {
        bySlug.set(item.slug, entry.category);
      }
    }
  }

  return {
    bySlug,
    categories: entries
      .filter((entry) => entry.items.length > 0)
      .map((entry) => ({ slug: entry.category.slug, name: entry.category.name })),
  };
});

function localCategory(slug: string) {
  return CATALOGUE_PRODUCTS.find((item) => item.slug === slug)?.category ?? 'Catalogue';
}

function sortByPrice(products: ProductCardData[], sort: Extract<ShopSort, 'price-asc' | 'price-desc'>) {
  const direction = sort === 'price-asc' ? 1 : -1;

  return [...products].sort((a, b) => {
    const aPrice = a.price ? Number(a.price.amountMinor) : Number.POSITIVE_INFINITY;
    const bPrice = b.price ? Number(b.price.amountMinor) : Number.POSITIVE_INFINITY;
    return (aPrice - bPrice) * direction;
  });
}

export async function loadShopCatalogue(query: CatalogueQuery): Promise<ShopCatalogueResult> {
  try {
    const [index, listed] = await Promise.all([
      loadCategoryIndex(),
      listCatalogueProducts(toCatalogueApiQuery(query)),
    ]);

    const mapped = listed.items.map((item) => {
      const known = index.bySlug.get(item.slug);
      return mapSummaryToCard(item, known?.name ?? localCategory(item.slug), known?.slug);
    });

    return {
      status: 'ok',
      products:
        query.sort === 'price-asc' || query.sort === 'price-desc'
          ? sortByPrice(mapped, query.sort)
          : mapped,
      categories: index.categories,
    };
  } catch {
    return { status: 'error', products: [], categories: [] };
  }
}

export async function loadHomeCatalogue(): Promise<ProductCardData[]> {
  try {
    const listed = await listCatalogueProducts({ limit: '8', sort: 'created_at' });
    return listed.items.map((item) => mapSummaryToCard(item, 'Catalogue'));
  } catch {
    return [];
  }
}
