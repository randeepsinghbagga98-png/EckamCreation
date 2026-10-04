import type { CheckoutSessionDto } from '@eckamcreation/api-contracts';
import type { PaymentPresentation } from '@/lib/payment/types';

export type CheckoutStatus =
  | 'loading'
  | 'ready'
  | 'empty'
  | 'validation-error'
  | 'pending'
  | 'error';

export type CheckoutSessionStatus = 'idle' | 'creating' | 'created' | 'error';

export type CheckoutAddress = {
  firstName: string;
  lastName: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

export type CheckoutFormValues = {
  email: string;
  phone: string;
  shipping: CheckoutAddress;
  billingSameAsShipping: boolean;
  billing: CheckoutAddress;
};

export type CheckoutFieldKey =
  | 'email'
  | 'phone'
  | `shipping.${keyof CheckoutAddress}`
  | `billing.${keyof CheckoutAddress}`;

export type CheckoutFieldErrors = Partial<Record<CheckoutFieldKey, string>>;

export type CheckoutPresentation = {
  status: CheckoutStatus;
  sessionStatus: CheckoutSessionStatus;
  values: CheckoutFormValues;
  errors: CheckoutFieldErrors;
  notice: string | null;
  session: CheckoutSessionDto | null;
  payment: PaymentPresentation;
};

export type CheckoutCountry = {
  code: string;
  name: string;
};
