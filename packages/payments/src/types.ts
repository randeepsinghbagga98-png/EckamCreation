export type PaymentRegion = "india" | "international";

export type PaymentMethodCode =
  | "upi"
  | "card"
  | "net-banking"
  | "wallet"
  | "cod"
  | "international-card"
  | "other";

export type MoneyAmount = {
  amountMinor: bigint;
  currencyCode: string;
};

/** Normalized provider result — never leak raw provider payloads into commerce. */
export type PaymentProviderResult = {
  providerPaymentId: string;
  status: "REQUIRES_PAYMENT" | "PROCESSING" | "SUCCEEDED" | "FAILED" | "CANCELLED";
  amountMinor: bigint;
  currencyCode: string;
  metadata?: Record<string, unknown>;
  clientAction?: {
    type: "redirect" | "none" | "pending";
    redirectUrl?: string;
  };
};

export type CreatePaymentInput = {
  paymentIntentId: string;
  amount: MoneyAmount;
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
  returnUrl?: string;
};

export type RefundPaymentInput = {
  paymentIntentId: string;
  providerPaymentId: string;
  amount: MoneyAmount;
  idempotencyKey?: string;
  reason?: string;
};

export type RefundProviderResult = {
  providerRefundId: string;
  status: "PENDING" | "SUCCEEDED" | "FAILED" | "CANCELLED";
  amountMinor: bigint;
  currencyCode: string;
};

export type WebhookVerificationInput = {
  headers: Headers | Record<string, string | null | undefined>;
  rawBody: string;
  payload: unknown;
};

export type VerifiedWebhookEvent = {
  eventId: string;
  eventType: string;
  providerPaymentId: string;
  result: PaymentProviderResult;
};

/**
 * Stable provider adapter boundary.
 * Implementations: future PhonePe/Cashfree/Razorpay/Stripe — never imported by OrderService.
 */
export interface PaymentProviderAdapter {
  readonly id: string;
  readonly region: PaymentRegion;
  readonly supportedMethods: readonly PaymentMethodCode[];
  isConfigured(): boolean;
  createPayment(input: CreatePaymentInput): Promise<PaymentProviderResult>;
  getPaymentStatus(providerPaymentId: string): Promise<PaymentProviderResult>;
  verifyWebhook(input: WebhookVerificationInput): Promise<VerifiedWebhookEvent>;
  refundPayment(input: RefundPaymentInput): Promise<RefundProviderResult>;
}
