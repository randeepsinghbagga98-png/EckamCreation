import { createHash } from "node:crypto";
import type { Prisma, PrismaClient } from "@eckamcreation/database";
import type { PaymentProviderRegistry } from "./registry";
import { PaymentStateService } from "./state";
import {
  PaymentConflictError,
  PaymentNotFoundError,
  PaymentProviderNotConfiguredError,
  PaymentValidationError,
} from "./errors";
import type { PaymentProviderResult } from "./types";
import { assertTestProviderAllowed, TEST_PAYMENT_PROVIDER_ID } from "./test-adapter";

export type PaymentServiceDeps = {
  prisma: PrismaClient;
  registry: PaymentProviderRegistry;
  /** Invoked after PaymentIntent becomes SUCCEEDED (order creation boundary). */
  onPaymentSucceeded?: (paymentIntentId: string) => Promise<void>;
  /** Allow registering/using test provider (must be false in production). */
  allowTestProvider?: boolean;
  nodeEnv?: string;
};

function asMeta(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function hashPayload(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export class PaymentService {
  private readonly state = new PaymentStateService();

  constructor(private readonly deps: PaymentServiceDeps) {}

  /**
   * Create PaymentIntent from authoritative CheckoutSession totals.
   * Client amount/currency are never trusted.
   */
  async createIntent(input: {
    checkoutSessionId: string;
    idempotencyKey?: string;
    preferredProvider?: string;
    userId?: string | null;
    guestToken?: string | null;
  }) {
    const session = await this.deps.prisma.checkoutSession.findUnique({
      where: { id: input.checkoutSessionId },
      include: { cart: true },
    });
    if (!session) throw new PaymentNotFoundError("Checkout session not found");

    this.assertCheckoutOwnership(session, input);

    if (session.expiresAt.getTime() < Date.now()) {
      throw new PaymentValidationError("Checkout session has expired");
    }
    if (session.status !== "PAYMENT" || session.paymentStatus !== "READY_FOR_PAYMENT") {
      throw new PaymentValidationError("Checkout is not ready for payment");
    }
    if (session.convertedOrderId) {
      throw new PaymentConflictError("Checkout already converted to an order");
    }
    if (session.totalMinor <= BigInt(0)) {
      throw new PaymentValidationError("Checkout total must be positive");
    }

    const idemKey = input.idempotencyKey ?? `checkout:${session.id}`;
    const existing = await this.deps.prisma.paymentIntent.findUnique({
      where: { idempotencyKey: idemKey },
    });
    if (existing) {
      if (existing.status === "SUCCEEDED") {
        throw new PaymentConflictError("Checkout already has a successful payment");
      }
      return this.toDto(existing);
    }

    const succeeded = await this.deps.prisma.paymentIntent.findFirst({
      where: {
        status: "SUCCEEDED",
        metadata: { path: ["checkoutSessionId"], equals: session.id },
      },
    });
    if (succeeded) {
      throw new PaymentConflictError("Checkout already has a successful payment");
    }

    const providerId = input.preferredProvider ?? "pending";
    if (providerId === TEST_PAYMENT_PROVIDER_ID) {
      assertTestProviderAllowed(this.deps.nodeEnv ?? process.env.NODE_ENV);
      if (!this.deps.allowTestProvider) {
        throw new PaymentValidationError("Test payment provider is not enabled");
      }
    }

    try {
      const intent = await this.deps.prisma.paymentIntent.create({
        data: {
          provider: providerId,
          amountMinor: session.totalMinor,
          currencyCode: session.currencyCode,
          status: "REQUIRES_PAYMENT",
          idempotencyKey: idemKey,
          metadata: {
            checkoutSessionId: session.id,
            purpose: "checkout",
            userId: session.userId,
          },
        },
      });
      await this.audit("payment.intent.created", intent.id, {
        checkoutSessionId: session.id,
        amountMinor: intent.amountMinor.toString(),
        currencyCode: intent.currencyCode,
        provider: intent.provider,
        userId: session.userId,
      });
      return this.toDto(intent);
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        (error as { code: string }).code === "P2002"
      ) {
        const raced = await this.deps.prisma.paymentIntent.findUnique({
          where: { idempotencyKey: idemKey },
        });
        if (raced) return this.toDto(raced);
      }
      throw error;
    }
  }

  async getIntent(
    id: string,
    opts?: { userId?: string | null; guestToken?: string | null; staff?: boolean },
  ) {
    const intent = await this.deps.prisma.paymentIntent.findUnique({ where: { id } });
    if (!intent) throw new PaymentNotFoundError();
    if (!opts?.staff) {
      await this.assertIntentOwnership(intent, opts);
    }
    return this.toDto(intent);
  }

  /**
   * Initiate provider payment. Does not mark SUCCEEDED unless provider returns SUCCEEDED
   * synchronously (test adapter only in non-prod).
   */
  async initiatePayment(input: {
    paymentIntentId: string;
    userId?: string | null;
    guestToken?: string | null;
    preferredProvider?: string;
  }) {
    const intent = await this.deps.prisma.paymentIntent.findUnique({
      where: { id: input.paymentIntentId },
    });
    if (!intent) throw new PaymentNotFoundError();
    await this.assertIntentOwnership(intent, input);

    if (intent.status === "SUCCEEDED") {
      return {
        paymentIntentId: intent.id,
        status: intent.status,
        provider: intent.provider,
        clientAction: null as null,
      };
    }
    if (intent.status === "FAILED" || intent.status === "CANCELLED") {
      throw new PaymentConflictError(`Payment intent is ${intent.status}`);
    }

    const adapter = this.deps.registry.resolve(
      input.preferredProvider ?? (intent.provider !== "pending" ? intent.provider : null),
    );

    if (adapter.id === TEST_PAYMENT_PROVIDER_ID) {
      assertTestProviderAllowed(this.deps.nodeEnv ?? process.env.NODE_ENV);
      if (!this.deps.allowTestProvider) {
        throw new PaymentValidationError("Test payment provider is not enabled");
      }
    }

    const result = await adapter.createPayment({
      paymentIntentId: intent.id,
      amount: { amountMinor: intent.amountMinor, currencyCode: intent.currencyCode },
      idempotencyKey: intent.idempotencyKey ?? intent.id,
      metadata: asMeta(intent.metadata),
    });
    this.assertAmountMatch(intent, result);

    // Move REQUIRES_PAYMENT → PROCESSING first when needed
    if (intent.status === "REQUIRES_PAYMENT") {
      this.state.assertTransition("REQUIRES_PAYMENT", "PROCESSING");
      await this.deps.prisma.paymentIntent.update({
        where: { id: intent.id },
        data: {
          status: "PROCESSING",
          provider: adapter.id,
          providerIntentId: result.providerPaymentId,
          metadata: {
            ...asMeta(intent.metadata),
            lastProviderMeta: sanitizeMeta(result.metadata),
          },
        },
      });
      await this.audit("payment.processing", intent.id, {
        provider: adapter.id,
        amountMinor: intent.amountMinor.toString(),
        currencyCode: intent.currencyCode,
      });
    } else {
      await this.deps.prisma.paymentIntent.update({
        where: { id: intent.id },
        data: {
          provider: adapter.id,
          providerIntentId: result.providerPaymentId,
          metadata: {
            ...asMeta(intent.metadata),
            lastProviderMeta: sanitizeMeta(result.metadata),
          },
        },
      });
    }

    if (result.status === "SUCCEEDED" || result.status === "FAILED" || result.status === "CANCELLED") {
      await this.applyProviderResult(intent.id, result);
    } else {
      await this.deps.prisma.paymentTransaction.create({
        data: {
          paymentIntentId: intent.id,
          provider: adapter.id,
          providerTxnId: `${result.providerPaymentId}:init`,
          amountMinor: result.amountMinor,
          currencyCode: result.currencyCode,
          status: "PENDING",
          metadata: sanitizeMeta(result.metadata),
        },
      });
    }

    const refreshed = await this.deps.prisma.paymentIntent.findUniqueOrThrow({
      where: { id: intent.id },
    });
    return {
      paymentIntentId: refreshed.id,
      status: refreshed.status,
      provider: refreshed.provider,
      clientAction: result.clientAction ?? null,
    };
  }

  async handleWebhook(input: {
    provider: string;
    headers: Headers | Record<string, string | null | undefined>;
    rawBody: string;
    payload: unknown;
  }) {
    if (input.provider === TEST_PAYMENT_PROVIDER_ID) {
      assertTestProviderAllowed(this.deps.nodeEnv ?? process.env.NODE_ENV);
      if (!this.deps.allowTestProvider) {
        throw new PaymentValidationError("Test payment provider is not enabled");
      }
    }

    const adapter = this.deps.registry.get(input.provider);
    if (!adapter || !adapter.isConfigured()) {
      throw new PaymentProviderNotConfiguredError(input.provider);
    }

    const verified = await adapter.verifyWebhook({
      headers: input.headers,
      rawBody: input.rawBody,
      payload: input.payload,
    });

    const payloadHash = hashPayload(input.rawBody);

    try {
      await this.deps.prisma.webhookEvent.create({
        data: {
          provider: input.provider,
          eventId: verified.eventId,
          eventType: verified.eventType,
          payloadHash,
          payload: sanitizeMeta(input.payload as Record<string, unknown>),
          status: "RECEIVED",
        },
      });
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        (error as { code: string }).code === "P2002"
      ) {
        return { received: true as const, duplicate: true, eventId: verified.eventId, processed: false };
      }
      throw error;
    }

    try {
      await this.applyProviderResultByProviderPaymentId(
        input.provider,
        verified.providerPaymentId,
        verified.result,
      );
      await this.deps.prisma.webhookEvent.update({
        where: {
          provider_eventId: { provider: input.provider, eventId: verified.eventId },
        },
        data: { status: "PROCESSED", processedAt: new Date() },
      });
      return { received: true as const, duplicate: false, eventId: verified.eventId, processed: true };
    } catch (error) {
      await this.deps.prisma.webhookEvent.update({
        where: {
          provider_eventId: { provider: input.provider, eventId: verified.eventId },
        },
        data: {
          status: "FAILED",
          error: error instanceof Error ? error.message : "webhook processing failed",
        },
      });
      throw error;
    }
  }

  async createRefund(input: {
    paymentIntentId: string;
    amountMinor?: bigint;
    reason?: string;
    idempotencyKey?: string;
    staffUserId?: string;
  }) {
    const intent = await this.deps.prisma.paymentIntent.findUnique({
      where: { id: input.paymentIntentId },
      include: { refunds: true },
    });
    if (!intent) throw new PaymentNotFoundError();
    if (intent.status !== "SUCCEEDED") {
      throw new PaymentValidationError("Only succeeded payments can be refunded");
    }
    if (!intent.orderId) {
      throw new PaymentValidationError("Payment is not linked to an order");
    }
    if (!intent.providerIntentId) {
      throw new PaymentValidationError("Missing provider payment reference");
    }

    if (input.idempotencyKey) {
      const replayed = intent.refunds.find((r) => {
        const meta = asMeta(r.metadata);
        return meta.idempotencyKey === input.idempotencyKey;
      });
      if (replayed) {
        return {
          id: replayed.id,
          orderId: replayed.orderId,
          paymentIntentId: replayed.paymentIntentId,
          status: replayed.status,
          amountMinor: replayed.amountMinor,
          currencyCode: replayed.currencyCode,
          reason: replayed.reason,
        };
      }
    }

    const already = intent.refunds
      .filter((r) => r.status === "SUCCEEDED" || r.status === "PENDING")
      .reduce((sum, r) => sum + r.amountMinor, BigInt(0));
    const refundAmount = input.amountMinor ?? intent.amountMinor - already;
    if (refundAmount <= BigInt(0)) {
      throw new PaymentValidationError("Refund amount must be positive");
    }
    if (already + refundAmount > intent.amountMinor) {
      throw new PaymentValidationError("Refund exceeds refundable amount");
    }

    const adapter = this.deps.registry.get(intent.provider);
    if (!adapter || !adapter.isConfigured()) {
      throw new PaymentProviderNotConfiguredError(intent.provider);
    }

    await this.audit("payment.refund.initiated", intent.id, {
      amountMinor: refundAmount.toString(),
      currencyCode: intent.currencyCode,
      staffUserId: input.staffUserId,
    });

    const result = await adapter.refundPayment({
      paymentIntentId: intent.id,
      providerPaymentId: intent.providerIntentId,
      amount: { amountMinor: refundAmount, currencyCode: intent.currencyCode },
      idempotencyKey: input.idempotencyKey,
      reason: input.reason,
    });

    try {
      const refund = await this.deps.prisma.refund.create({
        data: {
          orderId: intent.orderId,
          paymentIntentId: intent.id,
          provider: intent.provider,
          providerRefundId: result.providerRefundId,
          amountMinor: result.amountMinor,
          currencyCode: result.currencyCode,
          status: result.status,
          reason: input.reason,
          metadata: {
            staffUserId: input.staffUserId,
            idempotencyKey: input.idempotencyKey,
          },
        },
      });
      await this.audit("payment.refund.completed", intent.id, {
        refundId: refund.id,
        status: refund.status,
        amountMinor: refund.amountMinor.toString(),
        currencyCode: refund.currencyCode,
      });
      return {
        id: refund.id,
        orderId: refund.orderId,
        paymentIntentId: refund.paymentIntentId,
        status: refund.status,
        amountMinor: refund.amountMinor,
        currencyCode: refund.currencyCode,
        reason: refund.reason,
      };
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        (error as { code: string }).code === "P2002" &&
        result.providerRefundId
      ) {
        const raced = await this.deps.prisma.refund.findFirst({
          where: { provider: intent.provider, providerRefundId: result.providerRefundId },
        });
        if (raced) {
          return {
            id: raced.id,
            orderId: raced.orderId,
            paymentIntentId: raced.paymentIntentId,
            status: raced.status,
            amountMinor: raced.amountMinor,
            currencyCode: raced.currencyCode,
            reason: raced.reason,
          };
        }
      }
      throw error;
    }
  }

  async cancelIntent(
    paymentIntentId: string,
    opts?: { userId?: string | null; guestToken?: string | null; staff?: boolean },
  ) {
    const intent = await this.deps.prisma.paymentIntent.findUnique({
      where: { id: paymentIntentId },
    });
    if (!intent) throw new PaymentNotFoundError();
    if (!opts?.staff) await this.assertIntentOwnership(intent, opts);
    this.state.assertTransition(intent.status, "CANCELLED");
    const updated = await this.deps.prisma.paymentIntent.update({
      where: { id: intent.id },
      data: { status: "CANCELLED" },
    });
    await this.audit("payment.cancelled", intent.id, { from: intent.status });
    return this.toDto(updated);
  }

  private async applyProviderResultByProviderPaymentId(
    provider: string,
    providerPaymentId: string,
    result: PaymentProviderResult,
  ) {
    const intent = await this.deps.prisma.paymentIntent.findFirst({
      where: {
        provider,
        OR: [
          { providerIntentId: providerPaymentId },
          // fallback: metadata paymentIntentId from test webhooks
        ],
      },
    });
    if (!intent) {
      const metaIntentId = result.metadata?.paymentIntentId;
      if (typeof metaIntentId === "string") {
        await this.applyProviderResult(metaIntentId, result);
        return;
      }
      throw new PaymentNotFoundError("Payment intent not found for provider payment");
    }
    await this.applyProviderResult(intent.id, result);
  }

  private async applyProviderResult(paymentIntentId: string, result: PaymentProviderResult) {
    const intent = await this.deps.prisma.paymentIntent.findUnique({
      where: { id: paymentIntentId },
    });
    if (!intent) throw new PaymentNotFoundError();

    this.assertAmountMatch(intent, result);

    if (intent.status === result.status) {
      return;
    }
    if (intent.status === "SUCCEEDED") {
      return; // idempotent success
    }

    this.state.assertTransition(intent.status, result.status);

    await this.deps.prisma.$transaction(async (tx) => {
      await tx.paymentIntent.update({
        where: { id: intent.id },
        data: {
          status: result.status as "SUCCEEDED",
          providerIntentId: result.providerPaymentId,
          metadata: {
            ...asMeta(intent.metadata),
            lastProviderMeta: sanitizeMeta(result.metadata),
          },
        },
      });
      await tx.paymentTransaction.create({
        data: {
          paymentIntentId: intent.id,
          provider: intent.provider === "pending" ? "unknown" : intent.provider,
          providerTxnId: `${result.providerPaymentId}:${result.status}:${Date.now()}`,
          amountMinor: result.amountMinor,
          currencyCode: result.currencyCode,
          status:
            result.status === "SUCCEEDED"
              ? "SUCCEEDED"
              : result.status === "FAILED"
                ? "FAILED"
                : result.status === "CANCELLED"
                  ? "CANCELLED"
                  : "PENDING",
          metadata: sanitizeMeta(result.metadata),
          processedAt: new Date(),
        },
      });
    });

    if (result.status === "SUCCEEDED") {
      await this.audit("payment.succeeded", intent.id, {
        amountMinor: intent.amountMinor.toString(),
        currencyCode: intent.currencyCode,
        provider: intent.provider,
      });
      if (this.deps.onPaymentSucceeded) {
        await this.deps.onPaymentSucceeded(intent.id);
      }
    } else if (result.status === "FAILED") {
      await this.audit("payment.failed", intent.id, {
        amountMinor: intent.amountMinor.toString(),
        currencyCode: intent.currencyCode,
        provider: intent.provider,
      });
    } else if (result.status === "CANCELLED") {
      await this.audit("payment.cancelled", intent.id, {
        amountMinor: intent.amountMinor.toString(),
        currencyCode: intent.currencyCode,
        provider: intent.provider,
      });
    }
  }

  private async audit(
    action: string,
    entityId: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    const actorUserId =
      typeof metadata?.userId === "string" ? metadata.userId : undefined;
    try {
      await this.deps.prisma.auditLog.create({
        data: {
          action,
          entityType: "PaymentIntent",
          entityId,
          actorUserId,
          metadata: sanitizeMeta(metadata),
        },
      });
    } catch {
      // Audit must never block payment processing
    }
  }

  private assertAmountMatch(
    intent: { amountMinor: bigint; currencyCode: string },
    result: PaymentProviderResult,
  ) {
    if (result.currencyCode.toUpperCase() !== intent.currencyCode.toUpperCase()) {
      throw new PaymentValidationError("Currency mismatch between payment intent and provider result");
    }
    if (result.amountMinor !== intent.amountMinor) {
      throw new PaymentValidationError("Amount mismatch between payment intent and provider result");
    }
  }

  private assertCheckoutOwnership(
    session: {
      userId: string | null;
      cart: { userId: string | null; guestToken: string | null };
    },
    input: { userId?: string | null; guestToken?: string | null },
  ) {
    if (input.userId) {
      if (session.userId !== input.userId && session.cart.userId !== input.userId) {
        throw new PaymentNotFoundError("Checkout session not found");
      }
      return;
    }
    if (input.guestToken) {
      if (session.cart.guestToken !== input.guestToken) {
        throw new PaymentNotFoundError("Checkout session not found");
      }
      return;
    }
    throw new PaymentValidationError("Authentication or cart token required");
  }

  private async assertIntentOwnership(
    intent: { metadata: Prisma.JsonValue | null },
    opts?: { userId?: string | null; guestToken?: string | null },
  ) {
    const meta = asMeta(intent.metadata);
    const checkoutSessionId =
      typeof meta.checkoutSessionId === "string" ? meta.checkoutSessionId : null;
    if (!checkoutSessionId) {
      throw new PaymentNotFoundError();
    }
    const session = await this.deps.prisma.checkoutSession.findUnique({
      where: { id: checkoutSessionId },
      include: { cart: true },
    });
    if (!session) throw new PaymentNotFoundError();
    this.assertCheckoutOwnership(session, opts ?? {});
  }

  private toDto(intent: {
    id: string;
    orderId: string | null;
    provider: string;
    status: string;
    amountMinor: bigint;
    currencyCode: string;
    providerIntentId: string | null;
    metadata: Prisma.JsonValue | null;
    createdAt: Date;
  }) {
    const meta = asMeta(intent.metadata);
    return {
      id: intent.id,
      orderId: intent.orderId,
      checkoutSessionId:
        typeof meta.checkoutSessionId === "string" ? meta.checkoutSessionId : null,
      provider: intent.provider,
      status: intent.status,
      amountMinor: intent.amountMinor,
      currencyCode: intent.currencyCode,
      providerIntentId: intent.providerIntentId,
      createdAt: intent.createdAt.toISOString(),
    };
  }
}

function sanitizeMeta(meta?: Record<string, unknown>): Prisma.InputJsonValue {
  if (!meta) return {};
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(meta)) {
    const key = k.toLowerCase();
    if (
      key.includes("secret") ||
      key.includes("password") ||
      key.includes("cvv") ||
      key.includes("pan") ||
      key.includes("token") ||
      key.includes("signature") ||
      key.includes("authorization") ||
      key.includes("webhook") ||
      key.includes("credential") ||
      key.includes("api_key") ||
      key.includes("apikey")
    ) {
      continue;
    }
    if (typeof v === "string" || typeof v === "number" || typeof v === "boolean" || v === null) {
      out[k] = v;
    }
  }
  return out as Prisma.InputJsonValue;
}
