import { cartContextQuerySchema } from "@eckamcreation/api-contracts";
import { enforceCartRateLimit } from "../../../../lib/auth/enforce-rate-limit";
import { getCartService, resolveCartIdentity } from "../../../../lib/cart";
import { fromZodError } from "../../../../lib/errors";
import { jsonOk, withApiHandler } from "../../../../lib/http";

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

export const GET = withApiHandler(async (request, requestId) => {
  const identity = await resolveCartIdentity(request);
  const cart = await getCartService().getCurrent(identity, parseContext(request));
  return jsonOk(cart, { requestId });
});

export const DELETE = withApiHandler(async (request, requestId) => {
  await enforceCartRateLimit(request, "carts.clear");
  const identity = await resolveCartIdentity(request);
  const cart = await getCartService().clearCart(identity, parseContext(request));
  return jsonOk(cart, { requestId });
});
