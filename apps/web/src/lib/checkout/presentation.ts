import type { CheckoutPatchInput, CheckoutSessionDto } from '@eckamcreation/api-contracts';
import { WORLDWIDE_DESTINATIONS } from '@/components/worldwide-shopping/destinations';
import type { CartSnapshot } from '@/lib/cart/types';
import { ApiClientError } from '@/lib/api/client';
import { createPaymentPresentation } from '@/lib/payment/presentation';
import type {
  CheckoutAddress,
  CheckoutCountry,
  CheckoutFieldErrors,
  CheckoutFormValues,
  CheckoutPresentation,
} from './types';

export const CHECKOUT_COUNTRIES: CheckoutCountry[] = WORLDWIDE_DESTINATIONS.map(
  (destination) => ({
    code: destination.countryCode,
    name: destination.name,
  }),
);

export const LOCAL_PREVIEW_CHECKOUT_MESSAGE =
  'Your current selection is a local preview and is not yet available to the server checkout.';

export const CHECKOUT_CREATED_TITLE = 'Checkout session created';

export const CHECKOUT_CREATED_MESSAGE =
  'Your checkout is ready for the next payment step.';

export const SHIPPING_UNAVAILABLE_MESSAGE =
  'Shipping is not available for this destination yet.';

export const PAYMENT_UNAVAILABLE_COPY =
  'Payment will be available once checkout and payment services are connected.';

export const CHECKOUT_RETRY_MESSAGE =
  'Checkout could not be created. Please try again.';

const ISO_COUNTRY = /^[A-Za-z]{2,3}$/;

export function createEmptyAddress(): CheckoutAddress {
  return {
    firstName: '',
    lastName: '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
  };
}

export function createEmptyCheckoutForm(): CheckoutFormValues {
  return {
    email: '',
    phone: '',
    shipping: createEmptyAddress(),
    billingSameAsShipping: true,
    billing: createEmptyAddress(),
  };
}

export function createCheckoutPresentation(): CheckoutPresentation {
  return {
    status: 'ready',
    sessionStatus: 'idle',
    values: createEmptyCheckoutForm(),
    errors: {},
    notice: null,
    session: null,
    payment: createPaymentPresentation(),
  };
}

export function canCreateServerCheckout(cart: CartSnapshot): boolean {
  return (
    cart.source === 'api' &&
    cart.items.length > 0 &&
    cart.items.every((item) => Boolean(item.variantId))
  );
}

export function isDatabaseCountryId(value: string): boolean {
  return Boolean(value.trim()) && !ISO_COUNTRY.test(value.trim());
}

export function toCheckoutCreateInput(values: CheckoutFormValues, currency?: string) {
  return {
    currency: currency && currency.length === 3 ? currency : undefined,
    country: values.shipping.country || undefined,
  };
}

/**
 * Guest PATCH payload. ISO-2/3 country codes are resolved to Country.id
 * by CheckoutService.resolveAddressCountryId.
 */
export function toCheckoutGuestAddress(
  address: CheckoutAddress,
  phone?: string,
): CheckoutPatchInput['shippingAddress'] | null {
  const countryId = address.country.trim();
  if (!countryId || !address.line1.trim() || !address.city.trim() || !address.postalCode.trim()) {
    return null;
  }

  return {
    fullName: `${address.firstName} ${address.lastName}`.trim(),
    phone: phone?.trim() || undefined,
    line1: address.line1,
    line2: address.line2 || undefined,
    city: address.city,
    state: address.state || undefined,
    postalCode: address.postalCode,
    countryId: ISO_COUNTRY.test(countryId) ? countryId.toUpperCase() : countryId,
  };
}

export function firstShippingMethodId(session: CheckoutSessionDto): string | null {
  return session.shippingMethodId ?? session.shippingOptions?.[0]?.methodId ?? null;
}

export function isCheckoutReadyForPayment(session: CheckoutSessionDto): boolean {
  return session.status === 'PAYMENT' && session.paymentStatus === 'READY_FOR_PAYMENT';
}

export function firstErrorMessage(errors: CheckoutFieldErrors): string | null {
  return Object.values(errors).find(Boolean) ?? null;
}

export function messageForCheckoutError(error: unknown): string {
  if (!(error instanceof ApiClientError)) {
    return CHECKOUT_RETRY_MESSAGE;
  }

  if (error.status === 401) {
    return 'A signed-in session or server cart is required to continue checkout.';
  }

  if (error.status === 409) {
    return 'This checkout could not be updated. Please review your selection and try again.';
  }

  if (error.status >= 500) {
    return CHECKOUT_RETRY_MESSAGE;
  }

  if (error.status === 400 || error.status === 422) {
    return error.message && !/prisma|sql|stack|internal/i.test(error.message)
      ? error.message
      : 'Please review the highlighted fields before continuing.';
  }

  return CHECKOUT_RETRY_MESSAGE;
}
