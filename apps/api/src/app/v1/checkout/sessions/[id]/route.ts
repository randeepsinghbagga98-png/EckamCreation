import { checkoutPatchSchema } from "@eckamcreation/api-contracts";
import { enforceCartRateLimit } from "../../../../../lib/auth/enforce-rate-limit";
import { resolveCartIdentity } from "../../../../../lib/cart";
import { getCheckoutService } from "../../../../../lib/checkout";
import { unauthorized } from "../../../../../lib/errors";
import { jsonOk, withApiHandler } from "../../../../../lib/http";
import { parseJsonBody } from "../../../../../lib/parse-json";

type Ctx = { params: Promise<{ id: string }> };

async function requireIdentity(request: Request) {
  const identity = await resolveCartIdentity(request);
  if (!identity) throw unauthorized("Cart identity required (session or X-Cart-Token)");
  return identity;
}

export const GET = withApiHandler(async (request, requestId, context: Ctx) => {
  const identity = await requireIdentity(request);
  const { id } = await context.params;
  const url = new URL(request.url);
  const session = await getCheckoutService().get(identity, id, {
    countryCode: url.searchParams.get("country") ?? undefined,
  });
  return jsonOk(session, { requestId });
});

export const PATCH = withApiHandler(async (request, requestId, context: Ctx) => {
  await enforceCartRateLimit(request, "checkout.patch");
  const identity = await requireIdentity(request);
  const { id } = await context.params;
  const body = await parseJsonBody(request, checkoutPatchSchema);
  const session = await getCheckoutService().patch(identity, id, body);
  return jsonOk(session, { requestId });
});
