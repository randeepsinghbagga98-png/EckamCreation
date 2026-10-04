import { SearchView } from '@/components/search/search-view';
import { searchCatalogue } from '@/lib/search/query';

type SearchPageProps = {
  searchParams: Promise<{ q?: string | string[] }>;
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q } = await searchParams;
  const result = await searchCatalogue(q);
  return <SearchView result={result} />;
}
