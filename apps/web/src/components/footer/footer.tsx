import { FooterLink } from './footer-link';
import { FOOTER_LEGAL_BAR, FOOTER_NAV_GROUPS } from './nav';

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer bg-[#050505] text-[#F6F0E5]" role="contentinfo">
      <div
        className="pointer-events-none h-px bg-gradient-to-r from-transparent via-[#D6A84F]/45 to-transparent"
        aria-hidden="true"
      />

      <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20 lg:px-12 lg:py-24">
        <div className="max-w-xl">
          <p className="font-sans text-[15px] sm:text-[17px] font-light tracking-[0.28em] uppercase text-[#F6F0E5]">
            Eckam Creation
          </p>
          <p className="mt-3 font-serif text-[22px] sm:text-[26px] italic font-normal leading-snug text-[#E8D3A4]">
            Designed to be desired.
          </p>
        </div>

        <div
          className="mt-10 sm:mt-12 h-px bg-gradient-to-r from-[#D6A84F]/50 via-[#E8D3A4]/20 to-transparent"
          aria-hidden="true"
        />

        <div className="mt-12 sm:mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-10">
          {FOOTER_NAV_GROUPS.map((group) => (
            <nav key={group.title} aria-label={group.title}>
              <p className="text-[10px] font-semibold tracking-[0.22em] uppercase text-[#D6A84F]">
                {group.title}
              </p>
              <ul className="mt-4 space-y-1">
                {group.items.map((item) => (
                  <li key={item.label}>
                    <FooterLink item={item} />
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
      </div>

      <div className="border-t border-[#E8D3A4]/12">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12">
          <p className="text-[12px] font-light tracking-wide text-[#F6F0E5]/55">
            © {year} Eckam Creation
          </p>
          <ul className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {FOOTER_LEGAL_BAR.map((item) => (
              <li key={item.label}>
                <FooterLink item={item} />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
