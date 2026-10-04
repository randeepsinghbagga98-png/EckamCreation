import { ProductCard } from '@/components/product/product-card';
import type { ProductCardData } from '@/lib/catalogue/product';

type RelatedProductsProps = {
  products: ProductCardData[];
};

export function RelatedProducts({ products }: RelatedProductsProps) {
  if (products.length === 0) {
    return null;
  }

  return (
    <section className="pdp-related" aria-labelledby="pdp-related-heading">
      <p className="text-[10px] font-bold tracking-[0.28em] uppercase text-[#8B6914]">
        Continue exploring
      </p>
      <h2
        id="pdp-related-heading"
        className="mt-3 font-sans text-[clamp(28px,4vw,40px)] font-light tracking-[-0.04em] uppercase text-[#1A1815]"
      >
        You may also like
      </h2>
      <ul className="shop-product-grid mt-10">
        {products.map((product, index) => (
          <li key={product.id} className="min-w-0">
            <ProductCard product={product} index={index} tone="light" />
          </li>
        ))}
      </ul>
    </section>
  );
}
