import { adminProductCreateSchema, productListQuerySchema } from "@eckamcreation/api-contracts";
import { PERMISSIONS } from "@eckamcreation/auth";
import { requirePermission } from "../../../../lib/auth/guards";
import { getProductService } from "../../../../lib/catalogue";
import { fromZodError } from "../../../../lib/errors";
import { jsonOk, withApiHandler } from "../../../../lib/http";
import { parseJsonBody } from "../../../../lib/parse-json";

export const GET = withApiHandler(async (request, requestId) => {
  await requirePermission(request, PERMISSIONS.PRODUCTS_READ);
  const url = new URL(request.url);
  const parsed = productListQuerySchema.safeParse(Object.fromEntries(url.searchParams.entries()));
  if (!parsed.success) throw fromZodError(parsed.error);
  const result = await getProductService().listAdmin(parsed.data);
  return jsonOk({ items: result.items }, { requestId, pagination: result.pagination });
});

export const POST = withApiHandler(async (request, requestId) => {
  const staff = await requirePermission(request, PERMISSIONS.PRODUCTS_WRITE);
  const body = await parseJsonBody(request, adminProductCreateSchema);
  const product = await getProductService().create(body, staff.staffUserId);
  return jsonOk(product, { status: 201, requestId });
});
