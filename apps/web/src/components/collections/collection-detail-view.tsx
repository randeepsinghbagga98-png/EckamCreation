import { ProductGrid } from '@/components/shop/product-grid';
import type { ResolvedCollectionDetail } from '@/lib/collections/resolve';
import { CollectionEmptyState } from './collection-empty-state';
import { CollectionHero } from './collection-hero';

type CollectionDetailViewProps = {
  collection: ResolvedCollectionDetail;
};

export function CollectionDetailView({ collection }: CollectionDetailViewProps) {
  return (
    <div className="collections-page overflow-x-hidden">
      <CollectionHero collection={collection} />
      <section className="bg-[#F6F0E5] text-[#1A1815]" aria-labelledby="shop-the-edit">
        <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16 lg:px-12 lg:py-20">
          <h2
            id="shop-the-edit"
            className="text-[11px] font-semibold tracking-[0.22em] uppercase text-[#1A1815]"
          >
            Shop the edit
          </h2>
          <div className="mt-8">
            {collection.products.length === 0 ? (
              <CollectionEmptyState />
            ) : (
              <ProductGrid products={collection.products} tone="light" />
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
