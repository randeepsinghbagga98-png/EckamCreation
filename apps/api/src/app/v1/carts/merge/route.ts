import { cartContextQuerySchema, mergeCartBodySchema } from "@eckamcreation/api-contracts";
import { requireAuthenticatedUser } from "../../../../lib/auth/guards";
import { enforceCartRateLimit } from "../../../../lib/auth/enforce-rate-limit";
import { getCartService } from "../../../../lib/cart";
import { fromZodError } from "../../../../lib/errors";
import { jsonOk, withApiHandler } from "../../../../lib/http";
import { parseJsonBody } from "../../../../lib/parse-json";

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
  await enforceCartRateLimit(request, "carts.merge");
  const user = await requireAuthenticatedUser(request);
  const body = await parseJsonBody(request, mergeCartBodySchema);
  const cart = await getCartService().mergeGuestIntoCustomer(
    user.userId,
    body.guestToken,
    parseContext(request),
  );
  return jsonOk(cart, { requestId });
});
