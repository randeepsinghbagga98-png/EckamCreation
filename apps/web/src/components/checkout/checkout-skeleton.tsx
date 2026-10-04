export function CheckoutSkeleton() {
  return (
    <div className="checkout-page" aria-busy="true" aria-label="Loading checkout">
      <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16 lg:px-12">
        <div className="product-skeleton-pulse h-3 w-24 rounded-sm bg-[#E4DCCB]" />
        <div className="product-skeleton-pulse mt-4 h-10 w-80 max-w-full rounded-sm bg-[#E4DCCB]" />
        <div className="checkout-layout mt-12">
          <div className="space-y-4">
            {Array.from({ length: 3 }, (_, index) => (
              <div
                key={index}
                className="product-skeleton-pulse h-40 rounded-[4px] bg-[#EDE6D8]"
              />
            ))}
          </div>
          <div className="product-skeleton-pulse h-72 rounded-[4px] bg-[#EDE6D8]" />
        </div>
      </div>
    </div>
  );
}
