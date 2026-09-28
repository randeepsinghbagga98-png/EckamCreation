import { clientMeta, requireAuthenticatedUser } from "../../../../../../lib/auth/guards";
import { getCustomerService } from "../../../../../../lib/customer";
import { jsonOk, withApiHandler } from "../../../../../../lib/http";

type Ctx = { params: Promise<{ variantId: string }> };

export const DELETE = withApiHandler(async (request, requestId, context: Ctx) => {
  const user = await requireAuthenticatedUser(request);
  const { variantId } = await context.params;
  await getCustomerService().removeWishlistItem(user.userId, variantId, clientMeta(request));
  return jsonOk({ deleted: true as const }, { requestId });
});
