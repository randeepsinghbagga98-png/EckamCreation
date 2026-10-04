'use client';

export default function RootError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="flex min-h-screen flex-col items-center justify-center bg-[#050505] px-6 text-[#F6F0E5]"
    >
      <p className="text-[11px] font-semibold tracking-[0.28em] uppercase text-[#D6A84F]">
        Something went wrong
      </p>
      <h1 className="mt-4 font-sans text-[clamp(36px,6vw,56px)] font-light uppercase tracking-[-0.045em]">
        Unable to load this page.
      </h1>
      <button
        type="button"
        onClick={() => reset()}
        className="mt-8 inline-flex min-h-11 items-center bg-[#D6A84F] px-7 text-[11px] font-bold uppercase tracking-[0.2em] text-[#050505]"
      >
        Try again
      </button>
    </main>
  );
}
