import Link from 'next/link';
import type { CategoryItem } from '@/components/shop-by-category/categories';

export function SearchIdleState() {
  return (
    <div className="search-state" role="status">
      <p className="text-[11px] font-semibold tracking-[0.28em] uppercase text-[#8B6914]">
        Search Eckam
      </p>
      <p className="mt-4 max-w-xl text-[15px] font-light leading-relaxed text-[#1A1815]/70">
        Discover pieces across jewellery, fashion, home, kitchen, gifting and more.
      </p>
    </div>
  );
}

export function SearchNoResults() {
  return (
    <div className="search-state" role="status">
      <p className="text-[11px] font-semibold tracking-[0.28em] uppercase text-[#8B6914]">
        No results
      </p>
      <p className="mt-4 max-w-md text-[15px] font-light leading-relaxed text-[#1A1815]/70">
        We couldn&apos;t find anything matching your search.
      </p>
      <Link href="/shop" className="cart-cta cart-cta--primary mt-8">
        Explore shop
      </Link>
    </div>
  );
}

export function SearchErrorState() {
  return (
    <div className="search-state" role="alert">
      <p className="text-[11px] font-semibold tracking-[0.28em] uppercase text-[#8B6914]">
        Search is temporarily unavailable
      </p>
      <p className="mt-4 max-w-md text-[15px] font-light leading-relaxed text-[#1A1815]/70">
        Please try again.
      </p>
    </div>
  );
}

type SearchCategoriesProps = {
  categories: CategoryItem[];
};

export function SearchCategories({ categories }: SearchCategoriesProps) {
  if (categories.length === 0) {
    return null;
  }

  return (
    <div className="mt-12">
      <p className="text-[11px] font-semibold tracking-[0.22em] uppercase text-[#1A1815]">
        Explore categories
      </p>
      <ul className="mt-5 flex flex-wrap gap-2.5">
        {categories.map((category) => (
          <li key={category.slug}>
            <Link
              href={category.href}
              className="inline-flex min-h-11 items-center rounded-[4px] border border-[#1A1815]/12 bg-white/40 px-4 py-2.5 text-[12px] font-medium tracking-[0.08em] text-[#1A1815] transition-colors hover:border-[#8B6914] hover:text-[#8B6914] focus-visible:outline-2 focus-visible:outline-[#8B6914] focus-visible:outline-offset-2"
            >
              {category.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
