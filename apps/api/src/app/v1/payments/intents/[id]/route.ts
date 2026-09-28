import { moneyFromBigInt } from "@eckamcreation/api-contracts";
import { resolveCartIdentity } from "../../../../../lib/cart";
import { getPaymentService } from "../../../../../lib/payments";
import { resolveStaff } from "../../../../../lib/auth/guards";
import { unauthorized } from "../../../../../lib/errors";
import { jsonOk, withApiHandler } from "../../../../../lib/http";

type Ctx = { params: Promise<{ id: string }> };

export const GET = withApiHandler(async (request, requestId, context: Ctx) => {
  const { id } = await context.params;
  const staff = await resolveStaff(request);
  const identity = await resolveCartIdentity(request);

  if (!staff && !identity) throw unauthorized("Authentication required");

  const intent = await getPaymentService().getIntent(id, {
    staff: Boolean(staff),
    userId: identity?.kind === "customer" ? identity.userId : null,
    guestToken: identity?.kind === "guest" ? identity.guestToken : null,
  });

  return jsonOk(
    {
      id: intent.id,
      orderId: intent.orderId,
      checkoutSessionId: intent.checkoutSessionId,
      provider: intent.provider,
      status: intent.status,
      amount: moneyFromBigInt(intent.amountMinor, intent.currencyCode),
      providerIntentId: intent.providerIntentId,
      createdAt: intent.createdAt,
    },
    { requestId },
  );
});
