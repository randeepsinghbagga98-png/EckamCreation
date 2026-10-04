type ProductSkeletonProps = {
  tone?: 'dark' | 'light';
};

export function ProductSkeleton({ tone = 'light' }: ProductSkeletonProps) {
  const light = tone === 'light';

  return (
    <div className="product-skeleton" aria-hidden="true">
      <div
        className={`product-skeleton-well product-skeleton-pulse aspect-[4/5] rounded-[4px] ${
          light ? 'bg-[#EDE6D8]' : 'bg-[#161616]'
        }`}
      />
      <div
        className={`product-skeleton-pulse mt-4 h-2 w-24 rounded-sm ${
          light ? 'bg-[#E4DCCB]' : 'bg-[#1F1F1F]'
        }`}
      />
      <div
        className={`product-skeleton-pulse mt-3 h-5 w-40 max-w-full rounded-sm ${
          light ? 'bg-[#E4DCCB]' : 'bg-[#1F1F1F]'
        }`}
      />
    </div>
  );
}
