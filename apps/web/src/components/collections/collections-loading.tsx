export function CollectionsLoading() {
  return (
    <div className="collections-page" aria-busy="true">
      <div className="collections-hero bg-[#050505] px-5 py-16 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <div className="collections-skeleton collections-skeleton--kicker" />
          <div className="collections-skeleton collections-skeleton--title" />
          <div className="collections-skeleton collections-skeleton--copy" />
        </div>
      </div>
      <div className="bg-[#F6F0E5] px-5 py-12 sm:px-8 lg:px-12">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 min-[480px]:grid-cols-2 lg:grid-cols-3">
          <div className="collections-skeleton collections-skeleton--card" />
          <div className="collections-skeleton collections-skeleton--card" />
          <div className="collections-skeleton collections-skeleton--card" />
        </div>
      </div>
    </div>
  );
}
