import { shipmentStatusPatchSchema } from "@eckamcreation/api-contracts";
import { PERMISSIONS } from "@eckamcreation/auth";
import { clientMeta, requirePermission } from "../../../../../../lib/auth/guards";
import { getOrderService } from "../../../../../../lib/orders";
import { jsonOk, withApiHandler } from "../../../../../../lib/http";
import { parseJsonBody } from "../../../../../../lib/parse-json";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = withApiHandler(async (request, requestId, context: Ctx) => {
  const staff = await requirePermission(request, PERMISSIONS.ORDERS_UPDATE);
  const { id } = await context.params;
  const body = await parseJsonBody(request, shipmentStatusPatchSchema);
  const shipment = await getOrderService().updateShipmentStatus(
    id,
    body,
    staff.staffUserId,
    clientMeta(request),
  );
  return jsonOk(shipment, { requestId });
});
