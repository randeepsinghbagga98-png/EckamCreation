import type { FormEvent } from 'react';
import type { AddressFormValues } from '@/lib/account/types';
import { AccountField } from './account-field';

type AccountAddressFormProps = {
  id: string;
  values: AddressFormValues;
  errors: Partial<Record<keyof AddressFormValues, string>>;
  pending: boolean;
  countryReady: boolean;
  countryNote: string;
  submitLabel: string;
  onChange: (values: AddressFormValues) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel?: () => void;
};

export function AccountAddressForm({
  id,
  values,
  errors,
  pending,
  countryReady,
  countryNote,
  submitLabel,
  onChange,
  onSubmit,
  onCancel,
}: AccountAddressFormProps) {
  return (
    <form className="account-form" onSubmit={onSubmit} noValidate>
      <AccountField
        id={`${id}-fullName`}
        name="fullName"
        label="Full name"
        autoComplete="name"
        required
        value={values.fullName}
        error={errors.fullName}
        disabled={pending}
        onChange={(event) => onChange({ ...values, fullName: event.target.value })}
      />
      <AccountField
        id={`${id}-phone`}
        name="phone"
        label="Phone"
        type="tel"
        autoComplete="tel"
        inputMode="tel"
        optional
        value={values.phone}
        error={errors.phone}
        disabled={pending}
        onChange={(event) => onChange({ ...values, phone: event.target.value })}
      />
      <AccountField
        id={`${id}-line1`}
        name="line1"
        label="Address line 1"
        autoComplete="address-line1"
        required
        value={values.line1}
        error={errors.line1}
        disabled={pending}
        onChange={(event) => onChange({ ...values, line1: event.target.value })}
      />
      <AccountField
        id={`${id}-line2`}
        name="line2"
        label="Address line 2"
        autoComplete="address-line2"
        optional
        value={values.line2}
        error={errors.line2}
        disabled={pending}
        onChange={(event) => onChange({ ...values, line2: event.target.value })}
      />
      <div className="account-form-grid">
        <AccountField
          id={`${id}-city`}
          name="city"
          label="City"
          autoComplete="address-level2"
          required
          value={values.city}
          error={errors.city}
          disabled={pending}
          onChange={(event) => onChange({ ...values, city: event.target.value })}
        />
        <AccountField
          id={`${id}-state`}
          name="state"
          label="State"
          autoComplete="address-level1"
          optional
          value={values.state}
          error={errors.state}
          disabled={pending}
          onChange={(event) => onChange({ ...values, state: event.target.value })}
        />
      </div>
      <AccountField
        id={`${id}-postalCode`}
        name="postalCode"
        label="Postal code"
        autoComplete="postal-code"
        inputMode="numeric"
        required
        value={values.postalCode}
        error={errors.postalCode}
        disabled={pending}
        onChange={(event) => onChange({ ...values, postalCode: event.target.value })}
      />
      <div className="checkout-field">
        <p className="checkout-label">Country</p>
        <p className="account-hint">{countryNote}</p>
      </div>
      <label className="checkout-checkbox">
        <input
          type="checkbox"
          name="isDefault"
          checked={values.isDefault}
          disabled={pending}
          onChange={(event) => onChange({ ...values, isDefault: event.target.checked })}
        />
        <span>Set as default address</span>
      </label>
      <div className="account-actions">
        <button
          type="submit"
          className="cart-cta cart-cta--primary"
          disabled={pending || !countryReady}
        >
          {pending ? 'Saving…' : submitLabel}
        </button>
        {onCancel ? (
          <button type="button" className="cart-cta cart-cta--ghost" onClick={onCancel} disabled={pending}>
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  );
}
