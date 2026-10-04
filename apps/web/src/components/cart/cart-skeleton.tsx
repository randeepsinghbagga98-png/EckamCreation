export function CartSkeleton() {
  return (
    <div className="cart-page" aria-busy="true" aria-label="Loading your selection...">
      <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16 lg:px-12">
        <p className="text-[11px] font-semibold tracking-[0.28em] uppercase text-[#8B6914]">
          Loading your selection...
        </p>
        <div className="product-skeleton-pulse mt-4 h-3 w-28 rounded-sm bg-[#E4DCCB]" />
        <div className="product-skeleton-pulse mt-4 h-10 w-64 max-w-full rounded-sm bg-[#E4DCCB]" />
        <div className="cart-layout mt-12">
          <div className="space-y-4">
            {Array.from({ length: 3 }, (_, index) => (
              <div
                key={index}
                className="product-skeleton-pulse h-36 rounded-[4px] bg-[#EDE6D8]"
              />
            ))}
          </div>
          <div className="product-skeleton-pulse h-64 rounded-[4px] bg-[#EDE6D8]" />
        </div>
      </div>
    </div>
  );
}
