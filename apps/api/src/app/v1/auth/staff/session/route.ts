import { resolveStaff } from "../../../../../lib/auth/guards";
import { jsonOk, withApiHandler } from "../../../../../lib/http";

export const GET = withApiHandler(async (request, requestId) => {
  const staff = await resolveStaff(request);
  if (!staff) {
    return jsonOk({ authenticated: false as const, session: null }, { requestId });
  }
  return jsonOk(
    {
      authenticated: true as const,
      session: {
        kind: "staff" as const,
        staffUserId: staff.staffUserId,
        email: staff.email,
        name: staff.name,
        roles: staff.roles,
        permissions: staff.permissions,
      },
    },
    { requestId },
  );
});
