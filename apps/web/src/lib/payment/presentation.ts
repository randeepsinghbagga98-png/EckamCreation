import type { PaymentIntentDto } from '@eckamcreation/api-contracts';
import { ApiClientError } from '@/lib/api/client';
import { formatProductPrice } from '@/lib/catalogue/product';
import type { PaymentPresentation, PaymentUiStatus } from './types';

export const PAYMENT_READY_TITLE = 'Payment ready';

export const PAYMENT_RETRY_MESSAGE =
  'Payment could not be prepared. Please try again.';

export const PAYMENT_UNAVAILABLE_MESSAGE =
  'Payment is not available yet. Please try again later.';

const UNSAFE_ERROR = /prisma|sql|stack|internal|adapter|secret|webhook|credential/i;

export function createPaymentPresentation(): PaymentPresentation {
  return {
    uiStatus: 'idle',
    backendStatus: null,
    intent: null,
  };
}

export function mapPaymentIntentStatus(status: string): PaymentUiStatus {
  switch (status) {
    case 'REQUIRES_PAYMENT':
      return 'requires-payment';
    case 'PROCESSING':
      return 'pending';
    case 'SUCCEEDED':
      return 'succeeded';
    case 'FAILED':
      return 'failed';
    case 'CANCELLED':
      return 'cancelled';
    default:
      return 'error';
  }
}

export function paymentFromIntent(intent: PaymentIntentDto): PaymentPresentation {
  return {
    uiStatus: mapPaymentIntentStatus(intent.status),
    backendStatus: intent.status,
    intent,
  };
}

export function paymentReadyCopy(intent: PaymentIntentDto): string {
  return `Your order total is ${formatProductPrice(intent.amount)}. Continue to payment to complete your purchase.`;
}

export function isPaymentActionLocked(status: PaymentUiStatus): boolean {
  return status === 'creating' || status === 'requires-payment' || status === 'succeeded';
}

export function messageForPaymentError(error: unknown): string {
  if (!(error instanceof ApiClientError)) {
    return PAYMENT_RETRY_MESSAGE;
  }

  if (error.status === 401) {
    return 'A signed-in session or server cart is required to continue payment.';
  }

  if (error.status === 403) {
    return 'You are not authorized to access this payment.';
  }

  if (error.status === 409) {
    return 'This payment could not be prepared because of a payment state conflict.';
  }

  if (error.status === 503 || error.code === 'PAYMENT_PROVIDER_NOT_CONFIGURED') {
    return PAYMENT_UNAVAILABLE_MESSAGE;
  }

  if (error.status >= 500) {
    return PAYMENT_RETRY_MESSAGE;
  }

  if (error.status === 400 || error.status === 422) {
    return error.message && !UNSAFE_ERROR.test(error.message)
      ? error.message
      : 'Please review your checkout details before continuing to payment.';
  }

  return PAYMENT_RETRY_MESSAGE;
}
