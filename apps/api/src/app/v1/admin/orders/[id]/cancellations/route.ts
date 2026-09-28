import { PERMISSIONS } from "@eckamcreation/auth";
import { clientMeta, requirePermission } from "../../../../../../lib/auth/guards";
import { getOrderService } from "../../../../../../lib/orders";
import { jsonOk, withApiHandler } from "../../../../../../lib/http";

type Ctx = { params: Promise<{ id: string }> };

/** Staff approves cancellation (completes cancellation; does not auto-refund). */
export const POST = withApiHandler(async (request, requestId, context: Ctx) => {
  const staff = await requirePermission(request, PERMISSIONS.ORDERS_UPDATE);
  const { id } = await context.params;
  const order = await getOrderService().approveCancellation(
    id,
    staff.staffUserId,
    clientMeta(request),
  );
  return jsonOk(order, { requestId });
});
