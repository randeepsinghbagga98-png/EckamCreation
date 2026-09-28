import { orderListQuerySchema } from "@eckamcreation/api-contracts";
import { PERMISSIONS } from "@eckamcreation/auth";
import { requirePermission } from "../../../../lib/auth/guards";
import { getOrderService } from "../../../../lib/orders";
import { fromZodError } from "../../../../lib/errors";
import { jsonOk, withApiHandler } from "../../../../lib/http";

export const GET = withApiHandler(async (request, requestId) => {
  await requirePermission(request, PERMISSIONS.ORDERS_READ);
  const url = new URL(request.url);
  const parsed = orderListQuerySchema.safeParse(Object.fromEntries(url.searchParams.entries()));
  if (!parsed.success) throw fromZodError(parsed.error);
  const result = await getOrderService().listAdminOrders(parsed.data);
  return jsonOk({ items: result.items }, { requestId, pagination: result.pagination });
});
