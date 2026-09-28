import { moneyFromBigInt } from "@eckamcreation/api-contracts";
import { resolveCartIdentity } from "../../../../../../lib/cart";
import { getPaymentService } from "../../../../../../lib/payments";
import { unauthorized, notFound } from "../../../../../../lib/errors";
import { jsonOk, withApiHandler } from "../../../../../../lib/http";
import { prisma } from "@eckamcreation/database";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Creates a provider-neutral PaymentIntent in REQUIRES_PAYMENT state.
 * Amount comes from checkout totals — never from the client.
 */
export const POST = withApiHandler(async (request, requestId, context: Ctx) => {
  const identity = await resolveCartIdentity(request);
  if (!identity) throw unauthorized("Cart identity required");
  const { id } = await context.params;

  const session = await prisma.checkoutSession.findUnique({ where: { id } });
  if (!session) throw notFound("Checkout session not found");

  const intent = await getPaymentService().createIntent({
    checkoutSessionId: id,
    userId: identity.kind === "customer" ? identity.userId : null,
    guestToken: identity.kind === "guest" ? identity.guestToken : null,
  });

  return jsonOk(
    {
      id: intent.id,
      status: intent.status,
      provider: intent.provider,
      amount: moneyFromBigInt(intent.amountMinor, intent.currencyCode),
      orderId: intent.orderId,
    },
    { status: 201, requestId },
  );
});
