import { adminPriceUpsertSchema } from "@eckamcreation/api-contracts";
import { PERMISSIONS } from "@eckamcreation/auth";
import { requirePermission } from "../../../../../../lib/auth/guards";
import { getProductService } from "../../../../../../lib/catalogue";
import { jsonOk, withApiHandler } from "../../../../../../lib/http";
import { parseJsonBody } from "../../../../../../lib/parse-json";

type RouteContext = { params: Promise<{ id: string }> };

export const PUT = withApiHandler(async (request, requestId, context: RouteContext) => {
  const staff = await requirePermission(request, PERMISSIONS.PRODUCTS_WRITE);
  const { id } = await context.params;
  const body = await parseJsonBody(request, adminPriceUpsertSchema);
  const priced = await getProductService().upsertVariantPrice(id, body, staff.staffUserId);
  return jsonOk(priced, { requestId });
});
