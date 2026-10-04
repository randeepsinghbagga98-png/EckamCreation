import Link from 'next/link';
import { ABOUT_NEW_ARRIVALS_HREF } from '@/lib/about/content';
import { ArrowRightIcon } from '../icons';
import { AboutReveal } from './about-reveal';

export function AboutEvolving() {
  return (
    <section
      aria-labelledby="about-evolving-heading"
      className="about-ivory bg-[#F6F0E5] text-[#1A1815]"
    >
      <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-24 lg:px-12 lg:py-28">
        <AboutReveal className="mx-auto max-w-3xl text-center">
          <div className="mb-5 flex items-center justify-center gap-3">
            <span
              className="h-px w-9 bg-gradient-to-r from-[#D6A84F] to-[#E8D3A4] sm:w-11"
              aria-hidden="true"
            />
            <p className="text-[10px] font-bold tracking-[0.28em] uppercase text-[#8B6914] sm:text-[11px]">
              A living collection
            </p>
            <span
              className="h-px w-9 bg-gradient-to-r from-[#E8D3A4] to-[#D6A84F] sm:w-11"
              aria-hidden="true"
            />
          </div>
          <h2
            id="about-evolving-heading"
            className="font-sans text-[clamp(36px,5.2vw,64px)] font-light leading-[0.96] tracking-[-0.04em] uppercase"
          >
            The collection
            <span className="mt-1 block font-serif italic font-normal tracking-normal text-[#8B6914] normal-case">
              keeps evolving.
            </span>
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-[15px] font-light leading-relaxed text-[#1A1815]/72 sm:text-base">
            The catalogue and editorial selections can change as the edit is
            refined. What you find today is the current expression of that work
            — not a fixed archive.
          </p>
          <Link
            href={ABOUT_NEW_ARRIVALS_HREF}
            className="group mt-8 inline-flex items-center justify-center gap-3 border border-[#1A1815]/20 px-8 py-4 text-[11px] font-semibold tracking-[0.22em] uppercase text-[#1A1815] transition-colors hover:border-[#8B6914] hover:text-[#8B6914] focus-visible:outline-2 focus-visible:outline-[#8B6914] focus-visible:outline-offset-2 sm:text-xs"
          >
            See what&apos;s new
            <ArrowRightIcon className="size-3.5 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </AboutReveal>
      </div>
    </section>
  );
}
