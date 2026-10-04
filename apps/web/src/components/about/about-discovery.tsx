import Image from 'next/image';
import Link from 'next/link';
import { AboutReveal } from './about-reveal';

export function AboutDiscovery() {
  return (
    <section
      aria-labelledby="about-discovery-heading"
      className="about-ivory bg-[#F6F0E5] text-[#1A1815]"
    >
      <div className="mx-auto grid max-w-7xl items-stretch gap-0 lg:grid-cols-2">
        <AboutReveal className="relative min-h-[320px] overflow-hidden lg:min-h-[560px]">
          <Image
            src="https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=1600&q=80"
            alt="Structured leather handbag in warm light"
            fill
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="object-cover object-center"
          />
        </AboutReveal>

        <div className="flex flex-col justify-center px-5 py-16 sm:px-10 sm:py-20 lg:px-16 lg:py-24">
          <AboutReveal delay={0.08}>
            <p className="text-[10px] font-bold tracking-[0.28em] uppercase text-[#8B6914] sm:text-[11px]">
              Designed for discovery
            </p>
            <h2
              id="about-discovery-heading"
              className="mt-5 font-sans text-[clamp(32px,4.6vw,56px)] font-light leading-[0.96] tracking-[-0.04em] uppercase"
            >
              Discovery
              <span className="mt-1 block font-serif italic font-normal tracking-normal text-[#8B6914] normal-case">
                should feel different.
              </span>
            </h2>
            <p className="mt-6 max-w-md text-[15px] font-light leading-relaxed text-[#1A1815]/72 sm:text-base">
              Eckam is arranged around how you find things: visual presentation,
              collections, categories, and a considered path from the first
              glance to the bag. Shop to browse the full edit. Collections to
              move through a tighter story.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
              <Link
                href="/shop"
                className="inline-flex items-center justify-center bg-[#1A1815] px-8 py-4 text-[11px] font-bold tracking-[0.22em] uppercase text-[#F6F0E5] transition-colors hover:bg-[#050505] focus-visible:outline-2 focus-visible:outline-[#8B6914] focus-visible:outline-offset-2 sm:text-xs"
              >
                Shop
              </Link>
              <Link
                href="/collections"
                className="inline-flex items-center justify-center border border-[#1A1815]/20 px-8 py-4 text-[11px] font-semibold tracking-[0.22em] uppercase text-[#1A1815] transition-colors hover:border-[#8B6914] hover:text-[#8B6914] focus-visible:outline-2 focus-visible:outline-[#8B6914] focus-visible:outline-offset-2 sm:text-xs"
              >
                Collections
              </Link>
            </div>
          </AboutReveal>
        </div>
      </div>
    </section>
  );
}
