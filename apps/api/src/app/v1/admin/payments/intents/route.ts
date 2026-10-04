import { adminPaymentListQuerySchema } from "@eckamcreation/api-contracts";
import { PERMISSIONS } from "@eckamcreation/auth";
import { requirePermission } from "../../../../../lib/auth/guards";
import { getAdminPaymentService } from "../../../../../lib/admin";
import { hasLivePaymentProvider } from "../../../../../lib/payments";
import { fromZodError } from "../../../../../lib/errors";
import { jsonOk, withApiHandler } from "../../../../../lib/http";

export const GET = withApiHandler(async (request, requestId) => {
  await requirePermission(request, PERMISSIONS.PAYMENTS_READ);
  const url = new URL(request.url);
  const parsed = adminPaymentListQuerySchema.safeParse(
    Object.fromEntries(url.searchParams.entries()),
  );
  if (!parsed.success) throw fromZodError(parsed.error);
  const result = await getAdminPaymentService().list(parsed.data);
  return jsonOk(
    {
      items: result.items,
      providerConfigured: hasLivePaymentProvider(),
    },
    { requestId, pagination: result.pagination },
  );
});
