import { CART_TOKEN_HEADER, cartContextQuerySchema } from "@eckamcreation/api-contracts";
import { enforceCartRateLimit } from "../../../lib/auth/enforce-rate-limit";
import { getCartService, resolveCartIdentity } from "../../../lib/cart";
import { fromZodError } from "../../../lib/errors";
import { jsonOk, withApiHandler } from "../../../lib/http";

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

export const POST = withApiHandler(async (request, requestId) => {
  await enforceCartRateLimit(request, "carts.create");
  const identity = await resolveCartIdentity(request);
  const cart = await getCartService().createCart(identity, parseContext(request));
  const headers = new Headers();
  if (cart.guestToken) {
    headers.set(CART_TOKEN_HEADER, cart.guestToken);
  }
  return jsonOk(cart, { status: 201, requestId, headers });
});
