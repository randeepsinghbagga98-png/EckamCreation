'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { messageForAuthError } from '@/lib/auth/errors';
import { signOut } from '@/lib/auth/session';

const NAV: Array<{ href: string; label: string; exact?: boolean }> = [
  { href: '/account', label: 'Overview', exact: true },
  { href: '/account/profile', label: 'Profile' },
  { href: '/account/addresses', label: 'Addresses' },
  { href: '/account/orders', label: 'Orders' },
  { href: '/account/wishlist', label: 'Wishlist' },
];

export function AccountSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogout() {
    if (pending) {
      return;
    }

    setPending(true);
    setError(null);
    try {
      await signOut();
      router.replace('/');
    } catch (cause) {
      setError(messageForAuthError(cause));
      setPending(false);
    }
  }

  return (
    <aside className="account-sidebar">
      <nav aria-label="Account" className="account-nav">
        {NAV.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`account-nav-link${active ? ' is-active' : ''}`}
              aria-current={active ? 'page' : undefined}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <button
        type="button"
        className="account-logout"
        onClick={() => {
          void handleLogout();
        }}
        disabled={pending}
      >
        {pending ? 'Signing out…' : 'Log out'}
      </button>
      {error ? (
        <p className="checkout-field-error" role="alert">
          {error}
        </p>
      ) : null}
    </aside>
  );
}
