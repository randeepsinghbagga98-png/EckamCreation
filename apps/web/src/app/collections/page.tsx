import { CollectionsView } from '@/components/collections/collections-view';
import { listResolvedCollections } from '@/lib/collections/resolve';

export default async function CollectionsPage() {
  const collections = await listResolvedCollections();
  return <CollectionsView collections={collections} />;
}
