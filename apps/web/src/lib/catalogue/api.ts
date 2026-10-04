import type {
  CollectionDto,
  ProductDetailDto,
  ProductSummaryDto,
} from '@eckamcreation/api-contracts';
import { paths } from '@eckamcreation/api-contracts';
import { ApiClientError, apiRequest } from '@/lib/api/client';

export async function getCatalogueProduct(slug: string): Promise<ProductDetailDto | null> {
  try {
    return await apiRequest<ProductDetailDto>(paths.catalogue.product(slug));
  } catch (error) {
    if (error instanceof ApiClientError && error.status === 404) {
      return null;
    }

    return null;
  }
}

export function listCatalogueProducts(search: {
  category?: string;
  collection?: string;
  q?: string;
  sort?: string;
  inStock?: string;
  minPriceMinor?: string;
  maxPriceMinor?: string;
  cursor?: string;
  limit?: string;
} = {}) {
  return apiRequest<{ items: ProductSummaryDto[] }>(paths.catalogue.products, {
    search,
  });
}

export function listCatalogueCollections() {
  return apiRequest<{ items: CollectionDto[] }>(paths.catalogue.collections);
}

export async function getCatalogueCollection(idOrSlug: string) {
  try {
    return await apiRequest<CollectionDto & { productIds?: string[] }>(
      paths.catalogue.collection(idOrSlug),
    );
  } catch (error) {
    if (error instanceof ApiClientError && error.status === 404) {
      return null;
    }

    throw error;
  }
}
