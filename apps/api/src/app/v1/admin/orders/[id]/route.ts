import { PERMISSIONS } from "@eckamcreation/auth";
import { requirePermission } from "../../../../../lib/auth/guards";
import { getOrderService } from "../../../../../lib/orders";
import { jsonOk, withApiHandler } from "../../../../../lib/http";

type Ctx = { params: Promise<{ id: string }> };

export const GET = withApiHandler(async (request, requestId, context: Ctx) => {
  await requirePermission(request, PERMISSIONS.ORDERS_READ);
  const { id } = await context.params;
  const order = await getOrderService().getAdminOrder(id);
  return jsonOk(order, { requestId });
});
