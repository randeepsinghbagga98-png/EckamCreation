import { adminProductUpdateSchema } from "@eckamcreation/api-contracts";
import { PERMISSIONS } from "@eckamcreation/auth";
import { requirePermission } from "../../../../../lib/auth/guards";
import { getProductService } from "../../../../../lib/catalogue";
import { jsonOk, withApiHandler } from "../../../../../lib/http";
import { parseJsonBody } from "../../../../../lib/parse-json";

type RouteContext = { params: Promise<{ id: string }> };

export const GET = withApiHandler(async (request, requestId, context: RouteContext) => {
  await requirePermission(request, PERMISSIONS.PRODUCTS_READ);
  const { id } = await context.params;
  const product = await getProductService().getAdminById(id);
  return jsonOk(product, { requestId });
});

export const PATCH = withApiHandler(async (request, requestId, context: RouteContext) => {
  const staff = await requirePermission(request, PERMISSIONS.PRODUCTS_WRITE);
  const { id } = await context.params;
  const body = await parseJsonBody(request, adminProductUpdateSchema);
  const product = await getProductService().update(id, body, staff.staffUserId);
  return jsonOk(product, { requestId });
});
