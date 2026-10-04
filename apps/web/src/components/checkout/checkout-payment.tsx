import { formatProductPrice } from '@/lib/catalogue/product';
import { PAYMENT_UNAVAILABLE_COPY } from '@/lib/checkout/presentation';
import { PAYMENT_READY_TITLE, paymentReadyCopy } from '@/lib/payment/presentation';
import type { PaymentPresentation } from '@/lib/payment/types';

type CheckoutPaymentProps = {
  payment: PaymentPresentation;
};

export function CheckoutPayment({ payment }: CheckoutPaymentProps) {
  const intent = payment.intent;
  const isReady = payment.uiStatus === 'requires-payment' && intent;

  return (
    <section className="checkout-section" aria-labelledby="checkout-payment-heading">
      <h2 id="checkout-payment-heading" className="checkout-section-heading">
        Payment
      </h2>
      {isReady ? (
        <div className="checkout-payment-ready">
          <p className="checkout-payment-ready-title">{PAYMENT_READY_TITLE}</p>
          <p className="checkout-payment-copy">{paymentReadyCopy(intent)}</p>
          <dl className="checkout-payment-meta">
            <div>
              <dt>Payment status</dt>
              <dd>{payment.backendStatus}</dd>
            </div>
            <div>
              <dt>Amount</dt>
              <dd>{formatProductPrice(intent.amount)}</dd>
            </div>
            <div>
              <dt>Currency</dt>
              <dd>{intent.amount.currencyCode}</dd>
            </div>
            <div>
              <dt>Payment reference</dt>
              <dd>{intent.id}</dd>
            </div>
          </dl>
        </div>
      ) : (
        <p className="checkout-payment-copy">{PAYMENT_UNAVAILABLE_COPY}</p>
      )}
    </section>
  );
}
