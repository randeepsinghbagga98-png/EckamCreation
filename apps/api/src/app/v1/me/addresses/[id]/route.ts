import { addressUpdateSchema } from "@eckamcreation/api-contracts";
import { clientMeta, requireAuthenticatedUser } from "../../../../../lib/auth/guards";
import { getCustomerService } from "../../../../../lib/customer";
import { jsonOk, withApiHandler } from "../../../../../lib/http";
import { parseJsonBody } from "../../../../../lib/parse-json";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = withApiHandler(async (request, requestId, context: Ctx) => {
  const user = await requireAuthenticatedUser(request);
  const { id } = await context.params;
  const body = await parseJsonBody(request, addressUpdateSchema);
  const address = await getCustomerService().updateAddress(
    user.userId,
    id,
    body,
    clientMeta(request),
  );
  return jsonOk(address, { requestId });
});

export const DELETE = withApiHandler(async (request, requestId, context: Ctx) => {
  const user = await requireAuthenticatedUser(request);
  const { id } = await context.params;
  await getCustomerService().deleteAddress(user.userId, id, clientMeta(request));
  return jsonOk({ deleted: true as const }, { status: 200, requestId });
});
