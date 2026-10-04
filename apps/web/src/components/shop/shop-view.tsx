'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { buildShopHref, type CatalogueQuery, type ShopSort } from '@/lib/catalogue/query';
import type { ShopCatalogueResult } from '@/lib/catalogue/shop';
import { CatalogueToolbar } from './catalogue-toolbar';
import { CategoryNav } from './category-nav';
import { FilterChips } from './filter-chips';
import { FilterPanel } from './filter-panel';
import { ProductGrid } from './product-grid';
import { ShopErrorState } from './shop-error-state';
import { ShopHero } from './shop-hero';

type ShopViewProps = {
  query: CatalogueQuery;
  catalogue: ShopCatalogueResult;
};

export function ShopView({ query, catalogue }: ShopViewProps) {
  const router = useRouter();
  const [filtersOpen, setFiltersOpen] = useState(false);

  function onSortChange(sort: ShopSort) {
    router.push(buildShopHref({ ...query, sort }), { scroll: false });
  }

  return (
    <div className="shop-page">
      <ShopHero />
      <CategoryNav query={query} categories={catalogue.categories} />

      <section className="shop-catalogue" aria-label="Product catalogue">
        <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-12 lg:px-12 lg:py-16">
          <CatalogueToolbar
            sort={query.sort}
            count={catalogue.status === 'ok' ? catalogue.products.length : 0}
            filtersOpen={filtersOpen}
            onSortChange={onSortChange}
            onToggleFilters={() => setFiltersOpen((open) => !open)}
          />

          <FilterChips query={query} />

          <div className={`shop-catalogue-body ${filtersOpen ? 'has-filters' : ''}`}>
            <FilterPanel
              open={filtersOpen}
              query={query}
              categories={catalogue.categories}
              onClose={() => setFiltersOpen(false)}
            />

            <div className="min-w-0">
              <div aria-live="polite" className="sr-only">
                {catalogue.status === 'error'
                  ? 'Catalogue temporarily unavailable'
                  : `${catalogue.products.length} products`}
              </div>
              {catalogue.status === 'error' ? (
                <ShopErrorState />
              ) : (
                <ProductGrid products={catalogue.products} />
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
