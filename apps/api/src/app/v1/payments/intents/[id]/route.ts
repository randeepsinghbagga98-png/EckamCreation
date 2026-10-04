import { moneyFromBigInt } from "@eckamcreation/api-contracts";
import { PERMISSIONS } from "@eckamcreation/auth";
import { resolveCartIdentity } from "../../../../../lib/cart";
import { getPaymentService } from "../../../../../lib/payments";
import { requirePermission } from "../../../../../lib/auth/guards";
import { jsonOk, withApiHandler } from "../../../../../lib/http";

type Ctx = { params: Promise<{ id: string }> };

export const GET = withApiHandler(async (request, requestId, context: Ctx) => {
  const { id } = await context.params;
  const identity = await resolveCartIdentity(request);

  const intent = identity
    ? await getPaymentService().getIntent(id, {
        userId: identity.kind === "customer" ? identity.userId : null,
        guestToken: identity.kind === "guest" ? identity.guestToken : null,
      })
    : await (async () => {
        await requirePermission(request, PERMISSIONS.PAYMENTS_READ);
        return getPaymentService().getIntent(id, { staff: true });
      })();

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
