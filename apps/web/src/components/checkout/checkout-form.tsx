import type { FormEvent } from 'react';
import type { CheckoutAddress, CheckoutFieldErrors, CheckoutFormValues, CheckoutSessionStatus } from '@/lib/checkout/types';
import { isPaymentActionLocked } from '@/lib/payment/presentation';
import type { PaymentPresentation, PaymentUiStatus } from '@/lib/payment/types';
import { BillingSection } from './billing-section';
import { CheckoutPayment } from './checkout-payment';
import { CheckoutPendingState } from './checkout-pending-state';
import { ContactSection } from './contact-section';
import { ShippingSection } from './shipping-section';

type CheckoutFormProps = {
  values: CheckoutFormValues;
  errors: CheckoutFieldErrors;
  notice: string | null;
  sessionStatus: CheckoutSessionStatus;
  payment: PaymentPresentation;
  disabled?: boolean;
  onContactChange: (name: 'email' | 'phone', value: string) => void;
  onShippingChange: (field: keyof CheckoutAddress, value: string) => void;
  onBillingChange: (field: keyof CheckoutAddress, value: string) => void;
  onBillingToggle: (checked: boolean) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

function submitLabel(sessionStatus: CheckoutSessionStatus, paymentStatus: PaymentUiStatus) {
  if (sessionStatus === 'creating' || paymentStatus === 'creating') {
    return 'Preparing payment...';
  }
  if (paymentStatus === 'requires-payment') {
    return 'Payment ready';
  }
  return 'Continue to payment';
}

export function CheckoutForm({
  values,
  errors,
  notice,
  sessionStatus,
  payment,
  disabled,
  onContactChange,
  onShippingChange,
  onBillingChange,
  onBillingToggle,
  onSubmit,
}: CheckoutFormProps) {
  const isPreparing = sessionStatus === 'creating' || payment.uiStatus === 'creating';
  const isDisabled = disabled || isPreparing || isPaymentActionLocked(payment.uiStatus);

  return (
    <form className="checkout-form" noValidate onSubmit={onSubmit}>
      <ContactSection
        values={values}
        errors={errors}
        onChange={onContactChange}
      />
      <ShippingSection
        values={values.shipping}
        errors={errors}
        onChange={onShippingChange}
      />
      <BillingSection
        sameAsShipping={values.billingSameAsShipping}
        values={values.billing}
        errors={errors}
        onToggle={onBillingToggle}
        onChange={onBillingChange}
      />
      <CheckoutPayment payment={payment} />

      <div className="checkout-actions">
        <button
          type="submit"
          className="cart-cta cart-cta--primary w-full"
          disabled={isDisabled}
          aria-busy={isPreparing}
        >
          {submitLabel(sessionStatus, payment.uiStatus)}
        </button>
        {notice ? <CheckoutPendingState message={notice} /> : null}
      </div>
    </form>
  );
}
