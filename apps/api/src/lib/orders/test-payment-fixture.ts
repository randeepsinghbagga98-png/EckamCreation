import type { PrismaClient } from "@eckamcreation/database";
import { notFound, validationError } from "../errors";

/**
 * TEST / INTERNAL FIXTURE ONLY.
 *
 * This is NOT a payment provider adapter.
 * It marks an existing PaymentIntent as SUCCEEDED so order-creation
 * tests can exercise the verified-payment boundary without calling
 * PhonePe/Cashfree/Razorpay/Stripe/etc.
 *
 * Production payment success must come from a real provider webhook
 * (Payments phase) that sets the same SUCCEEDED status after verification.
 */
export async function testFixtureMarkPaymentSucceeded(
  prisma: PrismaClient,
  paymentIntentId: string,
): Promise<void> {
  const intent = await prisma.paymentIntent.findUnique({ where: { id: paymentIntentId } });
  if (!intent) throw notFound("Payment intent not found");
  if (intent.status === "SUCCEEDED") return;
  if (intent.status === "CANCELLED" || intent.status === "FAILED") {
    throw validationError(`Cannot mark ${intent.status} payment intent as succeeded`);
  }
  await prisma.paymentIntent.update({
    where: { id: paymentIntentId },
    data: {
      status: "SUCCEEDED",
      // Explicitly not inventing a provider transaction id
      metadata: {
        ...((intent.metadata as Record<string, unknown>) ?? {}),
        verifiedBy: "test-fixture",
        verifiedAt: new Date().toISOString(),
      },
    },
  });
}
