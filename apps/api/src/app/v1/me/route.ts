import { profileUpdateSchema } from "@eckamcreation/api-contracts";
import { clientMeta, requireAuthenticatedUser } from "../../../lib/auth/guards";
import { getCustomerService } from "../../../lib/customer";
import { jsonOk, withApiHandler } from "../../../lib/http";
import { parseJsonBody } from "../../../lib/parse-json";

export const GET = withApiHandler(async (request, requestId) => {
  const user = await requireAuthenticatedUser(request);
  const profile = await getCustomerService().getOrCreateProfile(user.userId);
  return jsonOk(profile, { requestId });
});

export const PATCH = withApiHandler(async (request, requestId) => {
  const user = await requireAuthenticatedUser(request);
  const body = await parseJsonBody(request, profileUpdateSchema);
  const profile = await getCustomerService().updateProfile(user.userId, body, clientMeta(request));
  return jsonOk(profile, { requestId });
});
