import { requireAuthenticatedUser } from "../../../../lib/auth/guards";
import { getCustomerService } from "../../../../lib/customer";
import { jsonOk, withApiHandler } from "../../../../lib/http";

export const GET = withApiHandler(async (request, requestId) => {
  const user = await requireAuthenticatedUser(request);
  const wishlist = await getCustomerService().getWishlist(user.userId);
  return jsonOk(wishlist, { requestId });
});
