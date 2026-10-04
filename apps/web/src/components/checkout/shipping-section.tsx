import type { ChangeEvent } from 'react';
import { CHECKOUT_COUNTRIES } from '@/lib/checkout/presentation';
import type { CheckoutAddress, CheckoutFieldErrors } from '@/lib/checkout/types';
import { CheckoutField, CheckoutSelect } from './checkout-field';

type ShippingSectionProps = {
  values: CheckoutAddress;
  errors: CheckoutFieldErrors;
  onChange: (field: keyof CheckoutAddress, value: string) => void;
};

export function ShippingSection({ values, errors, onChange }: ShippingSectionProps) {
  const handleChange = (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    onChange(event.target.name as keyof CheckoutAddress, event.target.value);
  };

  return (
    <section className="checkout-section" aria-labelledby="checkout-shipping-heading">
      <h2 id="checkout-shipping-heading" className="checkout-section-heading">
        Shipping address
      </h2>
      <div className="checkout-grid">
        <CheckoutField
          id="checkout-shipping-first-name"
          name="firstName"
          label="First name"
          autoComplete="given-name"
          required
          value={values.firstName}
          error={errors['shipping.firstName']}
          onChange={handleChange}
        />
        <CheckoutField
          id="checkout-shipping-last-name"
          name="lastName"
          label="Last name"
          autoComplete="family-name"
          required
          value={values.lastName}
          error={errors['shipping.lastName']}
          onChange={handleChange}
        />
        <CheckoutField
          id="checkout-shipping-line1"
          name="line1"
          label="Address line 1"
          autoComplete="address-line1"
          required
          value={values.line1}
          error={errors['shipping.line1']}
          onChange={handleChange}
        />
        <CheckoutField
          id="checkout-shipping-line2"
          name="line2"
          label="Address line 2"
          autoComplete="address-line2"
          optional
          value={values.line2}
          error={errors['shipping.line2']}
          onChange={handleChange}
        />
        <CheckoutField
          id="checkout-shipping-city"
          name="city"
          label="City"
          autoComplete="address-level2"
          required
          value={values.city}
          error={errors['shipping.city']}
          onChange={handleChange}
        />
        <CheckoutField
          id="checkout-shipping-state"
          name="state"
          label="State / Province"
          autoComplete="address-level1"
          required
          value={values.state}
          error={errors['shipping.state']}
          onChange={handleChange}
        />
        <CheckoutField
          id="checkout-shipping-postal"
          name="postalCode"
          label="Postal / ZIP code"
          autoComplete="postal-code"
          required
          value={values.postalCode}
          error={errors['shipping.postalCode']}
          onChange={handleChange}
        />
        <CheckoutSelect
          id="checkout-shipping-country"
          name="country"
          label="Country"
          autoComplete="country"
          required
          value={values.country}
          error={errors['shipping.country']}
          onChange={handleChange}
        >
          <option value="">Select a country</option>
          {CHECKOUT_COUNTRIES.map((country) => (
            <option key={country.code} value={country.code}>
              {country.name}
            </option>
          ))}
        </CheckoutSelect>
      </div>
      <p className="checkout-hint">
        This destination list is a preview. Shipping availability is confirmed
        later.
      </p>
    </section>
  );
}
