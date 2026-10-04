import type { PaymentIntentDto } from '@eckamcreation/api-contracts';

export const PAYMENT_INTENT_STATUSES = [
  'REQUIRES_PAYMENT',
  'PROCESSING',
  'SUCCEEDED',
  'FAILED',
  'CANCELLED',
] as const;

export type PaymentIntentStatus = (typeof PAYMENT_INTENT_STATUSES)[number];

export type PaymentUiStatus =
  | 'idle'
  | 'creating'
  | 'requires-payment'
  | 'pending'
  | 'succeeded'
  | 'failed'
  | 'cancelled'
  | 'error';

export type PaymentPresentation = {
  uiStatus: PaymentUiStatus;
  backendStatus: string | null;
  intent: PaymentIntentDto | null;
};
