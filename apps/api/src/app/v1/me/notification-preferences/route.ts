import { notificationPreferencesUpdateSchema } from "@eckamcreation/api-contracts";
import { clientMeta, requireAuthenticatedUser } from "../../../../lib/auth/guards";
import { getCustomerService } from "../../../../lib/customer";
import { jsonOk, withApiHandler } from "../../../../lib/http";
import { parseJsonBody } from "../../../../lib/parse-json";

export const GET = withApiHandler(async (request, requestId) => {
  const user = await requireAuthenticatedUser(request);
  const prefs = await getCustomerService().getNotificationPreferences(user.userId);
  return jsonOk(prefs, { requestId });
});

export const PATCH = withApiHandler(async (request, requestId) => {
  const user = await requireAuthenticatedUser(request);
  const body = await parseJsonBody(request, notificationPreferencesUpdateSchema);
  const prefs = await getCustomerService().updateNotificationPreferences(
    user.userId,
    body,
    clientMeta(request),
  );
  return jsonOk(prefs, { requestId });
});
