import type { Metadata } from 'next';
import { CollectionDetailView } from '@/components/collections/collection-detail-view';
import { CollectionEmptyState } from '@/components/collections/collection-empty-state';
import { CollectionHero } from '@/components/collections/collection-hero';
import { CollectionNotFound } from '@/components/collections/collection-not-found';
import { EDITORIAL_COLLECTIONS } from '@/lib/collections/edits';
import { getResolvedCollection } from '@/lib/collections/resolve';

type CollectionPageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return EDITORIAL_COLLECTIONS.map((collection) => ({ slug: collection.slug }));
}

export async function generateMetadata({
  params,
}: CollectionPageProps): Promise<Metadata> {
  const { slug } = await params;
  const collection = await getResolvedCollection(slug);

  if (!collection || collection === 'empty') {
    const editorial = EDITORIAL_COLLECTIONS.find((item) => item.slug === slug);
    return {
      title: editorial
        ? `${editorial.title} | Eckam Creation`
        : 'Collection not found | Eckam Creation',
      description: editorial?.description ?? 'Explore curated collections from Eckam Creation.',
    };
  }

  return {
    title: `${collection.title} | Eckam Creation`,
    description: collection.description,
  };
}

export default async function CollectionDetailPage({ params }: CollectionPageProps) {
  const { slug } = await params;
  const collection = await getResolvedCollection(slug);

  if (collection === null) {
    return <CollectionNotFound />;
  }

  if (collection === 'empty') {
    const editorial = EDITORIAL_COLLECTIONS.find((item) => item.slug === slug);
    return (
      <div className="collections-page overflow-x-hidden">
        {editorial ? (
          <CollectionHero
            collection={{
              slug: editorial.slug,
              title: editorial.title,
              eyebrow: editorial.eyebrow,
              description: editorial.description,
              imageSrc: '',
              imageAlt: editorial.title,
              productCount: 0,
              size: 'standard',
              source: 'editorial',
            }}
          />
        ) : null}
        <section className="bg-[#F6F0E5] text-[#1A1815]">
          <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8 lg:px-12">
            <CollectionEmptyState />
          </div>
        </section>
      </div>
    );
  }

  return <CollectionDetailView collection={collection} />;
}
