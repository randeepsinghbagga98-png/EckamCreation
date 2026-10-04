import { ShopView } from '@/components/shop/shop-view';
import { parseCatalogueSearchParams } from '@/lib/catalogue/query';
import { loadShopCatalogue } from '@/lib/catalogue/shop';

type ShopPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ShopPage({ searchParams }: ShopPageProps) {
  const query = parseCatalogueSearchParams(await searchParams);
  const catalogue = await loadShopCatalogue(query);
  return <ShopView query={query} catalogue={catalogue} />;
}
