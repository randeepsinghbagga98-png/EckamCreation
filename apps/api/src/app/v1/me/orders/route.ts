import { orderListQuerySchema } from "@eckamcreation/api-contracts";
import { requireAuthenticatedUser } from "../../../../lib/auth/guards";
import { getOrderService } from "../../../../lib/orders";
import { fromZodError } from "../../../../lib/errors";
import { jsonOk, withApiHandler } from "../../../../lib/http";

export const GET = withApiHandler(async (request, requestId) => {
  const user = await requireAuthenticatedUser(request);
  const url = new URL(request.url);
  const parsed = orderListQuerySchema.safeParse(Object.fromEntries(url.searchParams.entries()));
  if (!parsed.success) throw fromZodError(parsed.error);
  const result = await getOrderService().listCustomerOrders(user.userId, parsed.data);
  return jsonOk({ items: result.items }, { requestId, pagination: result.pagination });
});
