import { adminVariantCreateSchema } from "@eckamcreation/api-contracts";
import { PERMISSIONS } from "@eckamcreation/auth";
import { requirePermission } from "../../../../../../lib/auth/guards";
import { getProductService } from "../../../../../../lib/catalogue";
import { jsonOk, withApiHandler } from "../../../../../../lib/http";
import { parseJsonBody } from "../../../../../../lib/parse-json";

type RouteContext = { params: Promise<{ id: string }> };

export const POST = withApiHandler(async (request, requestId, context: RouteContext) => {
  const staff = await requirePermission(request, PERMISSIONS.PRODUCTS_WRITE);
  const { id } = await context.params;
  const body = await parseJsonBody(request, adminVariantCreateSchema);
  const variant = await getProductService().createVariant(id, body, staff.staffUserId);
  return jsonOk(
    {
      id: variant.id,
      productId: variant.productId,
      sku: variant.sku,
      name: variant.name,
      isDefault: variant.isDefault,
      isActive: variant.isActive,
    },
    { status: 201, requestId },
  );
});
