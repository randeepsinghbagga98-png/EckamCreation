import { ABOUT_PILLARS } from '@/lib/about/content';
import { AboutReveal } from './about-reveal';

export function AboutStandard() {
  return (
    <section
      aria-labelledby="about-standard-heading"
      className="about-dark bg-[#050505] text-[#F6F0E5]"
    >
      <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-24 lg:px-12 lg:py-28">
        <AboutReveal as="header" className="max-w-2xl">
          <div className="mb-5 flex items-center gap-3">
            <span
              className="h-px w-9 bg-gradient-to-r from-[#D6A84F] to-[#E8D3A4] sm:w-11"
              aria-hidden="true"
            />
            <p className="text-[10px] font-bold tracking-[0.28em] uppercase text-[#D6A84F] sm:text-[11px]">
              The Eckam standard
            </p>
          </div>
          <h2
            id="about-standard-heading"
            className="font-sans text-[clamp(36px,5.2vw,64px)] font-light leading-[0.96] tracking-[-0.04em] uppercase"
          >
            Four ideas
            <span className="mt-1 block font-serif italic font-normal tracking-normal text-[#E8D3A4] normal-case">
              that shape the shop.
            </span>
          </h2>
        </AboutReveal>

        <ol className="mt-14 grid gap-10 sm:grid-cols-2 lg:mt-16 lg:grid-cols-4 lg:gap-8">
          {ABOUT_PILLARS.map((pillar) => {
            const Icon = pillar.Icon;
            return (
              <li key={pillar.id}>
                <article>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[11px] font-semibold tracking-[0.22em] text-[#D6A84F]">
                      {pillar.index}
                    </p>
                    <Icon className="size-4 text-[#E8D3A4]" />
                  </div>
                  <span
                    className="mt-4 block h-px w-8 bg-[#D6A84F]"
                    aria-hidden="true"
                  />
                  <h3 className="mt-4 font-sans text-[15px] font-semibold tracking-[0.14em] uppercase">
                    {pillar.title}
                  </h3>
                  <p className="mt-3 text-[14px] font-light leading-relaxed text-[#F6F0E5]/70 sm:text-[15px]">
                    {pillar.description}
                  </p>
                </article>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
