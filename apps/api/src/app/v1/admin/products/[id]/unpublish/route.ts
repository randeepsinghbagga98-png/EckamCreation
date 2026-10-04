import { PERMISSIONS } from "@eckamcreation/auth";
import { requirePermission } from "../../../../../../lib/auth/guards";
import { getProductService } from "../../../../../../lib/catalogue";
import { jsonOk, withApiHandler } from "../../../../../../lib/http";

type RouteContext = { params: Promise<{ id: string }> };

export const POST = withApiHandler(async (request, requestId, context: RouteContext) => {
  const staff = await requirePermission(request, PERMISSIONS.PRODUCTS_WRITE);
  const { id } = await context.params;
  const product = await getProductService().unpublish(id, staff.staffUserId);
  return jsonOk(product, { requestId });
});
