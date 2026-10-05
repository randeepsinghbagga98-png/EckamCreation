import type { Metadata } from 'next';
import { ProductNotFound } from '@/components/product-detail/product-not-found';

export const metadata: Metadata = {
  title: 'Product not found | ECKAM CREATION',
  robots: { index: false, follow: false },
};

export default function ShopReservedNotFoundPage() {
  return <ProductNotFound />;
}
