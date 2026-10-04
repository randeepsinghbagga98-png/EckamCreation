'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  getCustomerProfile,
  getCustomerWishlist,
  listCustomerAddresses,
  listCustomerOrders,
} from '@/lib/account/api';
import { displayName } from '@/lib/account/presentation';
import type { CustomerProfile } from '@/lib/account/types';
import { messageForAuthError } from '@/lib/auth/errors';
import { useAuth } from '@/lib/auth/session';

type OverviewCounts = {
  addresses: number | null;
  orders: number | null;
  wishlist: number | null;
};

export function AccountOverview() {
  const auth = useAuth();
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [counts, setCounts] = useState<OverviewCounts>({
    addresses: null,
    orders: null,
    wishlist: null,
  });
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void Promise.allSettled([
      getCustomerProfile(),
      listCustomerAddresses(),
      listCustomerOrders(),
      getCustomerWishlist(),
    ]).then((results) => {
      if (cancelled) {
        return;
      }

      const [profileResult, addressResult, orderResult, wishlistResult] = results;
      if (profileResult.status === 'fulfilled') {
        setProfile(profileResult.value);
      }
      setCounts({
        addresses: addressResult.status === 'fulfilled' ? addressResult.value.items.length : null,
        orders: orderResult.status === 'fulfilled' ? orderResult.value.items.length : null,
        wishlist: wishlistResult.status === 'fulfilled' ? wishlistResult.value.items.length : null,
      });
      if (results.some((result) => result.status === 'rejected')) {
        const firstError = results.find((result) => result.status === 'rejected');
        if (firstError && firstError.status === 'rejected') {
          setNotice(messageForAuthError(firstError.reason));
        }
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const name = displayName(profile ?? auth.session);

  return (
    <section className="account-panel">
      <h2 className="account-section-title">Overview</h2>
      <p className="account-copy">Signed in as {name}.</p>
      {notice ? (
        <p className="account-hint" role="status">
          Some account details could not be loaded. {notice}
        </p>
      ) : null}
      <div className="account-overview-grid">
        <Link href="/account/profile" className="account-card account-card-link">
          <p className="account-kicker">Profile</p>
          <p className="account-card-title">{profile?.email ?? auth.session?.email ?? 'Your profile'}</p>
          <p className="account-card-copy">Name, email and phone on file.</p>
        </Link>
        <Link href="/account/addresses" className="account-card account-card-link">
          <p className="account-kicker">Addresses</p>
          <p className="account-card-title">
            {counts.addresses === null
              ? 'Saved addresses'
              : `${counts.addresses} saved`}
          </p>
          <p className="account-card-copy">Manage delivery details.</p>
        </Link>
        <Link href="/account/orders" className="account-card account-card-link">
          <p className="account-kicker">Orders</p>
          <p className="account-card-title">
            {counts.orders === null ? 'Order history' : `${counts.orders} orders`}
          </p>
          <p className="account-card-copy">Placed orders from the server.</p>
        </Link>
        <Link href="/account/wishlist" className="account-card account-card-link">
          <p className="account-kicker">Wishlist</p>
          <p className="account-card-title">
            {counts.wishlist === null ? 'Saved pieces' : `${counts.wishlist} saved`}
          </p>
          <p className="account-card-copy">Pieces saved to your account.</p>
        </Link>
      </div>
    </section>
  );
}
