'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CloseIcon } from '@/components/icons';
import { buildShopHref, type CatalogueQuery } from '@/lib/catalogue/query';
import type { ShopCategoryOption } from '@/lib/catalogue/shop';

type FilterPanelProps = {
  open: boolean;
  query: CatalogueQuery;
  categories: ShopCategoryOption[];
  onClose: () => void;
};

function FilterFields({
  query,
  categories,
  onApplyPrice,
}: {
  query: CatalogueQuery;
  categories: ShopCategoryOption[];
  onApplyPrice: (minPrice?: string, maxPrice?: string) => void;
}) {
  const [minPrice, setMinPrice] = useState(query.minPrice ?? '');
  const [maxPrice, setMaxPrice] = useState(query.maxPrice ?? '');

  return (
    <div className="space-y-8">
      <fieldset>
        <legend className="shop-filter-legend">Category</legend>
        <ul className="mt-3 space-y-1">
          <li>
            <Link
              href={buildShopHref({ ...query, category: undefined })}
              className={`shop-filter-option ${!query.category ? 'is-active' : ''}`}
              aria-current={!query.category ? 'page' : undefined}
            >
              All
            </Link>
          </li>
          {categories.map((category) => {
            const active = query.category === category.slug;
            return (
              <li key={category.slug}>
                <Link
                  href={buildShopHref({ ...query, category: category.slug })}
                  className={`shop-filter-option ${active ? 'is-active' : ''}`}
                  aria-current={active ? 'page' : undefined}
                >
                  {category.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </fieldset>

      <fieldset>
        <legend className="shop-filter-legend">Price</legend>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="shop-price-field">
            <span>Min price</span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              name="minPrice"
              value={minPrice}
              placeholder="0"
              onChange={(event) => setMinPrice(event.target.value.replace(/[^\d]/g, ''))}
            />
          </label>
          <label className="shop-price-field">
            <span>Max price</span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              name="maxPrice"
              value={maxPrice}
              placeholder="Any"
              onChange={(event) => setMaxPrice(event.target.value.replace(/[^\d]/g, ''))}
            />
          </label>
        </div>
        <button
          type="button"
          className="shop-filter-apply mt-4"
          onClick={() => onApplyPrice(minPrice || undefined, maxPrice || undefined)}
        >
          Apply
        </button>
      </fieldset>

      <fieldset>
        <legend className="shop-filter-legend">Availability</legend>
        <ul className="mt-3 space-y-1">
          <li>
            <Link
              href={buildShopHref({ ...query, availability: undefined })}
              className={`shop-filter-option ${!query.availability ? 'is-active' : ''}`}
              aria-current={!query.availability ? 'page' : undefined}
            >
              All
            </Link>
          </li>
          <li>
            <Link
              href={buildShopHref({ ...query, availability: 'in-stock' })}
              className={`shop-filter-option ${query.availability === 'in-stock' ? 'is-active' : ''}`}
              aria-current={query.availability === 'in-stock' ? 'page' : undefined}
            >
              In stock
            </Link>
          </li>
        </ul>
      </fieldset>
    </div>
  );
}

export function FilterPanel({ open, query, categories, onClose }: FilterPanelProps) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const router = useRouter();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 1023px)');
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previous = document.activeElement as HTMLElement | null;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    document.addEventListener('keydown', onKeyDown);

    if (isMobile) {
      closeRef.current?.focus();
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKeyDown);
      if (isMobile) {
        previous?.focus();
      }
    };
  }, [open, onClose, isMobile]);

  function applyPrice(minPrice?: string, maxPrice?: string) {
    router.push(buildShopHref({ ...query, minPrice, maxPrice }), { scroll: false });
    if (isMobile) {
      onClose();
    }
  }

  if (!open) {
    return null;
  }

  return (
    <>
      {isMobile ? (
        <button
          type="button"
          className="shop-filter-scrim"
          aria-label="Close filters"
          onClick={onClose}
        />
      ) : null}

      <aside
        id="shop-filters"
        className="shop-filter-panel"
        role={isMobile ? 'dialog' : undefined}
        aria-modal={isMobile || undefined}
        aria-labelledby={titleId}
      >
        <div className="flex items-center justify-between gap-4">
          <h2 id={titleId} className="shop-filter-heading">
            Filters
          </h2>
          <button
            ref={closeRef}
            type="button"
            className="shop-filter-close"
            onClick={onClose}
          >
            <span className="hidden sm:inline">Close</span>
            <CloseIcon className="size-4 sm:hidden" />
            <span className="sr-only sm:hidden">Close filters</span>
          </button>
        </div>
        <div className="shop-filter-fields mt-8">
          <FilterFields
            key={`${query.minPrice ?? ''}-${query.maxPrice ?? ''}`}
            query={query}
            categories={categories}
            onApplyPrice={applyPrice}
          />
        </div>
        <div className="shop-filter-actions">
          <Link href="/shop" className="shop-filter-clear-all" onClick={onClose}>
            Clear all
          </Link>
        </div>
      </aside>
    </>
  );
}
