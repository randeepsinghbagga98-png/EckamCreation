export default function ContactRouteLoading() {
  return (
    <div className="contact-page" aria-busy="true" aria-label="Loading Contact">
      <div className="bg-[#050505] px-5 py-24 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <div className="about-skeleton about-skeleton--kicker" />
          <div className="about-skeleton about-skeleton--title" />
          <div className="about-skeleton about-skeleton--copy" />
        </div>
      </div>
    </div>
  );
}
