export function ContactHero() {
  return (
    <section
      aria-labelledby="contact-hero-heading"
      className="bg-[#050505] text-[#F6F0E5]"
    >
      <div className="about-hero-copy mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20 lg:px-12 lg:py-24">
        <div className="mb-5 flex items-center gap-3">
          <span
            className="h-px w-9 bg-gradient-to-r from-[#D6A84F] to-[#E8D3A4] sm:w-12"
            aria-hidden="true"
          />
          <p className="text-[10px] font-bold tracking-[0.32em] uppercase text-[#D6A84F] sm:text-[11px]">
            Contact Eckam
          </p>
        </div>
        <h1
          id="contact-hero-heading"
          className="max-w-3xl font-sans text-[clamp(36px,6vw,72px)] font-light leading-[0.94] tracking-[-0.04em] uppercase"
        >
          Let&apos;s start
          <span className="mt-1 block font-serif italic font-normal tracking-normal text-[#E8D3A4] normal-case">
            a conversation.
          </span>
        </h1>
        <p className="mt-6 max-w-xl text-[15px] font-light leading-relaxed text-[#F6F0E5]/74 sm:text-base">
          Have a question about Eckam Creation, our collections, or your
          shopping experience? We&apos;re building a considered way to connect.
        </p>
      </div>
    </section>
  );
}
