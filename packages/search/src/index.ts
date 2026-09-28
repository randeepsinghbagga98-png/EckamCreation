export type SearchMode = "keyword" | "natural-language";

export type SearchFilters = {
  category?: string;
  brand?: string;
  priceMin?: string;
  priceMax?: string;
  ratingMin?: number;
  availability?: "in-stock" | "out-of-stock";
  shipToCountry?: string;
  currency?: string;
  sort?: "relevance" | "price_asc" | "price_desc" | "newest" | "rating";
};

export type SearchHit = {
  productId: string;
  slug: string;
  name: string;
  score?: number;
};

export type SearchResult = {
  hits: SearchHit[];
  nextCursor: string | null;
  hasMore: boolean;
  interpretedFilters?: SearchFilters;
};

export interface ProductSearchService {
  search(input: { q?: string; filters?: SearchFilters; cursor?: string; limit?: number }): Promise<SearchResult>;
  naturalSearch(input: {
    query: string;
    currency?: string;
    shipToCountry?: string;
  }): Promise<SearchResult>;
}

export class NotImplementedSearchError extends Error {
  readonly code = "NOT_IMPLEMENTED" as const;
  constructor(method: string) {
    super(`ProductSearchService.${method} is not implemented yet`);
    this.name = "NotImplementedSearchError";
  }
}

export function createProductSearchService(): ProductSearchService {
  return {
    async search() {
      throw new NotImplementedSearchError("search");
    },
    async naturalSearch() {
      throw new NotImplementedSearchError("naturalSearch");
    },
  };
}
