import { ProductGrid } from '@/components/shop/product-grid';

export function SearchLoading() {
  return (
    <div className="search-page overflow-x-hidden" aria-busy="true">
      <div className="search-hero bg-[#050505] px-5 py-16 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <div className="collections-skeleton collections-skeleton--kicker" />
          <div className="collections-skeleton collections-skeleton--title" />
          <div className="mt-8 h-14 max-w-3xl rounded-[4px] bg-white/[0.06]" />
        </div>
      </div>
      <section className="bg-[#F6F0E5] px-5 py-12 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <ProductGrid products={[]} isLoading />
        </div>
      </section>
    </div>
  );
}
