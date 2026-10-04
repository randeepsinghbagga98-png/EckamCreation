import { ProductGrid } from '@/components/shop/product-grid';
import type { SearchResult } from '@/lib/search/query';
import { SearchHero } from './search-hero';
import {
  SearchCategories,
  SearchErrorState,
  SearchIdleState,
  SearchNoResults,
} from './search-states';

type SearchViewProps = {
  result: SearchResult;
};

export function SearchView({ result }: SearchViewProps) {
  const { status, query, products, categories } = result;

  return (
    <div className="search-page overflow-x-hidden">
      <SearchHero query={query} />
      <section
        className="bg-[#F6F0E5] text-[#1A1815]"
        aria-label={query ? 'Search results' : 'Search'}
      >
        <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16 lg:px-12 lg:py-20">
          {status === 'error' ? (
            <SearchErrorState />
          ) : status === 'idle' ? (
            <>
              <SearchIdleState />
              <SearchCategories categories={categories} />
            </>
          ) : (
            <>
              <p
                id="search-results-heading"
                className="text-[11px] font-semibold tracking-[0.22em] uppercase text-[#1A1815]"
              >
                Search results for
              </p>
              <p className="mt-3 font-sans text-[clamp(28px,4vw,42px)] font-light tracking-[-0.04em] uppercase text-[#1A1815]">
                {query}
              </p>
              {products.length > 0 ? (
                <>
                  <p className="mt-3 text-[13px] font-light text-[#1A1815]/60">
                    {products.length} {products.length === 1 ? 'piece' : 'pieces'}
                  </p>
                  <div className="mt-8">
                    <ProductGrid products={products} tone="light" />
                  </div>
                </>
              ) : (
                <SearchNoResults />
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
