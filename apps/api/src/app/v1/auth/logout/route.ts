import { CUSTOMER_SESSION_COOKIE } from "../../../../lib/auth/cookies";
import { readCustomerSessionToken } from "../../../../lib/auth/guards";
import { getCustomerAuth } from "../../../../lib/auth/services";
import { jsonOk, withApiHandler } from "../../../../lib/http";

export const POST = withApiHandler(async (request, requestId) => {
  const token = readCustomerSessionToken(request);
  await getCustomerAuth().logout(token);
  const response = jsonOk({ loggedOut: true }, { requestId });
  response.cookies.set(CUSTOMER_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
  });
  return response;
});
