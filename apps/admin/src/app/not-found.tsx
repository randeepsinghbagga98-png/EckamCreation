import Link from "next/link";

export default function AdminNotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#050505] px-6 text-[#F6F0E5]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#D6A84F]">
        Not found
      </p>
      <h1 className="mt-4 font-sans text-3xl font-light uppercase tracking-[-0.04em]">
        This admin page is not available.
      </h1>
      <Link
        href="/admin"
        className="mt-8 inline-flex min-h-11 items-center bg-[#D6A84F] px-7 text-[11px] font-bold uppercase tracking-[0.2em] text-[#050505]"
      >
        Back to dashboard
      </Link>
    </main>
  );
}
