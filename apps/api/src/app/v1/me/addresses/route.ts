import { addressCreateSchema } from "@eckamcreation/api-contracts";
import { clientMeta, requireAuthenticatedUser } from "../../../../lib/auth/guards";
import { getCustomerService } from "../../../../lib/customer";
import { jsonOk, withApiHandler } from "../../../../lib/http";
import { parseJsonBody } from "../../../../lib/parse-json";

export const GET = withApiHandler(async (request, requestId) => {
  const user = await requireAuthenticatedUser(request);
  const items = await getCustomerService().listAddresses(user.userId);
  return jsonOk({ items }, { requestId });
});

export const POST = withApiHandler(async (request, requestId) => {
  const user = await requireAuthenticatedUser(request);
  const body = await parseJsonBody(request, addressCreateSchema);
  const address = await getCustomerService().createAddress(user.userId, body, clientMeta(request));
  return jsonOk(address, { status: 201, requestId });
});
