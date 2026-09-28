export type {
  PaymentRegion,
  PaymentMethodCode,
  MoneyAmount,
  PaymentProviderResult,
  CreatePaymentInput,
  RefundPaymentInput,
  RefundProviderResult,
  WebhookVerificationInput,
  VerifiedWebhookEvent,
  PaymentProviderAdapter,
} from "./types";

export {
  PaymentError,
  PaymentProviderNotConfiguredError,
  PaymentConflictError,
  PaymentValidationError,
  PaymentNotFoundError,
  PaymentUnauthorizedWebhookError,
} from "./errors";

export { PaymentStateService, type PaymentIntentStatusValue } from "./state";
export { PaymentProviderRegistry } from "./registry";
export {
  TestPaymentAdapter,
  TEST_PAYMENT_PROVIDER_ID,
  TEST_WEBHOOK_SECRET,
  assertTestProviderAllowed,
} from "./test-adapter";
export { PaymentService, type PaymentServiceDeps } from "./payment-service";

/** Legacy stub kept for compatibility — prefer PaymentProviderRegistry. */
export type PaymentProvider = {
  readonly id: string;
  readonly region: import("./types").PaymentRegion;
  isConfigured(): boolean;
};

export function createPaymentProviderRegistry(): PaymentProvider[] {
  return [];
}
