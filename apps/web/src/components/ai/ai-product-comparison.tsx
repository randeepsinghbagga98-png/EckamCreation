import Link from 'next/link';
import { formatProductPrice } from '@/lib/catalogue/product';
import type { AiChatComparison } from '@/lib/ai/types';
import { toAiProductCard } from '@/lib/ai/products';

type AiProductComparisonProps = {
  comparison: AiChatComparison;
};

export function AiProductComparison({ comparison }: AiProductComparisonProps) {
  return (
    <div className="eckam-ai-compare" aria-label="Product comparison">
      {comparison.products.map((product) => {
        const card = toAiProductCard(product);
        return (
          <article key={product.slug} className="eckam-ai-compare-card">
            <p className="eckam-ai-product-category">{card.category ?? 'Eckam'}</p>
            <h4>{card.name}</h4>
            {card.priceLabel ? <p className="eckam-ai-product-price">{card.priceLabel}</p> : null}
            {card.inStock === false ? (
              <p className="eckam-ai-compare-stock">Currently unavailable</p>
            ) : card.inStock === true ? (
              <p className="eckam-ai-compare-stock">Available</p>
            ) : null}
            {product.description ? <p className="eckam-ai-compare-copy">{product.description}</p> : null}
            {product.variants && product.variants.length > 0 ? (
              <ul className="eckam-ai-compare-variants">
                {product.variants.map((variant) => (
                  <li key={variant.id}>
                    {variant.name || 'Default'}
                    {variant.price
                      ? ` · ${formatProductPrice(variant.price)}`
                      : ''}
                  </li>
                ))}
              </ul>
            ) : null}
            <Link href={card.href} className="eckam-ai-product-cta">
              View Product
            </Link>
          </article>
        );
      })}
    </div>
  );
}
