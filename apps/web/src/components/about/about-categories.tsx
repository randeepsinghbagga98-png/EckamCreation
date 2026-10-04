import Image from 'next/image';
import Link from 'next/link';
import { ABOUT_CATEGORIES } from '@/lib/about/content';
import { ArrowRightIcon } from '../icons';
import { AboutReveal } from './about-reveal';

export function AboutCategories() {
  return (
    <section
      aria-labelledby="about-categories-heading"
      className="about-ivory bg-[#F6F0E5] text-[#1A1815]"
    >
      <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-24 lg:px-12 lg:py-28">
        <AboutReveal as="header" className="max-w-2xl">
          <div className="mb-5 flex items-center gap-3">
            <span
              className="h-px w-9 bg-gradient-to-r from-[#D6A84F] to-[#E8D3A4] sm:w-11"
              aria-hidden="true"
            />
            <p className="text-[10px] font-bold tracking-[0.28em] uppercase text-[#8B6914] sm:text-[11px]">
              What we curate
            </p>
          </div>
          <h2
            id="about-categories-heading"
            className="font-sans text-[clamp(36px,5.2vw,64px)] font-light leading-[0.96] tracking-[-0.04em] uppercase"
          >
            Categories
            <span className="mt-1 block font-serif italic font-normal tracking-normal text-[#8B6914] normal-case">
              already on the shop.
            </span>
          </h2>
          <p className="mt-6 max-w-xl text-[15px] font-light leading-relaxed text-[#1A1815]/72 sm:text-base">
            The catalogue is organised around the same lifestyle categories you
            can browse in Shop — jewellery, bags, fashion, home, kitchen,
            beauty, gifts, and quieter objects for considered spaces.
          </p>
        </AboutReveal>

        <ul className="mt-12 grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 lg:mt-16 lg:grid-cols-4 lg:gap-5">
          {ABOUT_CATEGORIES.map((category) => (
            <li key={category.slug}>
              <Link
                href={category.href}
                className="about-category-link group relative block overflow-hidden bg-[#0A0A0A] focus-visible:outline-2 focus-visible:outline-[#8B6914] focus-visible:outline-offset-4"
              >
                <div className="relative aspect-[4/5] min-h-[220px]">
                  <Image
                    src={category.imageSrc}
                    alt={category.imageAlt}
                    fill
                    sizes="(min-width: 1024px) 25vw, (min-width: 480px) 50vw, 100vw"
                    className="about-category-image object-cover object-center"
                  />
                  <div
                    className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/28 to-black/10"
                    aria-hidden="true"
                  />
                  <div className="absolute inset-x-0 bottom-0 z-10 p-5">
                    <h3 className="font-sans text-[17px] font-light leading-snug tracking-tight text-white">
                      {category.name}
                    </h3>
                    <p className="mt-2 text-[13px] font-light leading-relaxed text-white/78">
                      {category.descriptor}
                    </p>
                    <span className="mt-3 inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#E8D3A4]">
                      Shop category
                      <ArrowRightIcon className="size-3.5 transition-transform duration-500 group-hover:translate-x-1.5 group-focus-visible:translate-x-1.5" />
                    </span>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
