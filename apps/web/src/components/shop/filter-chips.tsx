import Link from 'next/link';
import { CloseIcon } from '@/components/icons';
import { CATEGORIES } from '@/components/shop-by-category/categories';
import { buildShopHref, type CatalogueQuery } from '@/lib/catalogue/query';

type FilterChipsProps = {
  query: CatalogueQuery;
};

function formatRupees(value: string) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(value));
}

export function FilterChips({ query }: FilterChipsProps) {
  const chips: Array<{ key: string; label: string; href: string }> = [];

  if (query.category) {
    const category = CATEGORIES.find((item) => item.slug === query.category);
    chips.push({
      key: 'category',
      label: category?.name ?? query.category,
      href: buildShopHref({ ...query, category: undefined }),
    });
  }

  if (query.minPrice || query.maxPrice) {
    const label =
      query.minPrice && query.maxPrice
        ? `${formatRupees(query.minPrice)} – ${formatRupees(query.maxPrice)}`
        : query.minPrice
          ? `From ${formatRupees(query.minPrice)}`
          : `Up to ${formatRupees(query.maxPrice ?? '0')}`;

    chips.push({
      key: 'price',
      label,
      href: buildShopHref({ ...query, minPrice: undefined, maxPrice: undefined }),
    });
  }

  if (query.availability === 'in-stock') {
    chips.push({
      key: 'availability',
      label: 'In Stock',
      href: buildShopHref({ ...query, availability: undefined }),
    });
  }

  if (chips.length === 0) {
    return null;
  }

  return (
    <div className="shop-filter-chips">
      <ul className="flex flex-wrap gap-2">
        {chips.map((chip) => (
          <li key={chip.key}>
            <Link href={chip.href} className="shop-filter-chip" scroll={false}>
              <span>{chip.label}</span>
              <CloseIcon className="size-3.5" />
              <span className="sr-only">Remove {chip.label} filter</span>
            </Link>
          </li>
        ))}
      </ul>
      <Link href="/shop" className="shop-filter-clear-all" scroll={false}>
        Clear all
      </Link>
    </div>
  );
}
