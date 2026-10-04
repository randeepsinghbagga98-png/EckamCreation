'use client';

import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowUpRightIcon,
  GlobeIcon,
  ShieldCheckIcon,
  SparklesIcon,
} from '../icons';

export function Hero() {
  return (
    <section
      aria-labelledby="hero-main-heading"
      className="relative w-full overflow-hidden bg-[#050505] text-white min-h-[720px] lg:min-h-[84vh] lg:h-[88vh] lg:max-h-[940px] flex items-center"
    >
      {/* ── 1. CINEMATIC LUXURY VISUAL LAYER (z-0) ── */}
      <div
        className="absolute inset-0 z-0 overflow-hidden pointer-events-none select-none"
        aria-hidden="true"
      >
        <Image
          src="https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?auto=format&fit=crop&w=3200&q=85"
          alt="Eckam Creation curated luxury lifestyle — leather goods and refined design"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center brightness-[0.88] contrast-[1.08]"
        />
      </div>

      {/* ── 2. LAYERED GRADIENTS & HIGHLIGHTS (z-10) ── */}
      {/* Left-to-right scrim: solid black behind text on the left, fading to transparent on the right */}
      <div
        className="absolute inset-0 z-10 pointer-events-none"
        style={{
          background:
            'linear-gradient(to right, #050505 0%, #050505 28%, rgba(5,5,5,0.78) 46%, rgba(5,5,5,0.22) 64%, transparent 100%)',
        }}
        aria-hidden="true"
      />

      {/* Subtle top edge vignette */}
      <div
        className="absolute inset-0 z-10 pointer-events-none"
        style={{
          background: 'linear-gradient(to bottom, rgba(5,5,5,0.45) 0%, transparent 20%)',
        }}
        aria-hidden="true"
      />

      {/* Subtle bottom edge blend */}
      <div
        className="absolute inset-0 z-10 pointer-events-none"
        style={{
          background: 'linear-gradient(to top, #050505 0%, rgba(5,5,5,0.55) 12%, transparent 32%)',
        }}
        aria-hidden="true"
      />

      {/* Ambient champagne-gold radial glow accentuating the product highlights */}
      <div
        className="absolute right-[5%] sm:right-[12%] top-1/2 -translate-y-1/2 z-10 w-[380px] sm:w-[540px] lg:w-[680px] h-[380px] sm:h-[540px] lg:h-[680px] rounded-full blur-3xl pointer-events-none"
        style={{
          background:
            'radial-gradient(circle, rgba(214,168,79,0.14) 0%, rgba(232,211,164,0.04) 45%, transparent 70%)',
        }}
        aria-hidden="true"
      />

      {/* ── 3. HERO CONTENT CONTAINER (z-30 — GUARANTEED ABOVE ALL OVERLAYS) ── */}
      <div className="relative z-30 w-full max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 py-16 sm:py-20 lg:py-0">
        <div className="max-w-xl sm:max-w-2xl lg:max-w-[56%] xl:max-w-[52%]">
          {/* Eyebrow */}
          <div className="flex items-center gap-3 mb-5 sm:mb-6">
            <span
              className="h-[1.5px] w-9 sm:w-12 bg-gradient-to-r from-[#D6A84F] to-[#E8D3A4]"
              aria-hidden="true"
            />
            <span className="text-[11px] sm:text-xs font-semibold tracking-[0.32em] uppercase text-[#D6A84F]">
              ECKAM CREATION
            </span>
          </div>

          {/* Main Headline: DESIGNED TO BE DESIRED. */}
          <h1
            id="hero-main-heading"
            className="text-5xl sm:text-6xl md:text-7xl lg:text-[5.2rem] xl:text-[6.4rem] font-light leading-[0.92] tracking-tight uppercase select-none text-white"
          >
            <span className="block font-sans text-white tracking-[-0.03em]">
              DESIGNED
            </span>
            <span
              className="block font-serif italic text-[#E8D3A4] font-normal tracking-normal my-0.5 sm:my-1"
              style={{ lineHeight: 1 }}
            >
              TO BE
            </span>
            <span className="block font-sans text-white tracking-[-0.03em]">
              DESIRED<span className="text-[#D6A84F]">.</span>
            </span>
          </h1>

          {/* Supporting Copy */}
          <p className="mt-6 sm:mt-8 text-base sm:text-lg text-white/80 font-light leading-relaxed max-w-lg tracking-wide">
            Curated products, refined design, and a premium shopping experience —{' '}
            <span className="text-white/95">crafted for India and the world.</span>
          </p>

          {/* CTAs */}
          <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-stretch sm:items-center gap-4 sm:gap-5">
            {/* Primary CTA */}
            <Link
              href="/shop"
              className="group relative inline-flex items-center justify-center gap-3 px-8 sm:px-9 py-4 sm:py-4.5 bg-[#D6A84F] hover:bg-[#F0C66A] text-[#050505] text-[11px] sm:text-xs font-bold tracking-[0.22em] uppercase rounded-xs transition-all duration-300 shadow-[0_6px_28px_rgba(214,168,79,0.32)] hover:shadow-[0_8px_36px_rgba(214,168,79,0.52)] focus-visible:outline-2 focus-visible:outline-[#D6A84F] focus-visible:outline-offset-2 active:scale-[0.98]"
            >
              <span>SHOP NOW</span>
              <ArrowUpRightIcon className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>

            {/* Secondary CTA */}
            <Link
              href="/collections"
              className="inline-flex items-center justify-center gap-2 px-7 sm:px-8 py-4 sm:py-4.5 border border-white/25 hover:border-[#D6A84F] hover:bg-white/[0.04] text-white/90 hover:text-white text-[11px] sm:text-xs font-semibold tracking-[0.22em] uppercase rounded-xs transition-all duration-300 focus-visible:outline-2 focus-visible:outline-[#D6A84F] focus-visible:outline-offset-2 active:scale-[0.98]"
            >
              <span>EXPLORE COLLECTIONS</span>
            </Link>
          </div>

          {/* Trust / Value Indicators */}
          <div
            className="mt-11 sm:mt-13 pt-6 sm:pt-7 border-t border-white/[0.12] flex flex-wrap items-center gap-x-6 gap-y-3 sm:gap-x-7 text-[10.5px] sm:text-[11px] font-medium tracking-[0.16em] uppercase text-white/70"
            role="list"
            aria-label="Trust and service commitments"
          >
            <div role="listitem" className="flex items-center gap-2 text-white/80 hover:text-white transition-colors">
              <GlobeIcon className="w-3.5 h-3.5 text-[#D6A84F] flex-none" />
              <span>India &amp; International Delivery</span>
            </div>

            <span className="hidden sm:inline-block w-1 h-1 rounded-full bg-[#D6A84F]/50" aria-hidden="true" />

            <div role="listitem" className="flex items-center gap-2 text-white/80 hover:text-white transition-colors">
              <ShieldCheckIcon className="w-3.5 h-3.5 text-[#D6A84F] flex-none" />
              <span>Secure Checkout</span>
            </div>

            <span className="hidden sm:inline-block w-1 h-1 rounded-full bg-[#D6A84F]/50" aria-hidden="true" />

            <div role="listitem" className="flex items-center gap-2 text-white/80 hover:text-white transition-colors">
              <SparklesIcon className="w-3.5 h-3.5 text-[#D6A84F] flex-none" />
              <span>Curated Collections</span>
            </div>
          </div>
        </div>
      </div>

      {/* Decorative Bottom Gold Hairline */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#D6A84F]/35 to-transparent pointer-events-none z-30"
        aria-hidden="true"
      />
    </section>
  );
}
