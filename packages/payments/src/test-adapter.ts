import { createHmac, timingSafeEqual } from "node:crypto";
import type {
  CreatePaymentInput,
  PaymentProviderAdapter,
  PaymentProviderResult,
  RefundPaymentInput,
  RefundProviderResult,
  VerifiedWebhookEvent,
  WebhookVerificationInput,
} from "./types";
import {
  PaymentUnauthorizedWebhookError,
  PaymentValidationError,
} from "./errors";

export const TEST_PAYMENT_PROVIDER_ID = "test" as const;
export const TEST_WEBHOOK_SECRET = "test-webhook-secret" as const;

type StoredIntent = {
  amountMinor: bigint;
  currencyCode: string;
  status: PaymentProviderResult["status"];
  paymentIntentId: string;
};

/**
 * TEST ONLY — deterministic fake provider.
 * Must never be registered when NODE_ENV === "production".
 */
export class TestPaymentAdapter implements PaymentProviderAdapter {
  readonly id = TEST_PAYMENT_PROVIDER_ID;
  readonly region = "india" as const;
  readonly supportedMethods = ["upi", "card", "net-banking", "wallet"] as const;

  private readonly intents = new Map<string, StoredIntent>();
  private seq = 0;
  private mode: "success" | "failure" | "pending" = "pending";

  isConfigured(): boolean {
    return true;
  }

  /** Configure next createPayment outcome for tests. */
  setMode(mode: "success" | "failure" | "pending"): void {
    this.mode = mode;
  }

  async createPayment(input: CreatePaymentInput): Promise<PaymentProviderResult> {
    if (input.amount.amountMinor <= BigInt(0)) {
      throw new PaymentValidationError("Amount must be positive");
    }
    this.seq += 1;
    const providerPaymentId = `test_pay_${this.seq}_${input.paymentIntentId.slice(0, 8)}`;
    const status =
      this.mode === "success"
        ? "SUCCEEDED"
        : this.mode === "failure"
          ? "FAILED"
          : "PROCESSING";

    this.intents.set(providerPaymentId, {
      amountMinor: input.amount.amountMinor,
      currencyCode: input.amount.currencyCode,
      status,
      paymentIntentId: input.paymentIntentId,
    });

    return {
      providerPaymentId,
      status,
      amountMinor: input.amount.amountMinor,
      currencyCode: input.amount.currencyCode,
      metadata: { test: true },
      clientAction:
        status === "PROCESSING"
          ? { type: "pending" }
          : { type: "none" },
    };
  }

  async getPaymentStatus(providerPaymentId: string): Promise<PaymentProviderResult> {
    const row = this.intents.get(providerPaymentId);
    if (!row) throw new PaymentValidationError("Unknown test provider payment");
    return {
      providerPaymentId,
      status: row.status,
      amountMinor: row.amountMinor,
      currencyCode: row.currencyCode,
      metadata: { test: true },
    };
  }

  async verifyWebhook(input: WebhookVerificationInput): Promise<VerifiedWebhookEvent> {
    const signature = readHeader(input.headers, "x-test-signature");
    if (!signature) throw new PaymentUnauthorizedWebhookError("Missing x-test-signature");

    const expected = createHmac("sha256", TEST_WEBHOOK_SECRET)
      .update(input.rawBody)
      .digest("hex");
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new PaymentUnauthorizedWebhookError();
    }

    const payload = input.payload as {
      eventId?: string;
      eventType?: string;
      providerPaymentId?: string;
      status?: PaymentProviderResult["status"];
      amountMinor?: string;
      currencyCode?: string;
      paymentIntentId?: string;
    };

    if (!payload.eventId || !payload.providerPaymentId || !payload.status) {
      throw new PaymentValidationError("Invalid test webhook payload");
    }

    const stored = this.intents.get(payload.providerPaymentId);
    const amountMinor = payload.amountMinor
      ? BigInt(payload.amountMinor)
      : stored?.amountMinor ?? BigInt(0);
    const currencyCode = payload.currencyCode ?? stored?.currencyCode ?? "INR";

    if (stored) {
      stored.status = payload.status;
    }

    return {
      eventId: payload.eventId,
      eventType: payload.eventType ?? "payment.updated",
      providerPaymentId: payload.providerPaymentId,
      result: {
        providerPaymentId: payload.providerPaymentId,
        status: payload.status,
        amountMinor,
        currencyCode,
        metadata: {
          test: true,
          paymentIntentId: payload.paymentIntentId ?? stored?.paymentIntentId,
        },
      },
    };
  }

  async refundPayment(input: RefundPaymentInput): Promise<RefundProviderResult> {
    this.seq += 1;
    return {
      providerRefundId: `test_ref_${this.seq}`,
      status: "SUCCEEDED",
      amountMinor: input.amount.amountMinor,
      currencyCode: input.amount.currencyCode,
    };
  }

  /** Helper for tests to build a signed webhook body. */
  static signPayload(payload: unknown): { rawBody: string; signature: string } {
    const rawBody = JSON.stringify(payload);
    const signature = createHmac("sha256", TEST_WEBHOOK_SECRET).update(rawBody).digest("hex");
    return { rawBody, signature };
  }
}

function readHeader(
  headers: Headers | Record<string, string | null | undefined>,
  name: string,
): string | null {
  if (typeof (headers as Headers).get === "function") {
    return (headers as Headers).get(name);
  }
  const lower = name.toLowerCase();
  for (const [k, v] of Object.entries(headers as Record<string, string | null | undefined>)) {
    if (k.toLowerCase() === lower) return v ?? null;
  }
  return null;
}

/** Guard: never enable test provider in production. */
export function assertTestProviderAllowed(nodeEnv: string | undefined): void {
  if (nodeEnv === "production") {
    throw new PaymentValidationError("Test payment provider cannot be used in production");
  }
}
