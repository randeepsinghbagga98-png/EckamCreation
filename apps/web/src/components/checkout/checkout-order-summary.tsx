import Image from 'next/image';
import Link from 'next/link';
import type { CheckoutSessionDto } from '@eckamcreation/api-contracts';
import { formatProductPrice } from '@/lib/catalogue/product';
import type { CartSnapshot } from '@/lib/cart/types';

type CheckoutOrderSummaryProps = {
  cart: CartSnapshot;
  session?: CheckoutSessionDto | null;
};

function unavailableLabel() {
  return 'Calculated at checkout';
}

export function CheckoutOrderSummary({ cart, session }: CheckoutOrderSummaryProps) {
  if (session) {
    return (
      <aside className="checkout-summary" aria-labelledby="checkout-summary-heading">
        <h2 id="checkout-summary-heading" className="checkout-summary-heading">
          Order summary
        </h2>
        <p className="checkout-summary-intro">Your selected pieces</p>

        <ul className="checkout-summary-items">
          {session.items.map((item) => (
            <li key={item.id} className="checkout-summary-item">
              <div className="min-w-0" style={{ gridColumn: '1 / -1' }}>
                <p className="checkout-summary-name">{item.productName}</p>
                {item.variantName ? (
                  <p className="checkout-summary-meta">{item.variantName}</p>
                ) : null}
                <p className="checkout-summary-meta">Qty: {item.quantity}</p>
                <p className="checkout-summary-meta">
                  {formatProductPrice(item.unitPrice)}
                </p>
              </div>
            </li>
          ))}
        </ul>

        <dl className="checkout-summary-rows">
          <div>
            <dt>Subtotal</dt>
            <dd>{formatProductPrice(session.subtotal)}</dd>
          </div>
          <div>
            <dt>Shipping</dt>
            <dd>{formatProductPrice(session.shipping)}</dd>
          </div>
          <div>
            <dt>Tax</dt>
            <dd>
              {session.taxConfigured
                ? formatProductPrice(session.tax)
                : unavailableLabel()}
            </dd>
          </div>
          <div className="checkout-summary-total">
            <dt>Total</dt>
            <dd>{formatProductPrice(session.total)}</dd>
          </div>
        </dl>
      </aside>
    );
  }

  const subtotalLabel = cart.subtotal ? formatProductPrice(cart.subtotal) : unavailableLabel();

  return (
    <aside className="checkout-summary" aria-labelledby="checkout-summary-heading">
      <h2 id="checkout-summary-heading" className="checkout-summary-heading">
        Order summary
      </h2>
      <p className="checkout-summary-intro">Your selected pieces</p>

      <ul className="checkout-summary-items">
        {cart.items.map((item) => {
          const priceLabel = item.unitPrice ? formatProductPrice(item.unitPrice) : null;

          return (
            <li key={item.id} className="checkout-summary-item">
              <Link href={item.href} className="checkout-summary-image">
                <Image
                  src={item.imageSrc}
                  alt={item.imageAlt}
                  fill
                  unoptimized
                  sizes="80px"
                  className="object-contain object-center p-2"
                />
              </Link>
              <div className="min-w-0">
                <p className="checkout-summary-name">
                  <Link href={item.href}>{item.productName}</Link>
                </p>
                {item.variantName ? (
                  <p className="checkout-summary-meta">{item.variantName}</p>
                ) : null}
                <p className="checkout-summary-meta">Qty: {item.quantity}</p>
                {priceLabel ? <p className="checkout-summary-meta">{priceLabel}</p> : null}
              </div>
            </li>
          );
        })}
      </ul>

      <dl className="checkout-summary-rows">
        <div>
          <dt>Subtotal</dt>
          <dd>{subtotalLabel}</dd>
        </div>
        <div>
          <dt>Shipping</dt>
          <dd>{unavailableLabel()}</dd>
        </div>
        <div>
          <dt>Tax</dt>
          <dd>{unavailableLabel()}</dd>
        </div>
        <div className="checkout-summary-total">
          <dt>Total</dt>
          <dd>{unavailableLabel()}</dd>
        </div>
      </dl>

      {cart.source === 'presentation' ? (
        <p className="checkout-summary-note">
          This is a local preview. These pieces have not been saved to a
          server checkout.
        </p>
      ) : null}
    </aside>
  );
}
