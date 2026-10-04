import { CATEGORIES } from '@/components/shop-by-category/categories';
import { CategoryNav } from './category-nav';
import { ProductGrid } from './product-grid';
import { ShopHero } from './shop-hero';

export function ShopFallback() {
  return (
    <div className="shop-page">
      <ShopHero />
      <CategoryNav
        query={{ sort: 'newest' }}
        categories={CATEGORIES.map(({ slug, name }) => ({ slug, name }))}
      />
      <section className="shop-catalogue" aria-labelledby="shop-heading">
        <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-12 lg:px-12 lg:py-16">
          <p className="text-[11px] font-semibold tracking-[0.28em] uppercase text-[#1A1815]">
            Products
          </p>
          <div className="mt-8">
            <ProductGrid products={[]} isLoading />
          </div>
        </div>
      </section>
    </div>
  );
}
