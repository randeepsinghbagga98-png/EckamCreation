export const SHOP_SORT_VALUES = ['newest', 'price-asc', 'price-desc', 'name-asc'] as const;

export type ShopSort = (typeof SHOP_SORT_VALUES)[number];

export const SHOP_SORT_OPTIONS: readonly { value: ShopSort; label: string }[] = [
  { value: 'newest', label: 'Newest' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'name-asc', label: 'Name: A–Z' },
];

export type ShopAvailability = 'in-stock';

export type CatalogueQuery = {
  category?: string;
  sort: ShopSort;
  availability?: ShopAvailability;
  minPrice?: string;
  maxPrice?: string;
};

function firstParam(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  const next = raw?.trim();
  return next ? next : undefined;
}

function isShopSort(value: string | undefined): value is ShopSort {
  return SHOP_SORT_VALUES.includes(value as ShopSort);
}

function digitsOnly(value: string | undefined): string | undefined {
  if (!value || !/^\d+$/.test(value)) {
    return undefined;
  }

  return value;
}

export function parseCatalogueSearchParams(
  params: URLSearchParams | Record<string, string | string[] | undefined>,
): CatalogueQuery {
  const read = (key: string) => {
    if (params instanceof URLSearchParams) {
      return params.get(key) ?? undefined;
    }

    return firstParam(params[key]);
  };

  const availability = read('availability');
  const sort = read('sort');

  return {
    category: firstParam(read('category')),
    sort: isShopSort(sort) ? sort : 'newest',
    availability: availability === 'in-stock' ? 'in-stock' : undefined,
    minPrice: digitsOnly(read('minPrice')),
    maxPrice: digitsOnly(read('maxPrice')),
  };
}

export function buildShopHref(query: CatalogueQuery): string {
  const params = new URLSearchParams();

  if (query.category) {
    params.set('category', query.category);
  }

  if (query.sort !== 'newest') {
    params.set('sort', query.sort);
  }

  if (query.availability === 'in-stock') {
    params.set('availability', 'in-stock');
  }

  if (query.minPrice) {
    params.set('minPrice', query.minPrice);
  }

  if (query.maxPrice) {
    params.set('maxPrice', query.maxPrice);
  }

  const qs = params.toString();
  return qs ? `/shop?${qs}` : '/shop';
}

export function rupeesToMinor(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) {
    return undefined;
  }

  return String(Math.round(amount * 100));
}

export function toCatalogueApiQuery(query: CatalogueQuery): Record<string, string> {
  const params: Record<string, string> = { limit: '100' };

  if (query.category) {
    params.category = query.category;
  }

  if (query.availability === 'in-stock') {
    params.inStock = 'true';
  }

  const minPriceMinor = rupeesToMinor(query.minPrice);
  const maxPriceMinor = rupeesToMinor(query.maxPrice);

  if (minPriceMinor) {
    params.minPriceMinor = minPriceMinor;
  }

  if (maxPriceMinor) {
    params.maxPriceMinor = maxPriceMinor;
  }

  if (query.sort === 'name-asc') {
    params.sort = 'name';
  } else {
    params.sort = 'created_at';
  }

  return params;
}

export function queryHasFilters(query: CatalogueQuery): boolean {
  return Boolean(
    query.category ||
      query.availability ||
      query.minPrice ||
      query.maxPrice ||
      query.sort !== 'newest',
  );
}
