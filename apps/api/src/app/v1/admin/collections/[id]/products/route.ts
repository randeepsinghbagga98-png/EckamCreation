import { adminCollectionProductsSchema } from "@eckamcreation/api-contracts";
import { PERMISSIONS } from "@eckamcreation/auth";
import { requirePermission } from "../../../../../../lib/auth/guards";
import { getCollectionService } from "../../../../../../lib/catalogue";
import { jsonOk, withApiHandler } from "../../../../../../lib/http";
import { parseJsonBody } from "../../../../../../lib/parse-json";

type RouteContext = { params: Promise<{ id: string }> };

export const POST = withApiHandler(async (request, requestId, context: RouteContext) => {
  const staff = await requirePermission(request, PERMISSIONS.CATALOGUE_WRITE);
  const { id } = await context.params;
  const body = await parseJsonBody(request, adminCollectionProductsSchema);
  await getCollectionService().addProducts(id, body.productIds, staff.staffUserId);
  return jsonOk({ added: body.productIds.length }, { requestId });
});
