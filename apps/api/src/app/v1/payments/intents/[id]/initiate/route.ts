import { resolveCartIdentity } from "../../../../../../lib/cart";
import { getPaymentService } from "../../../../../../lib/payments";
import { unauthorized } from "../../../../../../lib/errors";
import { jsonOk, withApiHandler } from "../../../../../../lib/http";

type Ctx = { params: Promise<{ id: string }> };

export const POST = withApiHandler(async (request, requestId, context: Ctx) => {
  const identity = await resolveCartIdentity(request);
  if (!identity) throw unauthorized("Cart identity required (session or X-Cart-Token)");
  const { id } = await context.params;

  const result = await getPaymentService().initiatePayment({
    paymentIntentId: id,
    userId: identity.kind === "customer" ? identity.userId : null,
    guestToken: identity.kind === "guest" ? identity.guestToken : null,
  });

  return jsonOk(
    {
      paymentIntentId: result.paymentIntentId,
      status: result.status,
      provider: result.provider,
      clientAction: result.clientAction,
    },
    { requestId },
  );
});
