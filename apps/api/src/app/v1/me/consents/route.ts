import { consentCreateSchema } from "@eckamcreation/api-contracts";
import { clientMeta, requireAuthenticatedUser } from "../../../../lib/auth/guards";
import { getCustomerService } from "../../../../lib/customer";
import { jsonOk, withApiHandler } from "../../../../lib/http";
import { parseJsonBody } from "../../../../lib/parse-json";

export const GET = withApiHandler(async (request, requestId) => {
  const user = await requireAuthenticatedUser(request);
  const items = await getCustomerService().listConsents(user.userId);
  return jsonOk({ items }, { requestId });
});

export const POST = withApiHandler(async (request, requestId) => {
  const user = await requireAuthenticatedUser(request);
  const body = await parseJsonBody(request, consentCreateSchema);
  const consent = await getCustomerService().createConsent(
    user.userId,
    body,
    clientMeta(request),
  );
  return jsonOk(consent, { status: 201, requestId });
});
