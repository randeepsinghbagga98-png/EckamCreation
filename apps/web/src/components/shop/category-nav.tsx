import Link from 'next/link';
import { buildShopHref, type CatalogueQuery } from '@/lib/catalogue/query';
import type { ShopCategoryOption } from '@/lib/catalogue/shop';

type CategoryNavProps = {
  query: CatalogueQuery;
  categories: ShopCategoryOption[];
};

const ALL_CATEGORY = { slug: '', name: 'All' };

export function CategoryNav({ query, categories }: CategoryNavProps) {
  const items = [ALL_CATEGORY, ...categories];

  return (
    <nav
      className="shop-category-nav-wrap bg-[#050505]"
      aria-label="Shop categories"
    >
      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
        <ul className="shop-category-nav">
          {items.map((item) => {
            const active = (query.category ?? '') === item.slug;
            const href = buildShopHref({
              ...query,
              category: item.slug || undefined,
            });

            return (
              <li key={item.name} className="shrink-0">
                <Link
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  className={`shop-category-link ${active ? 'is-active' : ''}`}
                >
                  {item.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
