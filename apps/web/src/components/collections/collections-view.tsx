import { CollectionsEmptyState } from './collections-empty-state';
import { CollectionsGrid } from './collections-grid';
import { CollectionsHero } from './collections-hero';
import type { ResolvedCollection } from '@/lib/collections/resolve';

type CollectionsViewProps = {
  collections: ResolvedCollection[];
};

export function CollectionsView({ collections }: CollectionsViewProps) {
  return (
    <div className="collections-page overflow-x-hidden">
      <CollectionsHero />
      <section className="collections-body bg-[#F6F0E5] text-[#1A1815]" aria-label="Collections">
        <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16 lg:px-12 lg:py-20">
          {collections.length === 0 ? (
            <CollectionsEmptyState />
          ) : (
            <CollectionsGrid collections={collections} />
          )}
        </div>
      </section>
    </div>
  );
}
