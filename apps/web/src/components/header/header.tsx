'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/session';
import { useCart } from '@/lib/cart/store';
import {
  SearchIcon,
  UserIcon,
  BagIcon,
} from '../icons';

const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/shop', label: 'Shop' },
  { href: '/collections', label: 'Collections' },
  { href: '/#new-arrivals', label: 'Latest' },
  { href: '/about', label: 'About' },
];

export function Header() {
  const cart = useCart();
  const auth = useAuth();
  const accountLabel =
    auth.status === 'authenticated' ? 'Account' : auth.status === 'loading' ? null : 'Sign in';
  const accountAriaLabel =
    auth.status === 'authenticated' ? 'Account' : 'Sign in';
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Scroll detection for sticky header elevation
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 15);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setMobileMenuOpen(false);
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  return (
    <>
      {/* ── Top Announcement Strip ── */}
      <div
        className="w-full bg-[#020202] text-white/65 border-b border-white/[0.07] text-[10px] sm:text-[11px] font-medium tracking-[0.22em] uppercase py-2 px-4 select-none relative z-50"
        role="region"
        aria-label="Store announcement"
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <span className="hidden sm:inline-block text-[9.5px] text-[#D6A84F] tracking-[0.28em] font-semibold">
            CURATED LUXURY
          </span>
          <div className="mx-auto flex items-center gap-2.5 sm:gap-3.5 text-[9.5px] sm:text-[10.5px] font-medium tracking-[0.2em] text-white/75">
            <span>Designed To Be Desired</span>
            <span className="w-1 h-1 rounded-full bg-[#D6A84F]" aria-hidden="true" />
            <span>The Catalogue</span>
            <span className="hidden md:inline-block w-1 h-1 rounded-full bg-[#D6A84F]" aria-hidden="true" />
            <span className="hidden md:inline">Eckam Creation</span>
          </div>
          <span className="hidden sm:inline-block text-[9.5px] text-white/45 tracking-[0.2em]">
            Eckam
          </span>
        </div>
      </div>

      {/* ── Main Navigation Header ── */}
      <header
        role="banner"
        className={`sticky top-0 z-40 w-full transition-all duration-300 ${
          isScrolled
            ? 'bg-[#050505]/96 backdrop-blur-xl border-b border-white/[0.1] shadow-[0_10px_35px_rgba(0,0,0,0.7)] py-3.5 sm:py-4'
            : 'bg-[#050505]/90 backdrop-blur-md border-b border-white/[0.08] py-5 sm:py-6'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-6">
          {/* Mobile Menu Hamburger Button */}
          <div className="flex items-center lg:hidden">
            <button
              type="button"
              className="w-11 h-11 -ml-2 rounded-full flex flex-col items-center justify-center gap-1.5 text-white/85 hover:text-white hover:bg-white/[0.06] transition-colors focus-visible:outline-2 focus-visible:outline-[#D6A84F]"
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-navigation"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
            >
              <span
                className={`w-5 h-[1.5px] bg-current transition-all duration-300 ${
                  mobileMenuOpen ? 'rotate-45 translate-y-[5px]' : ''
                }`}
              />
              <span
                className={`w-5 h-[1.5px] bg-current transition-all duration-300 ${
                  mobileMenuOpen ? '-rotate-45 -translate-y-[2.5px]' : ''
                }`}
              />
            </button>
          </div>

          {/* Brand Logo: ECKAM CREATION */}
          <div className="flex items-center">
            <Link
              href="/"
              className="group inline-flex items-center gap-2.5 focus-visible:outline-2 focus-visible:outline-[#D6A84F] focus-visible:outline-offset-4 rounded-xs"
              aria-label="Eckam Creation homepage"
            >
              <span className="font-light tracking-[0.28em] sm:tracking-[0.32em] text-base sm:text-lg lg:text-xl text-white group-hover:text-[#E8D3A4] transition-colors uppercase whitespace-nowrap">
                ECKAM CREATION
              </span>
              <span
                className="w-1.5 h-1.5 rounded-full bg-[#D6A84F] group-hover:bg-[#F0C66A] transition-colors inline-block mb-0.5"
                aria-hidden="true"
              />
            </Link>
          </div>

          {/* Desktop Navigation Links */}
          <nav
            className="hidden lg:flex items-center gap-8 xl:gap-10"
            aria-label="Primary desktop navigation"
          >
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="relative py-2 text-[12px] font-medium tracking-[0.2em] uppercase text-white/75 hover:text-white transition-colors group focus-visible:outline-2 focus-visible:outline-[#D6A84F] focus-visible:outline-offset-4 rounded-xs"
              >
                <span>{link.label}</span>
                <span
                  className="absolute bottom-0 left-0 w-0 h-[1.5px] bg-gradient-to-r from-[#D6A84F] to-[#F0C66A] transition-all duration-300 ease-out group-hover:w-full"
                  aria-hidden="true"
                />
              </Link>
            ))}
          </nav>

          {/* Right Utilities: Search, Account, Cart, Country / Currency */}
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            {/* Search Trigger */}
            <Link
              href="/search"
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center text-white/80 hover:text-[#D6A84F] hover:bg-white/[0.06] transition-all focus-visible:outline-2 focus-visible:outline-[#D6A84F]"
              aria-label="Search catalog"
            >
              <SearchIcon className="w-5 h-5" />
            </Link>

            {/* Account Link */}
            <Link
              href="/account"
              className={`h-10 sm:h-11 rounded-full flex items-center justify-center text-white/80 hover:text-[#D6A84F] hover:bg-white/[0.06] transition-all focus-visible:outline-2 focus-visible:outline-[#D6A84F] ${
                accountLabel ? 'w-10 sm:w-auto sm:px-3.5 sm:gap-2' : 'w-10 sm:w-11'
              }`}
              aria-label={accountAriaLabel}
            >
              <UserIcon className="w-5 h-5" />
              {accountLabel ? (
                <span className="hidden sm:inline text-[10px] font-medium tracking-[0.18em] uppercase">
                  {accountLabel}
                </span>
              ) : null}
            </Link>

            {/* Cart Link with Badge */}
            <Link
              href="/cart"
              className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center text-white/80 hover:text-[#D6A84F] hover:bg-white/[0.06] transition-all focus-visible:outline-2 focus-visible:outline-[#D6A84F]"
              aria-label={`Shopping cart, ${cart.itemCount} ${cart.itemCount === 1 ? 'item' : 'items'}`}
            >
              <BagIcon className="w-5 h-5" />
              <span
                className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[#D6A84F] text-[#050505] text-[9.5px] font-bold flex items-center justify-center leading-none"
                aria-hidden="true"
              >
                {cart.itemCount}
              </span>
            </Link>

            <p
              className="hidden md:flex h-10 px-3.5 rounded-full border border-white/[0.14] bg-white/[0.03] text-white/70 items-center text-[11px] font-medium tracking-[0.14em]"
              title="Catalogue prices use the store currency. This is not a country or delivery selector."
            >
              Prices in INR
            </p>
          </div>
        </div>
      </header>

      {/* ── Mobile Navigation Drawer ── */}
      {mobileMenuOpen && (
        <div
          id="mobile-navigation"
          role="dialog"
          aria-modal="true"
          aria-label="Mobile navigation menu"
          className="fixed inset-0 top-[77px] z-50 bg-[#050505]/98 backdrop-blur-2xl lg:hidden flex flex-col justify-between overflow-y-auto border-t border-white/[0.08]"
        >
          <div className="p-6 space-y-6">
            {/* Mobile Search Input */}
            <form
              role="search"
              action="/search"
              method="get"
              className="relative"
              onSubmit={() => setMobileMenuOpen(false)}
            >
              <label htmlFor="mobile-search-input" className="sr-only">
                Search catalogue
              </label>
              <SearchIcon className="w-4 h-4 text-[#D6A84F] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="mobile-search-input"
                name="q"
                type="search"
                placeholder="Search products, categories, collections..."
                className="w-full pl-10 pr-4 py-3 bg-white/[0.04] border border-white/[0.1] rounded-xs text-sm text-white placeholder-white/40 focus:outline-none focus:border-[#D6A84F] transition-colors"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </form>

            {/* Mobile Navigation Links */}
            <nav aria-label="Mobile primary navigation" className="space-y-1 pt-1">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between py-4 border-b border-white/[0.06] text-sm font-medium tracking-[0.2em] uppercase text-white/80 hover:text-[#D6A84F] transition-colors"
                >
                  <span>{link.label}</span>
                  <span className="text-white/25 text-xs tracking-normal">→</span>
                </Link>
              ))}
            </nav>

            <p className="pt-3 text-[10px] font-medium tracking-[0.18em] uppercase text-white/45">
              Catalogue prices are shown in INR.
            </p>
          </div>

          {/* Mobile Footer Status */}
          <div className="p-6 border-t border-white/[0.08] bg-black/40 text-[10px] text-white/50 tracking-[0.18em] uppercase flex items-center justify-between">
            <span>The Catalogue</span>
            <span className="text-[#D6A84F]">Eckam Creation</span>
          </div>
        </div>
      )}

    </>
  );
}
