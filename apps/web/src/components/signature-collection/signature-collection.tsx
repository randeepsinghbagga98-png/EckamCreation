'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowRightIcon, ArrowUpRightIcon } from '../icons';

const IMAGE_SRC =
  'https://images.unsplash.com/photo-1723465302725-ff46b3e165f9?auto=format&fit=crop&w=2800&q=80';

const ease = [0.22, 1, 0.36, 1] as const;

export function SignatureCollection() {
  const reduceMotion = useReducedMotion();

  return (
    <section
      id="signature-collection"
      aria-labelledby="signature-collection-heading"
      className="signature-collection relative isolate overflow-hidden bg-[#050505] text-[#F6F0E5]"
    >
      <div className="relative min-h-[65vh] h-[72vh] max-h-[820px] w-full">
        <motion.div
          className="absolute inset-0 z-0"
          initial={reduceMotion ? false : { scale: 1.06 }}
          whileInView={{ scale: 1 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: reduceMotion ? 0 : 1.4, ease }}
        >
          <Image
            src={IMAGE_SRC}
            alt="Grand hotel salon with chandelier, columns, and considered furnishings"
            fill
            sizes="100vw"
            className="signature-collection-image object-cover object-[68%_center] sm:object-[72%_center] brightness-[0.62] contrast-[1.06] saturate-[0.88]"
          />
        </motion.div>

        <div
          className="absolute inset-0 z-10 pointer-events-none"
          style={{
            background:
              'linear-gradient(to right, #050505 0%, rgba(5,5,5,0.88) 28%, rgba(5,5,5,0.42) 52%, rgba(5,5,5,0.12) 72%, transparent 100%)',
          }}
          aria-hidden="true"
        />
        <div
          className="absolute inset-0 z-10 pointer-events-none sm:hidden"
          style={{
            background:
              'linear-gradient(to top, #050505 0%, rgba(5,5,5,0.72) 28%, rgba(5,5,5,0.28) 58%, transparent 100%)',
          }}
          aria-hidden="true"
        />
        <div
          className="absolute inset-0 z-10 pointer-events-none"
          style={{
            background:
              'linear-gradient(to bottom, rgba(5,5,5,0.28) 0%, transparent 18%, transparent 78%, #050505 100%)',
          }}
          aria-hidden="true"
        />
        <div
          className="absolute right-[8%] top-1/2 z-10 hidden h-[420px] w-[420px] -translate-y-1/2 rounded-full blur-3xl pointer-events-none lg:block"
          style={{
            background:
              'radial-gradient(circle, rgba(214,168,79,0.10) 0%, rgba(232,211,164,0.03) 46%, transparent 70%)',
          }}
          aria-hidden="true"
        />

        <div
          className="pointer-events-none absolute inset-4 sm:inset-6 z-20 border border-[#E8D3A4]/16"
          aria-hidden="true"
        />

        <div className="relative z-30 mx-auto flex h-full max-w-7xl items-end sm:items-center px-5 py-14 sm:px-8 sm:py-16 lg:px-12">
          <motion.div
            className="max-w-xl lg:max-w-[38rem]"
            initial={reduceMotion ? false : { opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: reduceMotion ? 0 : 0.75, ease }}
          >
            <div className="mb-5 flex items-center gap-3">
              <span
                className="h-px w-9 sm:w-11 bg-gradient-to-r from-[#D6A84F] to-[#E8D3A4]"
                aria-hidden="true"
              />
              <p className="text-[10px] sm:text-[11px] font-bold tracking-[0.28em] uppercase text-[#D6A84F]">
                The Signature Edit
              </p>
            </div>

            <h2
              id="signature-collection-heading"
              className="font-sans text-[clamp(36px,7vw,76px)] font-light leading-[0.94] tracking-[-0.04em] uppercase text-[#F6F0E5]"
            >
              <span className="block">Made to</span>
              <span className="mt-1 block font-serif italic font-normal tracking-normal text-[#E8D3A4] normal-case">
                be remembered.
              </span>
            </h2>

            <p className="mt-5 sm:mt-6 max-w-md text-[15px] sm:text-base font-light leading-relaxed text-[#F6F0E5]/74">
              Distinctive pieces chosen for those who appreciate considered design,
              refined details, and timeless character.
            </p>

            <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 sm:gap-5">
              <Link
                href="/collections"
                className="group inline-flex min-h-11 items-center justify-center gap-2.5 bg-[#D6A84F] px-7 py-3.5 text-[11px] font-bold tracking-[0.2em] uppercase text-[#050505] transition-colors duration-300 hover:bg-[#F0C66A] focus-visible:outline-2 focus-visible:outline-[#8B6914] focus-visible:outline-offset-4"
              >
                Explore the collection
                <ArrowUpRightIcon className="size-3.5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0 motion-reduce:group-hover:translate-y-0" />
              </Link>

              <Link
                href="/shop"
                className="group inline-flex min-h-11 items-center justify-center gap-2 border border-white/20 px-7 py-3.5 text-[11px] font-semibold tracking-[0.2em] uppercase text-[#E8D3A4] transition-colors duration-300 hover:border-[#D6A84F] hover:text-[#F0C66A] focus-visible:outline-2 focus-visible:outline-[#8B6914] focus-visible:outline-offset-4"
              >
                View all
                <ArrowRightIcon className="size-3.5 transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0" />
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
