import { adminCustomerListQuerySchema } from "@eckamcreation/api-contracts";
import { PERMISSIONS } from "@eckamcreation/auth";
import { requirePermission } from "../../../../lib/auth/guards";
import { getAdminCustomerService } from "../../../../lib/admin";
import { fromZodError } from "../../../../lib/errors";
import { jsonOk, withApiHandler } from "../../../../lib/http";

export const GET = withApiHandler(async (request, requestId) => {
  await requirePermission(request, PERMISSIONS.CUSTOMERS_READ);
  const url = new URL(request.url);
  const parsed = adminCustomerListQuerySchema.safeParse(
    Object.fromEntries(url.searchParams.entries()),
  );
  if (!parsed.success) throw fromZodError(parsed.error);
  const result = await getAdminCustomerService().list(parsed.data);
  return jsonOk({ items: result.items }, { requestId, pagination: result.pagination });
});
