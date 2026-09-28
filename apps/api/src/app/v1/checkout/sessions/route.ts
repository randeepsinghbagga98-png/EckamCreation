import { unauthorized } from "../../../../lib/errors";
import { jsonOk, withApiHandler } from "../../../../lib/http";
import { parseJsonBody } from "../../../../lib/parse-json";
import { checkoutCreateSchema } from "@eckamcreation/api-contracts";
import { enforceCartRateLimit } from "../../../../lib/auth/enforce-rate-limit";
import { resolveCartIdentity } from "../../../../lib/cart";
import { getCheckoutService } from "../../../../lib/checkout";
import {
  beginIdempotency,
  completeIdempotency,
  hashRequestBody,
  readIdempotencyKey,
} from "../../../../lib/idempotency";
import { prisma } from "@eckamcreation/database";

export const POST = withApiHandler(async (request, requestId) => {
  await enforceCartRateLimit(request, "checkout.start");
  const identity = await resolveCartIdentity(request);
  if (!identity) throw unauthorized("Cart identity required (session or X-Cart-Token)");

  const body = await parseJsonBody(request, checkoutCreateSchema);
  const idemKey = readIdempotencyKey(request);
  let idemRecordId: string | null = null;

  if (idemKey) {
    const begun = await beginIdempotency(prisma, {
      scope: "checkout.start",
      key: idemKey,
      requestHash: hashRequestBody(body),
    });
    if (begun.replay) {
      // Replay: return current session for this identity's cart
      const session = await getCheckoutService().start(identity, {
        cartId: body.cartId,
        currencyCode: body.currency,
        countryCode: body.country,
      });
      return jsonOk(session, { status: begun.statusCode === 201 ? 201 : 200, requestId });
    }
    idemRecordId = begun.recordId;
  }

  try {
    const session = await getCheckoutService().start(identity, {
      cartId: body.cartId,
      currencyCode: body.currency,
      countryCode: body.country,
    });
    if (idemRecordId) await completeIdempotency(prisma, idemRecordId, 201);
    return jsonOk(session, { status: 201, requestId });
  } catch (error) {
    if (idemRecordId) {
      try {
        await prisma.idempotencyRecord.delete({ where: { id: idemRecordId } });
      } catch {
        /* ignore */
      }
    }
    throw error;
  }
});
