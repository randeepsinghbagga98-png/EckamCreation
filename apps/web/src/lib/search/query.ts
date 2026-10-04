import { CATEGORIES, type CategoryItem } from '@/components/shop-by-category/categories';
import { listCatalogueProducts } from '@/lib/catalogue/api';
import type { ProductCardData } from '@/lib/catalogue/product';
import { CATALOGUE_PRODUCTS } from '@/lib/catalogue/products';
import { mapSummaryToCard, uniqueProducts } from '@/lib/collections/map';

const SEARCH_LIMIT = '50';

export type SearchStatus = 'idle' | 'ok' | 'error';

export type SearchResult = {
  status: SearchStatus;
  query: string;
  products: ProductCardData[];
  categories: CategoryItem[];
};

export function normalizeSearchQuery(value: string | string[] | null | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value;
  return (raw ?? '').trim().slice(0, 120);
}

export function buildSearchHref(value: string): string {
  const query = normalizeSearchQuery(value);
  return query ? `/search?q=${encodeURIComponent(query)}` : '/search';
}

export function categoryMatchesQuery(query: string, category: CategoryItem): boolean {
  const q = query.toLowerCase();
  if (q.length < 2) {
    return false;
  }

  const slug = category.slug.toLowerCase();
  const name = category.name.toLowerCase();
  if (slug.includes(q) || name.includes(q)) {
    return true;
  }

  return name
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 3)
    .some((token) => token.includes(q) || q.includes(token));
}

function localCategory(slug: string) {
  return CATALOGUE_PRODUCTS.find((item) => item.slug === slug)?.category ?? 'Catalogue';
}

async function loadCategoryIndex() {
  const entries = await Promise.all(
    CATEGORIES.map(async (category) => {
      const data = await listCatalogueProducts({
        category: category.slug,
        limit: SEARCH_LIMIT,
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

  return { entries, bySlug };
}

/**
 * Isolated search layer over the public catalogue list API.
 * Uses GET /v1/catalogue/products?q= for name/slug, plus category
 * matches from existing catalogue relationships. Replaceable later
 * by GET /v1/search when that endpoint is implemented.
 */
export async function searchCatalogue(
  raw: string | string[] | null | undefined,
): Promise<SearchResult> {
  const query = normalizeSearchQuery(raw);

  try {
    const index = await loadCategoryIndex();
    const categories = index.entries
      .filter((entry) => entry.items.length > 0)
      .map((entry) => entry.category);

    if (!query) {
      return { status: 'idle', query: '', products: [], categories };
    }

    const named = await listCatalogueProducts({ q: query, limit: SEARCH_LIMIT });
    const fromName = named.items.map((item) => {
      const known = index.bySlug.get(item.slug);
      return mapSummaryToCard(item, known?.name ?? localCategory(item.slug), known?.slug);
    });
    const fromCategories = index.entries
      .filter((entry) => categoryMatchesQuery(query, entry.category))
      .flatMap((entry) =>
        entry.items.map((item) =>
          mapSummaryToCard(item, entry.category.name, entry.category.slug),
        ),
      );

    return {
      status: 'ok',
      query,
      products: uniqueProducts([...fromName, ...fromCategories]),
      categories,
    };
  } catch {
    return { status: 'error', query, products: [], categories: [] };
  }
}
