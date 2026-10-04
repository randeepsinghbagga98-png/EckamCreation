import Link from 'next/link';

const SUPPORT_LINKS = [
  { href: '/shop', label: 'Shop' },
  { href: '/collections', label: 'Collections' },
  { href: '/about', label: 'About' },
  { href: '/account', label: 'Account' },
] as const;

export function ContactPanel() {
  return (
    <aside className="contact-panel" aria-labelledby="contact-details-heading">
      <div>
        <p className="text-[10px] font-bold tracking-[0.28em] uppercase text-[#8B6914]">
          Contact details
        </p>
        <h2
          id="contact-details-heading"
          className="mt-4 font-sans text-[clamp(24px,3vw,32px)] font-light leading-tight tracking-[-0.03em] uppercase text-[#1A1815]"
        >
          Direct contact
        </h2>
        <p className="mt-4 text-[15px] font-light leading-relaxed text-[#1A1815]/72">
          Direct contact details will be available soon.
        </p>
      </div>

      <nav aria-label="Helpful destinations" className="mt-12">
        <p className="text-[10px] font-bold tracking-[0.28em] uppercase text-[#8B6914]">
          Meanwhile
        </p>
        <ul className="mt-5 flex flex-col gap-3">
          {SUPPORT_LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="inline-flex min-h-11 items-center text-[12px] font-semibold tracking-[0.2em] uppercase text-[#1A1815] underline-offset-4 transition-colors hover:text-[#8B6914] hover:underline focus-visible:outline-2 focus-visible:outline-[#8B6914] focus-visible:outline-offset-4"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
