import { ProductCard } from '@/components/product/product-card';
import type { ProductCardData } from '@/lib/catalogue/product';
import { ShopEmptyState } from './empty-state';
import { ProductSkeleton } from './product-skeleton';

type ProductGridProps = {
  products: ProductCardData[];
  isLoading?: boolean;
  tone?: 'dark' | 'light';
  skeletonCount?: number;
};

/**
 * API-ready product collection.
 * Pass catalogue results (or a loading flag) without changing the grid chrome.
 */
export function ProductGrid({
  products,
  isLoading = false,
  tone = 'light',
  skeletonCount = 8,
}: ProductGridProps) {
  if (isLoading) {
    return (
      <ul
        className="shop-product-grid"
        aria-busy="true"
        aria-label="Loading products"
      >
        {Array.from({ length: skeletonCount }, (_, index) => (
          <li key={`skeleton-${index}`} className="min-w-0">
            <ProductSkeleton tone={tone} />
          </li>
        ))}
      </ul>
    );
  }

  if (products.length === 0) {
    return <ShopEmptyState />;
  }

  return (
    <ul className="shop-product-grid">
      {products.map((product, index) => (
        <li key={product.id} className="min-w-0">
          <ProductCard product={product} index={index} tone={tone} />
        </li>
      ))}
    </ul>
  );
}
