import { cartContextQuerySchema, cartItemPatchSchema } from "@eckamcreation/api-contracts";
import { enforceCartRateLimit } from "../../../../../../lib/auth/enforce-rate-limit";
import { getCartService, resolveCartIdentity } from "../../../../../../lib/cart";
import { fromZodError } from "../../../../../../lib/errors";
import { jsonOk, withApiHandler } from "../../../../../../lib/http";
import { parseJsonBody } from "../../../../../../lib/parse-json";

type Ctx = { params: Promise<{ itemId: string }> };

function parseContext(request: Request) {
  const url = new URL(request.url);
  const parsed = cartContextQuerySchema.safeParse(
    Object.fromEntries(url.searchParams.entries()),
  );
  if (!parsed.success) throw fromZodError(parsed.error);
  return {
    currencyCode: parsed.data.currency,
    countryCode: parsed.data.country,
  };
}

export const PATCH = withApiHandler(async (request, requestId, context: Ctx) => {
  await enforceCartRateLimit(request, "carts.items.patch");
  const identity = await resolveCartIdentity(request);
  const { itemId } = await context.params;
  const body = await parseJsonBody(request, cartItemPatchSchema);
  const cart = await getCartService().updateItem(
    identity,
    itemId,
    body.quantity,
    parseContext(request),
  );
  return jsonOk(cart, { requestId });
});

export const DELETE = withApiHandler(async (request, requestId, context: Ctx) => {
  await enforceCartRateLimit(request, "carts.items.delete");
  const identity = await resolveCartIdentity(request);
  const { itemId } = await context.params;
  const cart = await getCartService().removeItem(identity, itemId, parseContext(request));
  return jsonOk(cart, { requestId });
});
