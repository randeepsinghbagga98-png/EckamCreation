import type { Metadata } from 'next';
import { CollectionNotFound } from '@/components/collections/collection-not-found';

export const metadata: Metadata = {
  title: 'Collection not found | Eckam Creation',
  robots: { index: false, follow: false },
};

export default function CollectionReservedNotFoundPage() {
  return <CollectionNotFound />;
}
