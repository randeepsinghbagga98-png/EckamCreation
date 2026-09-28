import { requireAuthenticatedUser } from "../../../../../../lib/auth/guards";
import { getOrderService } from "../../../../../../lib/orders";
import { jsonOk, withApiHandler } from "../../../../../../lib/http";

type Ctx = { params: Promise<{ idOrNumber: string }> };

export const GET = withApiHandler(async (request, requestId, context: Ctx) => {
  const user = await requireAuthenticatedUser(request);
  const { idOrNumber } = await context.params;
  const items = await getOrderService().listShipmentsForOrder(idOrNumber, {
    userId: user.userId,
  });
  return jsonOk({ items }, { requestId });
});
