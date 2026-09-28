import { resolveCustomer } from "../../../../lib/auth/guards";
import { jsonOk, withApiHandler } from "../../../../lib/http";

export const GET = withApiHandler(async (request, requestId) => {
  const user = await resolveCustomer(request);
  if (!user) {
    return jsonOk({ authenticated: false as const, session: null }, { requestId });
  }
  return jsonOk(
    {
      authenticated: true as const,
      session: {
        kind: "customer" as const,
        userId: user.userId,
        email: user.email,
        name: user.name,
      },
    },
    { requestId },
  );
});
