import { PERMISSIONS } from "@eckamcreation/auth";
import { requirePermission } from "../../../../lib/auth/guards";
import { getDashboardService } from "../../../../lib/admin";
import { jsonOk, withApiHandler } from "../../../../lib/http";

export const GET = withApiHandler(async (request, requestId) => {
  await requirePermission(request, PERMISSIONS.DASHBOARD_READ);
  const metrics = await getDashboardService().getMetrics();
  return jsonOk(metrics, { requestId });
});
