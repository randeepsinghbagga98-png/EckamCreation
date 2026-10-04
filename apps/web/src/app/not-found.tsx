import Link from 'next/link';

export default function NotFound() {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="flex min-h-screen flex-col items-center justify-center bg-[#050505] px-6 text-[#F6F0E5]"
    >
      <p className="text-[11px] font-semibold tracking-[0.28em] uppercase text-[#D6A84F]">
        Not found
      </p>
      <h1 className="mt-4 font-sans text-[clamp(36px,6vw,56px)] font-light uppercase tracking-[-0.045em]">
        This page is not available.
      </h1>
      <p className="mt-5 max-w-md text-center text-[15px] font-light leading-relaxed text-[#F6F0E5]/70">
        The address may be mistyped, or the page is no longer published.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex min-h-11 items-center bg-[#D6A84F] px-7 text-[11px] font-bold uppercase tracking-[0.2em] text-[#050505]"
      >
        Back to home
      </Link>
    </main>
  );
}
