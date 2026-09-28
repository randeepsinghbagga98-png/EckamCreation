import { wishlistItemCreateSchema } from "@eckamcreation/api-contracts";
import { clientMeta, requireAuthenticatedUser } from "../../../../../lib/auth/guards";
import { getCustomerService } from "../../../../../lib/customer";
import { jsonOk, withApiHandler } from "../../../../../lib/http";
import { parseJsonBody } from "../../../../../lib/parse-json";

export const POST = withApiHandler(async (request, requestId) => {
  const user = await requireAuthenticatedUser(request);
  const body = await parseJsonBody(request, wishlistItemCreateSchema);
  const item = await getCustomerService().addWishlistItem(
    user.userId,
    body,
    clientMeta(request),
  );
  return jsonOk(item, { status: 201, requestId });
});
