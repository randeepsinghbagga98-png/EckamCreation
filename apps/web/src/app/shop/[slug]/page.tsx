import type { Metadata } from 'next';
import { getCatalogueProduct } from '@/lib/catalogue/api';
import {
  getRelatedProducts,
  toLiveProductDetail,
} from '@/lib/catalogue/product-detail';
import { ProductDetailView } from '@/components/product-detail/product-detail-view';
import { ProductNotFound } from '@/components/product-detail/product-not-found';

type ProductPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const live = await getCatalogueProduct(slug);

  if (!live) {
    return {
      title: 'Product not found | ECKAM CREATION',
    };
  }

  const primaryCategory =
    live.categories.find((category) => category.isPrimary) ?? live.categories[0];

  return {
    title: `${live.name} | ECKAM CREATION`,
    description: primaryCategory
      ? `${live.name} in ${primaryCategory.name}.`
      : live.name,
  };
}

export default async function ProductDetailPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const live = await getCatalogueProduct(slug);

  if (!live) {
    return <ProductNotFound />;
  }

  const product = toLiveProductDetail(live);

  return (
    <ProductDetailView product={product} related={getRelatedProducts(product.slug)} />
  );
}
