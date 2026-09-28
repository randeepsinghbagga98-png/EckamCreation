import { loginBodySchema } from "@eckamcreation/api-contracts";
import { CUSTOMER_SESSION_COOKIE, sessionCookieOptions } from "../../../../lib/auth/cookies";
import { clientMeta } from "../../../../lib/auth/guards";
import { mapAuthError } from "../../../../lib/auth/map-error";
import { enforceAuthRateLimit } from "../../../../lib/auth/enforce-rate-limit";
import { getCustomerAuth } from "../../../../lib/auth/services";
import { jsonOk, withApiHandler } from "../../../../lib/http";
import { parseJsonBody } from "../../../../lib/parse-json";

export const POST = withApiHandler(async (request, requestId) => {
  await enforceAuthRateLimit(request, "login");
  const body = await parseJsonBody(request, loginBodySchema);
  try {
    const result = await getCustomerAuth().login(body, clientMeta(request));
    const response = jsonOk(
      {
        kind: "customer" as const,
        userId: result.principal.userId,
        email: result.principal.email,
        name: result.principal.name,
      },
      { requestId },
    );
    response.cookies.set(
      CUSTOMER_SESSION_COOKIE,
      result.sessionToken,
      sessionCookieOptions(result.expiresAt),
    );
    return response;
  } catch (error) {
    mapAuthError(error);
  }
});
