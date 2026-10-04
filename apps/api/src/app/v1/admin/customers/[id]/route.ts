import { adminCustomerUpdateSchema } from "@eckamcreation/api-contracts";
import { PERMISSIONS } from "@eckamcreation/auth";
import { requirePermission } from "../../../../../lib/auth/guards";
import { getAdminCustomerService } from "../../../../../lib/admin";
import { jsonOk, withApiHandler } from "../../../../../lib/http";
import { parseJsonBody } from "../../../../../lib/parse-json";

type RouteContext = { params: Promise<{ id: string }> };

export const GET = withApiHandler(async (request, requestId, context: RouteContext) => {
  await requirePermission(request, PERMISSIONS.CUSTOMERS_READ);
  const { id } = await context.params;
  const customer = await getAdminCustomerService().getById(id);
  return jsonOk(customer, { requestId });
});

export const PATCH = withApiHandler(async (request, requestId, context: RouteContext) => {
  const staff = await requirePermission(request, PERMISSIONS.CUSTOMERS_UPDATE);
  const { id } = await context.params;
  const body = await parseJsonBody(request, adminCustomerUpdateSchema);
  const customer = await getAdminCustomerService().update(id, body, staff.staffUserId);
  return jsonOk(customer, { requestId });
});
