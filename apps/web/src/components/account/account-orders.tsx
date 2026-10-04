'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { listCustomerOrders } from '@/lib/account/api';
import { formatAccountDate, formatAccountMoney, formatOrderStatus } from '@/lib/account/presentation';
import type { OrderListItem } from '@/lib/account/types';
import { messageForAuthError } from '@/lib/auth/errors';
import { AccountEmptyState } from './account-empty-state';

export function AccountOrders() {
  const [items, setItems] = useState<OrderListItem[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void listCustomerOrders()
      .then((data) => {
        if (cancelled) {
          return;
        }
        setItems(data.items);
        setStatus('ready');
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }
        setNotice(messageForAuthError(error));
        setStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (status === 'loading') {
    return (
      <div className="account-panel" aria-busy="true">
        <div className="account-skeleton account-skeleton--card" />
        <div className="account-skeleton account-skeleton--card" />
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="account-panel" role="alert">
        <p className="account-kicker">Orders</p>
        <p className="account-copy">{notice}</p>
        <button
          type="button"
          className="cart-cta cart-cta--primary mt-6"
          onClick={() => {
            setStatus('loading');
            void listCustomerOrders()
              .then((data) => {
                setItems(data.items);
                setStatus('ready');
                setNotice(null);
              })
              .catch((error) => {
                setNotice(messageForAuthError(error));
                setStatus('error');
              });
          }}
        >
          Try again
        </button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <AccountEmptyState
        kicker="Orders"
        title="No orders yet"
        copy="You haven't placed an order yet."
        actionHref="/shop"
        actionLabel="Start shopping"
      />
    );
  }

  return (
    <section className="account-panel">
      <h2 className="account-section-title">Orders</h2>
      <ul className="account-card-list">
        {items.map((order) => (
          <li key={order.number} className="account-card">
            <Link href={`/account/orders/${encodeURIComponent(order.number)}`} className="account-card-link">
              <p className="account-card-title">{order.number}</p>
              <p className="account-card-copy">
                {formatOrderStatus(order.status)} · {formatAccountDate(order.placedAt)}
              </p>
              <p className="account-card-copy">
                {order.itemCount} {order.itemCount === 1 ? 'item' : 'items'} · {formatAccountMoney(order.total)}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
