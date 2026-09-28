import { STAFF_SESSION_COOKIE } from "../../../../../lib/auth/cookies";
import { clientMeta, readStaffSessionToken } from "../../../../../lib/auth/guards";
import { getStaffAuth } from "../../../../../lib/auth/services";
import { jsonOk, withApiHandler } from "../../../../../lib/http";

export const POST = withApiHandler(async (request, requestId) => {
  const token = readStaffSessionToken(request);
  await getStaffAuth().logout(token, clientMeta(request));
  const response = jsonOk({ loggedOut: true }, { requestId });
  response.cookies.set(STAFF_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
  });
  return response;
});
