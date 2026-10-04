import { PERMISSIONS } from "@eckamcreation/auth";
import { requirePermission } from "../../../../../../lib/auth/guards";
import { getAdminPaymentService } from "../../../../../../lib/admin";
import { hasLivePaymentProvider } from "../../../../../../lib/payments";
import { jsonOk, withApiHandler } from "../../../../../../lib/http";

type RouteContext = { params: Promise<{ id: string }> };

export const GET = withApiHandler(async (request, requestId, context: RouteContext) => {
  await requirePermission(request, PERMISSIONS.PAYMENTS_READ);
  const { id } = await context.params;
  const intent = await getAdminPaymentService().getById(id);
  return jsonOk({ ...intent, providerConfigured: hasLivePaymentProvider() }, { requestId });
});
