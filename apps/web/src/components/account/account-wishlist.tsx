'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { WishlistItemDto } from '@eckamcreation/api-contracts';
import { AccountEmptyState } from '@/components/account/account-empty-state';
import { ProductCard } from '@/components/product/product-card';
import { listCatalogueProducts } from '@/lib/catalogue/api';
import type { ProductCardData } from '@/lib/catalogue/product';
import { CATALOGUE_PRODUCTS } from '@/lib/catalogue/products';
import { mapSummaryToCard } from '@/lib/collections/map';
import { hydrateWishlist, useWishlist } from '@/lib/wishlist/store';
import {
  WISHLIST_EMPTY_COPY,
  WISHLIST_EMPTY_TITLE,
  WISHLIST_UNAVAILABLE_COPY,
  WISHLIST_UNAVAILABLE_MESSAGE,
} from '@/lib/wishlist/messages';

function categoryForSlug(slug: string) {
  return CATALOGUE_PRODUCTS.find((item) => item.slug === slug)?.category ?? 'Catalogue';
}

function WishlistProductGrid({ items }: { items: WishlistItemDto[] }) {
  const [cards, setCards] = useState<ProductCardData[] | null>(null);

  useEffect(() => {
    let cancelled = false;

    void listCatalogueProducts({ limit: '100' })
      .then((listed) => {
        if (cancelled) {
          return;
        }

        const byId = new Map(listed.items.map((item) => [item.id, item]));
        const bySlug = new Map(listed.items.map((item) => [item.slug, item]));
        setCards(
          items.flatMap((item) => {
            const summary = byId.get(item.productId) ?? bySlug.get(item.productSlug);
            return summary ? [mapSummaryToCard(summary, categoryForSlug(item.productSlug))] : [];
          }),
        );
      })
      .catch(() => {
        if (!cancelled) {
          setCards([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [items]);

  if (cards === null) {
    return <div className="account-skeleton account-skeleton--card" aria-busy="true" />;
  }

  if (cards.length === 0) {
    return (
      <ul className="account-card-list">
        {items.map((item) => (
          <li key={item.id} className="account-card">
            <Link href={`/shop/${item.productSlug}`} className="account-card-link">
              <p className="account-card-title">{item.productName}</p>
              {item.variantName ? <p className="account-card-copy">{item.variantName}</p> : null}
            </Link>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ul className="shop-product-grid mt-6">
      {cards.map((product, index) => (
        <li key={product.id} className="min-w-0">
          <ProductCard product={product} index={index} tone="light" />
        </li>
      ))}
    </ul>
  );
}

export function AccountWishlist() {
  const wishlist = useWishlist();
  const itemKey = wishlist.items.map((item) => item.id).join('|');

  if (wishlist.status === 'idle' || wishlist.status === 'loading') {
    return (
      <div className="account-panel" aria-busy="true">
        <div className="account-skeleton account-skeleton--card" />
      </div>
    );
  }

  if (wishlist.status === 'error') {
    return (
      <div className="account-panel" role="alert">
        <p className="account-kicker">Wishlist</p>
        <h2 className="account-empty-title">{WISHLIST_UNAVAILABLE_MESSAGE}</h2>
        <p className="account-copy">{WISHLIST_UNAVAILABLE_COPY}</p>
        <button
          type="button"
          className="cart-cta cart-cta--primary mt-6"
          onClick={() => {
            void hydrateWishlist(true);
          }}
        >
          Try again
        </button>
      </div>
    );
  }

  if (wishlist.items.length === 0) {
    return (
      <AccountEmptyState
        kicker="Wishlist"
        title={WISHLIST_EMPTY_TITLE}
        copy={WISHLIST_EMPTY_COPY}
        actionHref="/shop"
        actionLabel="Explore shop"
      />
    );
  }

  return (
    <section className="account-panel">
      <div className="account-section-head">
        <h2 className="account-section-title">Wishlist</h2>
        <p className="account-wishlist-count">
          {wishlist.items.length} {wishlist.items.length === 1 ? 'piece' : 'pieces'}
        </p>
      </div>
      <WishlistProductGrid key={itemKey} items={wishlist.items} />
    </section>
  );
}
