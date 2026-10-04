import type {
  CheckoutAddress,
  CheckoutFieldErrors,
  CheckoutFieldKey,
  CheckoutFormValues,
} from './types';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[+()\d\s.-]{7,20}$/;

function required(value: string, label: string): string | undefined {
  if (!value.trim()) {
    return `${label} is required.`;
  }

  return undefined;
}

function validateAddress(
  address: CheckoutAddress,
  prefix: 'shipping' | 'billing',
): CheckoutFieldErrors {
  const errors: CheckoutFieldErrors = {};

  const fields: Array<[keyof CheckoutAddress, string, boolean]> = [
    ['firstName', 'First name', true],
    ['lastName', 'Last name', true],
    ['line1', 'Address line 1', true],
    ['line2', 'Address line 2', false],
    ['city', 'City', true],
    ['state', 'State / Province', true],
    ['postalCode', 'Postal / ZIP code', true],
    ['country', 'Country', true],
  ];

  for (const [key, label, isRequired] of fields) {
    if (!isRequired) {
      continue;
    }

    const message = required(address[key], label);
    if (message) {
      errors[`${prefix}.${key}` as CheckoutFieldKey] = message;
    }
  }

  return errors;
}

export function validateCheckoutForm(values: CheckoutFormValues): CheckoutFieldErrors {
  const errors: CheckoutFieldErrors = {};

  const emailRequired = required(values.email, 'Email address');
  if (emailRequired) {
    errors.email = emailRequired;
  } else if (!EMAIL_PATTERN.test(values.email.trim())) {
    errors.email = 'Enter a valid email address.';
  }

  const phoneRequired = required(values.phone, 'Phone number');
  if (phoneRequired) {
    errors.phone = phoneRequired;
  } else if (!PHONE_PATTERN.test(values.phone.trim())) {
    errors.phone = 'Enter a valid phone number.';
  }

  Object.assign(errors, validateAddress(values.shipping, 'shipping'));

  if (!values.billingSameAsShipping) {
    Object.assign(errors, validateAddress(values.billing, 'billing'));
  }

  return errors;
}
