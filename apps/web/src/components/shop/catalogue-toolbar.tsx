import { FilterIcon } from '@/components/icons';
import { SHOP_SORT_OPTIONS, type ShopSort } from '@/lib/catalogue/query';

type CatalogueToolbarProps = {
  sort: ShopSort;
  count: number;
  filtersOpen: boolean;
  onSortChange: (sort: ShopSort) => void;
  onToggleFilters: () => void;
};

export function CatalogueToolbar({
  sort,
  count,
  filtersOpen,
  onSortChange,
  onToggleFilters,
}: CatalogueToolbarProps) {
  return (
    <div className="shop-toolbar">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[11px] font-semibold tracking-[0.28em] uppercase text-[#1A1815]">
          {count} {count === 1 ? 'piece' : 'pieces'}
        </p>

        <div className="flex min-w-0 w-full sm:w-auto items-center justify-end gap-2 sm:gap-3">
          <button
            type="button"
            className="shop-filter-button"
            aria-expanded={filtersOpen}
            aria-controls="shop-filters"
            onClick={onToggleFilters}
          >
            <FilterIcon className="size-3.5" />
            Filter
          </button>

          <div className="shop-sort">
            <label htmlFor="shop-sort" className="sr-only">
              Sort by
            </label>
            <select
              id="shop-sort"
              className="shop-sort-select"
              value={sort}
              aria-label="Sort by"
              onChange={(event) => onSortChange(event.target.value as ShopSort)}
            >
              {SHOP_SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
