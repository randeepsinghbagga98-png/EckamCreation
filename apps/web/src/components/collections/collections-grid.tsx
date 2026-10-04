import { CollectionCard } from './collection-card';
import type { ResolvedCollection } from '@/lib/collections/resolve';

type CollectionsGridProps = {
  collections: ResolvedCollection[];
};

export function CollectionsGrid({ collections }: CollectionsGridProps) {
  return (
    <ul className="collections-grid mt-12 grid grid-cols-1 min-[480px]:grid-cols-2 lg:grid-cols-12 gap-3 sm:gap-4 lg:gap-5 lg:auto-rows-fr">
      {collections.map((collection, index) => (
        <CollectionCard key={collection.slug} collection={collection} index={index} />
      ))}
    </ul>
  );
}
