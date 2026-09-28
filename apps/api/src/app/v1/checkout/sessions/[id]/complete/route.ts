import { enforceCartRateLimit } from "../../../../../../lib/auth/enforce-rate-limit";
import { resolveCartIdentity } from "../../../../../../lib/cart";
import { getCheckoutService } from "../../../../../../lib/checkout";
import { unauthorized } from "../../../../../../lib/errors";
import { jsonOk, withApiHandler } from "../../../../../../lib/http";

type Ctx = { params: Promise<{ id: string }> };

export const POST = withApiHandler(async (request, requestId, context: Ctx) => {
  await enforceCartRateLimit(request, "checkout.complete");
  const identity = await resolveCartIdentity(request);
  if (!identity) throw unauthorized("Cart identity required (session or X-Cart-Token)");
  const { id } = await context.params;
  const session = await getCheckoutService().complete(identity, id);
  return jsonOk(session, { requestId });
});
