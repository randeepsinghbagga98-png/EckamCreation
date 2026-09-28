import { adminBrandUpdateSchema } from "@eckamcreation/api-contracts";
import { PERMISSIONS } from "@eckamcreation/auth";
import { requirePermission } from "../../../../../lib/auth/guards";
import { getBrandService } from "../../../../../lib/catalogue";
import { jsonOk, withApiHandler } from "../../../../../lib/http";
import { parseJsonBody } from "../../../../../lib/parse-json";

type RouteContext = { params: Promise<{ id: string }> };

export const PATCH = withApiHandler(async (request, requestId, context: RouteContext) => {
  const staff = await requirePermission(request, PERMISSIONS.CATALOGUE_WRITE);
  const { id } = await context.params;
  const body = await parseJsonBody(request, adminBrandUpdateSchema);
  const brand = await getBrandService().update(id, body, staff.staffUserId);
  return jsonOk(brand, { requestId });
});
