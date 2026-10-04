'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getCustomerOrder } from '@/lib/account/api';
import { formatAccountDate, formatAccountMoney, formatOrderStatus } from '@/lib/account/presentation';
import type { OrderDetail } from '@/lib/account/types';
import { messageForAuthError } from '@/lib/auth/errors';

type AccountOrderDetailProps = {
  idOrNumber: string;
};

export function AccountOrderDetail({ idOrNumber }: AccountOrderDetailProps) {
  const [result, setResult] = useState<{
    key: string;
    order: OrderDetail | null;
    notice: string | null;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;

    void getCustomerOrder(idOrNumber)
      .then((data) => {
        if (cancelled) {
          return;
        }
        setResult({ key: idOrNumber, order: data, notice: null });
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }
        setResult({
          key: idOrNumber,
          order: null,
          notice: messageForAuthError(error),
        });
      });

    return () => {
      cancelled = true;
    };
  }, [idOrNumber]);

  const order = result?.key === idOrNumber ? result.order : null;
  const notice = result?.key === idOrNumber ? result.notice : null;
  const status =
    result?.key !== idOrNumber ? 'loading' : result.order ? 'ready' : 'error';

  if (status === 'loading') {
    return (
      <div className="account-panel" aria-busy="true">
        <div className="account-skeleton account-skeleton--card" />
      </div>
    );
  }

  if (status === 'error' || !order) {
    return (
      <div className="account-panel" role="alert">
        <p className="account-kicker">Order</p>
        <p className="account-copy">{notice}</p>
        <Link href="/account/orders" className="cart-cta cart-cta--ghost mt-6">
          Back to orders
        </Link>
      </div>
    );
  }

  const shipping = order.shippingAddress;

  return (
    <section className="account-panel">
      <p className="account-kicker">Order</p>
      <h2 className="account-section-title">{order.number}</h2>
      <dl className="account-meta">
        <div>
          <dt>Status</dt>
          <dd>{formatOrderStatus(order.status)}</dd>
        </div>
        <div>
          <dt>Placed</dt>
          <dd>{formatAccountDate(order.placedAt)}</dd>
        </div>
        {order.paymentStatus ? (
          <div>
            <dt>Payment</dt>
            <dd>{formatOrderStatus(order.paymentStatus)}</dd>
          </div>
        ) : null}
      </dl>

      <ul className="account-order-items">
        {order.items.map((item) => (
          <li key={`${item.sku}-${item.quantity}-${item.productName}`}>
            <div>
              <p className="account-card-title">{item.productName}</p>
              {item.variantName ? <p className="account-card-copy">{item.variantName}</p> : null}
              <p className="account-card-copy">Qty {item.quantity}</p>
            </div>
            <p className="account-card-copy">{formatAccountMoney(item.total)}</p>
          </li>
        ))}
      </ul>

      <dl className="account-meta">
        <div>
          <dt>Subtotal</dt>
          <dd>{formatAccountMoney(order.subtotal)}</dd>
        </div>
        <div>
          <dt>Shipping</dt>
          <dd>{formatAccountMoney(order.shipping)}</dd>
        </div>
        <div>
          <dt>Tax</dt>
          <dd>{formatAccountMoney(order.tax)}</dd>
        </div>
        <div>
          <dt>Total</dt>
          <dd>{formatAccountMoney(order.total)}</dd>
        </div>
      </dl>

      {shipping ? (
        <div className="account-form-block">
          <h3 className="account-section-title">Shipping address</h3>
          <p className="account-card-copy">
            {shipping.fullName}
            <br />
            {shipping.line1}
            {shipping.line2 ? (
              <>
                <br />
                {shipping.line2}
              </>
            ) : null}
            <br />
            {[shipping.city, shipping.state, shipping.postalCode].filter(Boolean).join(', ')}
          </p>
        </div>
      ) : null}

      <Link href="/account/orders" className="account-text-button">
        Back to orders
      </Link>
    </section>
  );
}
