import { shipmentCreateSchema } from "@eckamcreation/api-contracts";
import { PERMISSIONS } from "@eckamcreation/auth";
import { clientMeta, requirePermission } from "../../../../../../lib/auth/guards";
import { getOrderService } from "../../../../../../lib/orders";
import { jsonOk, withApiHandler } from "../../../../../../lib/http";
import { parseJsonBody } from "../../../../../../lib/parse-json";

type Ctx = { params: Promise<{ id: string }> };

export const GET = withApiHandler(async (request, requestId, context: Ctx) => {
  await requirePermission(request, PERMISSIONS.ORDERS_READ);
  const { id } = await context.params;
  const items = await getOrderService().listShipmentsForOrder(id);
  return jsonOk({ items }, { requestId });
});

export const POST = withApiHandler(async (request, requestId, context: Ctx) => {
  const staff = await requirePermission(request, PERMISSIONS.ORDERS_UPDATE);
  const { id } = await context.params;
  const body = await parseJsonBody(request, shipmentCreateSchema);
  const shipment = await getOrderService().createShipment(
    id,
    body,
    staff.staffUserId,
    clientMeta(request),
  );
  return jsonOk(shipment, { status: 201, requestId });
});
