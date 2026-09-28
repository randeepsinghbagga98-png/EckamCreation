import { adminCategoryUpdateSchema } from "@eckamcreation/api-contracts";
import { PERMISSIONS } from "@eckamcreation/auth";
import { requirePermission } from "../../../../../lib/auth/guards";
import { getCategoryService } from "../../../../../lib/catalogue";
import { jsonOk, withApiHandler } from "../../../../../lib/http";
import { parseJsonBody } from "../../../../../lib/parse-json";

type RouteContext = { params: Promise<{ id: string }> };

export const PATCH = withApiHandler(async (request, requestId, context: RouteContext) => {
  const staff = await requirePermission(request, PERMISSIONS.CATALOGUE_WRITE);
  const { id } = await context.params;
  const body = await parseJsonBody(request, adminCategoryUpdateSchema);
  const category = await getCategoryService().update(id, body, staff.staffUserId);
  return jsonOk(category, { requestId });
});
