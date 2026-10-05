import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getCatalogueProduct } from '@/lib/catalogue/api';
import {
  getRelatedProducts,
  toLiveProductDetail,
} from '@/lib/catalogue/product-detail';
import { ProductDetailView } from '@/components/product-detail/product-detail-view';

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
      robots: { index: false, follow: false },
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
    notFound();
  }

  const product = toLiveProductDetail(live);
  const related = await getRelatedProducts(product.slug);

  return <ProductDetailView product={product} related={related} />;
}
