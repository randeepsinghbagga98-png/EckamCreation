import { adminCategoryCreateSchema } from "@eckamcreation/api-contracts";
import { PERMISSIONS } from "@eckamcreation/auth";
import { requirePermission } from "../../../../lib/auth/guards";
import { getCategoryService } from "../../../../lib/catalogue";
import { jsonOk, withApiHandler } from "../../../../lib/http";
import { parseJsonBody } from "../../../../lib/parse-json";

export const GET = withApiHandler(async (request, requestId) => {
  await requirePermission(request, PERMISSIONS.CATALOGUE_READ);
  const items = await getCategoryService().listAdmin();
  return jsonOk({ items }, { requestId });
});

export const POST = withApiHandler(async (request, requestId) => {
  const staff = await requirePermission(request, PERMISSIONS.CATALOGUE_WRITE);
  const body = await parseJsonBody(request, adminCategoryCreateSchema);
  const category = await getCategoryService().create(body, staff.staffUserId);
  return jsonOk(category, { status: 201, requestId });
});
