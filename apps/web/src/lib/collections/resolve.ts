import type { CollectionDto } from '@eckamcreation/api-contracts';
import { CATEGORIES } from '@/components/shop-by-category/categories';
import {
  getCatalogueCollection,
  listCatalogueCollections,
  listCatalogueProducts,
} from '@/lib/catalogue/api';
import type { ProductCardData } from '@/lib/catalogue/product';
import { EDITORIAL_COLLECTIONS, getEditorialCollection, type EditorialCollection } from './edits';
import { mapSummaryToCard, uniqueProducts } from './map';

export type CollectionSize = 'featured' | 'companion' | 'standard' | 'wide';

export type ResolvedCollection = {
  slug: string;
  title: string;
  eyebrow: string;
  description: string;
  imageSrc: string;
  imageAlt: string;
  productCount: number;
  size: CollectionSize;
  source: 'api' | 'editorial';
};

export type ResolvedCollectionDetail = ResolvedCollection & {
  products: ProductCardData[];
};

async function productsForCategory(slug: string): Promise<ProductCardData[]> {
  const category = CATEGORIES.find((item) => item.slug === slug);
  const data = await listCatalogueProducts({ category: slug, limit: '50' });
  return data.items.map((item) =>
    mapSummaryToCard(item, category?.name ?? item.name, slug),
  );
}

async function loadCatalogueByCategory() {
  const entries = await Promise.all(
    CATEGORIES.map(async (category) => {
      const products = await productsForCategory(category.slug);
      return [category.slug, products] as const;
    }),
  );

  return new Map(entries);
}

function collectionImage(products: ProductCardData[], categorySlugs: string[]) {
  const withLocal = products.find((product) => product.imageSrc.startsWith('/'));
  const first = withLocal ?? products[0];
  const category = CATEGORIES.find((item) => categorySlugs.includes(item.slug));

  return {
    imageSrc: first?.imageSrc || category?.imageSrc || CATEGORIES[0]?.imageSrc || '/products/cream-tote.svg',
    imageAlt: first?.imageAlt || category?.imageAlt || 'Eckam collection',
  };
}

function withSizes(collections: ResolvedCollection[]): ResolvedCollection[] {
  return collections.map((collection, index) => ({
    ...collection,
    size:
      index === 0
        ? 'featured'
        : index === 1 || index === 2
          ? 'companion'
          : index === collections.length - 1 && collections.length > 4
            ? 'wide'
            : 'standard',
  }));
}

function toEditorialResolved(
  edit: EditorialCollection,
  products: ProductCardData[],
): ResolvedCollection {
  const image = collectionImage(products, edit.categorySlugs);

  return {
    slug: edit.slug,
    title: edit.title,
    eyebrow: edit.eyebrow,
    description: edit.description,
    imageSrc: image.imageSrc,
    imageAlt: image.imageAlt,
    productCount: products.length,
    size: 'standard',
    source: 'editorial',
  };
}

async function resolveEditorialProducts(
  edit: EditorialCollection,
  byCategory: Map<string, ProductCardData[]>,
): Promise<ProductCardData[]> {
  if (edit.source === 'newest') {
    const latest = await listCatalogueProducts({ limit: '6' });
    const lookup = new Map(
      [...byCategory.values()].flat().map((product) => [product.slug, product]),
    );

    return uniqueProducts(
      latest.items.map((item) => {
        const known = lookup.get(item.slug);
        return (
          known ??
          mapSummaryToCard(item, 'Catalogue', CATEGORIES[0]?.slug)
        );
      }),
    );
  }

  return uniqueProducts(
    edit.categorySlugs.flatMap((slug) => byCategory.get(slug) ?? []),
  );
}

async function resolveBackendCollections(): Promise<ResolvedCollectionDetail[]> {
  const listed = await listCatalogueCollections();
  const live = listed.items.filter((item) => item.isActive);

  if (live.length === 0) {
    return [];
  }

  const details = await Promise.all(
    live.map(async (collection) => {
      const products = await listCatalogueProducts({
        collection: collection.slug,
        limit: '50',
      });
      const cards = uniqueProducts(
        products.items.map((item) => mapSummaryToCard(item, collection.name)),
      );

      return {
        ...toBackendResolved(collection, cards),
        products: cards,
      };
    }),
  );

  return details.filter((item) => item.products.length > 0);
}

function toBackendResolved(
  collection: CollectionDto,
  products: ProductCardData[],
): ResolvedCollection {
  const image = collectionImage(products, []);

  return {
    slug: collection.slug,
    title: collection.name,
    eyebrow: 'The Eckam Edit',
    description: collection.description || 'A curated selection from the Eckam catalogue.',
    imageSrc: image.imageSrc,
    imageAlt: image.imageAlt,
    productCount: products.length,
    size: 'standard',
    source: 'api',
  };
}

export async function listResolvedCollections(): Promise<ResolvedCollection[]> {
  try {
    const backend = await resolveBackendCollections();
    if (backend.length > 0) {
      return withSizes(
        backend.map((item) => ({
          slug: item.slug,
          title: item.title,
          eyebrow: item.eyebrow,
          description: item.description,
          imageSrc: item.imageSrc,
          imageAlt: item.imageAlt,
          productCount: item.productCount,
          size: item.size,
          source: item.source,
        })),
      );
    }

    const byCategory = await loadCatalogueByCategory();
    const resolved = await Promise.all(
      EDITORIAL_COLLECTIONS.map(async (edit) => {
        const products = await resolveEditorialProducts(edit, byCategory);
        return products.length > 0 ? toEditorialResolved(edit, products) : null;
      }),
    );

    return withSizes(resolved.filter((item): item is ResolvedCollection => Boolean(item)));
  } catch {
    return [];
  }
}

export async function getResolvedCollection(
  slug: string,
): Promise<ResolvedCollectionDetail | null | 'empty'> {
  const backend = await getCatalogueCollection(slug);
  if (backend) {
    const products = await listCatalogueProducts({
      collection: backend.slug,
      limit: '50',
    });
    const cards = uniqueProducts(
      products.items.map((item) => mapSummaryToCard(item, backend.name)),
    );
    if (cards.length === 0) {
      return 'empty';
    }

    return {
      ...toBackendResolved(backend, cards),
      products: cards,
    };
  }

  const edit = getEditorialCollection(slug);
  if (!edit) {
    return null;
  }

  const byCategory = await loadCatalogueByCategory();
  const products = await resolveEditorialProducts(edit, byCategory);
  if (products.length === 0) {
    return 'empty';
  }

  return {
    ...toEditorialResolved(edit, products),
    products,
  };
}
