import { staffLoginBodySchema } from "@eckamcreation/api-contracts";
import { STAFF_SESSION_COOKIE, sessionCookieOptions } from "../../../../../lib/auth/cookies";
import { clientMeta } from "../../../../../lib/auth/guards";
import { mapAuthError } from "../../../../../lib/auth/map-error";
import { enforceAuthRateLimit } from "../../../../../lib/auth/enforce-rate-limit";
import { getStaffAuth } from "../../../../../lib/auth/services";
import { jsonOk, withApiHandler } from "../../../../../lib/http";
import { parseJsonBody } from "../../../../../lib/parse-json";

export const POST = withApiHandler(async (request, requestId) => {
  await enforceAuthRateLimit(request, "staff-login");
  const body = await parseJsonBody(request, staffLoginBodySchema);
  try {
    const result = await getStaffAuth().login(body, clientMeta(request));
    const response = jsonOk(
      {
        kind: "staff" as const,
        staffUserId: result.principal.staffUserId,
        email: result.principal.email,
        name: result.principal.name,
        roles: result.principal.roles,
        permissions: result.principal.permissions,
      },
      { requestId },
    );
    response.cookies.set(
      STAFF_SESSION_COOKIE,
      result.sessionToken,
      sessionCookieOptions(result.expiresAt),
    );
    return response;
  } catch (error) {
    mapAuthError(error);
  }
});
