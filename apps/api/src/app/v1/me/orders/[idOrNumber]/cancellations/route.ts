import { cancellationCreateSchema } from "@eckamcreation/api-contracts";
import { requireAuthenticatedUser } from "../../../../../../lib/auth/guards";
import { getOrderService } from "../../../../../../lib/orders";
import { jsonOk, withApiHandler } from "../../../../../../lib/http";
import { parseJsonBody } from "../../../../../../lib/parse-json";

type Ctx = { params: Promise<{ idOrNumber: string }> };

export const POST = withApiHandler(async (request, requestId, context: Ctx) => {
  const user = await requireAuthenticatedUser(request);
  const { idOrNumber } = await context.params;
  const body = await parseJsonBody(request, cancellationCreateSchema);
  const cancellation = await getOrderService().requestCancellation(
    user.userId,
    idOrNumber,
    body.reason,
  );
  return jsonOk(cancellation, { status: 201, requestId });
});
