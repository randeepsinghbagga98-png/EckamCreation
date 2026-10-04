'use client';

import { useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { formatProductPrice } from '@/lib/catalogue/product';
import type { ProductCardData } from '@/lib/catalogue/product';
import type { ProductDetailData } from '@/lib/catalogue/product-detail';
import { ProductBreadcrumb } from './breadcrumb';
import { ProductAccordions } from './product-accordions';
import { ProductGallery } from './product-gallery';
import { PurchaseActions } from './purchase-actions';
import { QuantitySelector } from './quantity-selector';
import { RelatedProducts } from './related-products';
import { VariantSelector } from './variant-selector';

type ProductDetailViewProps = {
  product: ProductDetailData;
  related: ProductCardData[];
};

export function ProductDetailView({ product, related }: ProductDetailViewProps) {
  const reduceMotion = useReducedMotion();
  const defaultVariant =
    product.variants.find((variant) => variant.id === product.defaultVariantId) ??
    product.variants.find((variant) => variant.isDefault) ??
    product.variants[0];
  const [selectedVariantId, setSelectedVariantId] = useState(defaultVariant?.id);
  const [quantity, setQuantity] = useState(1);

  const selectedVariant = useMemo(
    () => product.variants.find((variant) => variant.id === selectedVariantId),
    [product.variants, selectedVariantId],
  );

  const price = selectedVariant?.price ?? product.price ?? null;
  const priceLabel = price ? formatProductPrice(price) : null;
  const canPurchase =
    Boolean(selectedVariantId) &&
    (selectedVariant?.inStock ?? product.inStock) !== false;

  return (
    <div className="pdp-page">
      <div className="pdp-top">
        <div className="mx-auto max-w-7xl px-5 py-6 sm:px-8 lg:px-12">
          <ProductBreadcrumb product={product} />
        </div>
      </div>

      <section className="pdp-stage" aria-labelledby="pdp-title">
        <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-12 lg:px-12 lg:py-16">
          <div className="pdp-layout">
            <ProductGallery name={product.name} media={product.media} />

            <motion.div
              className="pdp-info"
              initial={reduceMotion ? false : { opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: reduceMotion ? 0 : 0.7,
                delay: reduceMotion ? 0 : 0.08,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              <p className="pdp-category">{product.category}</p>
              <h1 id="pdp-title" className="pdp-title">
                {product.name}
              </h1>
              {priceLabel ? <p className="pdp-price">{priceLabel}</p> : null}

              <VariantSelector
                variants={product.variants}
                selectedId={selectedVariantId}
                onSelect={setSelectedVariantId}
              />

              <QuantitySelector value={quantity} onChange={setQuantity} />

              <PurchaseActions
                product={{
                  id: product.id,
                  slug: product.slug,
                  name: product.name,
                  category: product.category,
                  href: product.href,
                  imageSrc: product.media[0]?.url ?? '',
                  imageAlt: product.media[0]?.altText ?? product.name,
                  price: price,
                }}
                canPurchase={canPurchase}
                intent={{
                  productId: product.id,
                  slug: product.slug,
                  quantity,
                  variantId: selectedVariantId,
                }}
              />

              <ProductAccordions product={product} />
            </motion.div>
          </div>

          <RelatedProducts products={related} />
        </div>
      </section>
    </div>
  );
}
