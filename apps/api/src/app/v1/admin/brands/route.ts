import { adminBrandCreateSchema } from "@eckamcreation/api-contracts";
import { PERMISSIONS } from "@eckamcreation/auth";
import { requirePermission } from "../../../../lib/auth/guards";
import { getBrandService } from "../../../../lib/catalogue";
import { jsonOk, withApiHandler } from "../../../../lib/http";
import { parseJsonBody } from "../../../../lib/parse-json";

export const GET = withApiHandler(async (request, requestId) => {
  await requirePermission(request, PERMISSIONS.CATALOGUE_READ);
  const items = await getBrandService().listPublic();
  return jsonOk({ items }, { requestId });
});

export const POST = withApiHandler(async (request, requestId) => {
  const staff = await requirePermission(request, PERMISSIONS.CATALOGUE_WRITE);
  const body = await parseJsonBody(request, adminBrandCreateSchema);
  const brand = await getBrandService().create(body, staff.staffUserId);
  return jsonOk(brand, { status: 201, requestId });
});
