import Link from 'next/link';
import { ArrowRightIcon } from '@/components/icons';
import { toAiProductCard } from '@/lib/ai/products';
import type { AiChatProduct } from '@/lib/ai/types';

type AiProductCardProps = {
  product: AiChatProduct;
};

export function AiProductCard({ product }: AiProductCardProps) {
  const card = toAiProductCard(product);

  return (
    <article className="eckam-ai-product">
      <div className="eckam-ai-product-media" aria-hidden={!card.imageSrc}>
        {card.imageSrc ? (
          // Local or catalogue media only — never a fabricated image.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={card.imageSrc} alt={card.imageAlt} />
        ) : (
          <span className="eckam-ai-product-placeholder" />
        )}
      </div>
      <div className="eckam-ai-product-copy">
        {card.category ? <p className="eckam-ai-product-category">{card.category}</p> : null}
        <h4>{card.name}</h4>
        {card.priceLabel ? <p className="eckam-ai-product-price">{card.priceLabel}</p> : null}
        {card.inStock === false ? <p className="eckam-ai-product-stock">Currently unavailable</p> : null}
        <Link href={card.href} className="eckam-ai-product-cta">
          View Product
          <ArrowRightIcon className="size-3.5" />
        </Link>
      </div>
    </article>
  );
}
