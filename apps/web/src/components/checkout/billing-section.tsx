import type { ChangeEvent } from 'react';
import { CHECKOUT_COUNTRIES } from '@/lib/checkout/presentation';
import type { CheckoutAddress, CheckoutFieldErrors } from '@/lib/checkout/types';
import { CheckoutField, CheckoutSelect } from './checkout-field';

type BillingSectionProps = {
  sameAsShipping: boolean;
  values: CheckoutAddress;
  errors: CheckoutFieldErrors;
  onToggle: (checked: boolean) => void;
  onChange: (field: keyof CheckoutAddress, value: string) => void;
};

export function BillingSection({
  sameAsShipping,
  values,
  errors,
  onToggle,
  onChange,
}: BillingSectionProps) {
  const handleChange = (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    onChange(event.target.name as keyof CheckoutAddress, event.target.value);
  };

  return (
    <section className="checkout-section" aria-labelledby="checkout-billing-heading">
      <h2 id="checkout-billing-heading" className="checkout-section-heading">
        Billing address
      </h2>
      <div className="checkout-checkbox">
        <input
          id="checkout-billing-same"
          name="billingSameAsShipping"
          type="checkbox"
          checked={sameAsShipping}
          onChange={(event) => onToggle(event.target.checked)}
        />
        <label htmlFor="checkout-billing-same">
          Billing address is the same as shipping address
        </label>
      </div>

      {!sameAsShipping ? (
        <div className="checkout-grid mt-6">
          <CheckoutField
            id="checkout-billing-first-name"
            name="firstName"
            label="First name"
            autoComplete="billing given-name"
            required
            value={values.firstName}
            error={errors['billing.firstName']}
            onChange={handleChange}
          />
          <CheckoutField
            id="checkout-billing-last-name"
            name="lastName"
            label="Last name"
            autoComplete="billing family-name"
            required
            value={values.lastName}
            error={errors['billing.lastName']}
            onChange={handleChange}
          />
          <CheckoutField
            id="checkout-billing-line1"
            name="line1"
            label="Address line 1"
            autoComplete="billing address-line1"
            required
            value={values.line1}
            error={errors['billing.line1']}
            onChange={handleChange}
          />
          <CheckoutField
            id="checkout-billing-line2"
            name="line2"
            label="Address line 2"
            autoComplete="billing address-line2"
            optional
            value={values.line2}
            error={errors['billing.line2']}
            onChange={handleChange}
          />
          <CheckoutField
            id="checkout-billing-city"
            name="city"
            label="City"
            autoComplete="billing address-level2"
            required
            value={values.city}
            error={errors['billing.city']}
            onChange={handleChange}
          />
          <CheckoutField
            id="checkout-billing-state"
            name="state"
            label="State / Province"
            autoComplete="billing address-level1"
            required
            value={values.state}
            error={errors['billing.state']}
            onChange={handleChange}
          />
          <CheckoutField
            id="checkout-billing-postal"
            name="postalCode"
            label="Postal / ZIP code"
            autoComplete="billing postal-code"
            required
            value={values.postalCode}
            error={errors['billing.postalCode']}
            onChange={handleChange}
          />
          <CheckoutSelect
            id="checkout-billing-country"
            name="country"
            label="Country"
            autoComplete="billing country"
            required
            value={values.country}
            error={errors['billing.country']}
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
      ) : null}
    </section>
  );
}
