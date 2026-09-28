import {
  CART_TOKEN_HEADER,
  cartContextQuerySchema,
  cartItemInputSchema,
} from "@eckamcreation/api-contracts";
import { enforceCartRateLimit } from "../../../../../lib/auth/enforce-rate-limit";
import { getCartService, resolveCartIdentity } from "../../../../../lib/cart";
import { fromZodError } from "../../../../../lib/errors";
import { jsonOk, withApiHandler } from "../../../../../lib/http";
import { parseJsonBody } from "../../../../../lib/parse-json";

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
  await enforceCartRateLimit(request, "carts.items.add");
  const identity = await resolveCartIdentity(request);
  const body = await parseJsonBody(request, cartItemInputSchema);
  const cart = await getCartService().addItem(identity, body, parseContext(request));
  const headers = new Headers();
  if (cart.guestToken) {
    headers.set(CART_TOKEN_HEADER, cart.guestToken);
  }
  return jsonOk(cart, { requestId, headers });
});
