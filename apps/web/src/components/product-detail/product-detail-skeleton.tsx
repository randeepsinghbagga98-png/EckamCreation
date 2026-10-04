export function ProductDetailSkeleton() {
  return (
    <div className="pdp-page" aria-busy="true" aria-label="Loading product">
      <div className="pdp-top">
        <div className="mx-auto max-w-7xl px-5 py-6 sm:px-8 lg:px-12">
          <div className="product-skeleton-pulse h-3 w-64 max-w-full rounded-sm bg-[#2a2a2a]" />
        </div>
      </div>
      <section className="pdp-stage">
        <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-12 lg:px-12 lg:py-16">
          <div className="pdp-layout">
            <div className="pdp-gallery-stage product-skeleton-pulse" />
            <div className="space-y-5">
              <div className="product-skeleton-pulse h-3 w-28 rounded-sm bg-[#E4DCCB]" />
              <div className="product-skeleton-pulse h-10 w-72 max-w-full rounded-sm bg-[#E4DCCB]" />
              <div className="product-skeleton-pulse h-11 w-40 rounded-sm bg-[#E4DCCB]" />
              <div className="product-skeleton-pulse h-12 w-full rounded-sm bg-[#E4DCCB]" />
              <div className="product-skeleton-pulse h-12 w-full rounded-sm bg-[#E4DCCB]" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
