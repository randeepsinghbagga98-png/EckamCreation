import type { ChangeEvent } from 'react';
import type { CheckoutFieldErrors, CheckoutFormValues } from '@/lib/checkout/types';
import { CheckoutField } from './checkout-field';

type ContactSectionProps = {
  values: CheckoutFormValues;
  errors: CheckoutFieldErrors;
  onChange: (name: 'email' | 'phone', value: string) => void;
};

export function ContactSection({ values, errors, onChange }: ContactSectionProps) {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.name as 'email' | 'phone', event.target.value);
  };

  return (
    <section className="checkout-section" aria-labelledby="checkout-contact-heading">
      <h2 id="checkout-contact-heading" className="checkout-section-heading">
        Contact information
      </h2>
      <div className="checkout-grid">
        <CheckoutField
          id="checkout-email"
          name="email"
          label="Email address"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          value={values.email}
          error={errors.email}
          onChange={handleChange}
        />
        <CheckoutField
          id="checkout-phone"
          name="phone"
          label="Phone number"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          required
          value={values.phone}
          error={errors.phone}
          onChange={handleChange}
        />
      </div>
    </section>
  );
}
