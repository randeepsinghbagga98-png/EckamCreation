import Link from 'next/link';
import { buildShopHref } from '@/lib/catalogue/query';
import type { ProductDetailData } from '@/lib/catalogue/product-detail';

type ProductBreadcrumbProps = {
  product: ProductDetailData;
};

export function ProductBreadcrumb({ product }: ProductBreadcrumbProps) {
  const categoryHref = product.categorySlug
    ? buildShopHref({ sort: 'newest', category: product.categorySlug })
    : '/shop';

  return (
    <nav className="pdp-breadcrumb" aria-label="Breadcrumb">
      <ol className="pdp-breadcrumb-list">
        <li>
          <Link href="/" className="pdp-breadcrumb-link">
            Home
          </Link>
        </li>
        <li aria-hidden="true" className="pdp-breadcrumb-sep">
          /
        </li>
        <li>
          <Link href="/shop" className="pdp-breadcrumb-link">
            Shop
          </Link>
        </li>
        <li aria-hidden="true" className="pdp-breadcrumb-sep">
          /
        </li>
        <li>
          <Link href={categoryHref} className="pdp-breadcrumb-link">
            {product.category}
          </Link>
        </li>
        <li aria-hidden="true" className="pdp-breadcrumb-sep">
          /
        </li>
        <li>
          <span className="pdp-breadcrumb-current" aria-current="page">
            {product.name}
          </span>
        </li>
      </ol>
    </nav>
  );
}
