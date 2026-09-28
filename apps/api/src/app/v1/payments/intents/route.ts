import { moneyFromBigInt, paymentIntentCreateSchema } from "@eckamcreation/api-contracts";
import { resolveCartIdentity } from "../../../../lib/cart";
import { getPaymentService } from "../../../../lib/payments";
import {
  beginIdempotency,
  completeIdempotency,
  hashRequestBody,
  readIdempotencyKey,
} from "../../../../lib/idempotency";
import { prisma } from "@eckamcreation/database";
import { unauthorized } from "../../../../lib/errors";
import { jsonOk, withApiHandler } from "../../../../lib/http";
import { parseJsonBody } from "../../../../lib/parse-json";

export const POST = withApiHandler(async (request, requestId) => {
  const identity = await resolveCartIdentity(request);
  if (!identity) throw unauthorized("Cart identity required (session or X-Cart-Token)");

  const body = await parseJsonBody(request, paymentIntentCreateSchema);
  const idemKey = readIdempotencyKey(request);
  let idemRecordId: string | null = null;
  // Hash only authoritative create fields so ignored client amount doesn't break replay.
  const idemHash = hashRequestBody({
    checkoutSessionId: body.checkoutSessionId,
    provider: body.provider ?? null,
  });

  if (idemKey) {
    const begun = await beginIdempotency(prisma, {
      scope: "payments.intents.create",
      key: idemKey,
      requestHash: idemHash,
    });
    if (begun.replay) {
      const intent = await getPaymentService().createIntent({
        checkoutSessionId: body.checkoutSessionId,
        preferredProvider: body.provider,
        userId: identity.kind === "customer" ? identity.userId : null,
        guestToken: identity.kind === "guest" ? identity.guestToken : null,
        idempotencyKey: `checkout:${body.checkoutSessionId}`,
      });
      return jsonOk(toClient(intent), { status: 200, requestId });
    }
    idemRecordId = begun.recordId;
  }

  try {
    const intent = await getPaymentService().createIntent({
      checkoutSessionId: body.checkoutSessionId,
      preferredProvider: body.provider,
      userId: identity.kind === "customer" ? identity.userId : null,
      guestToken: identity.kind === "guest" ? identity.guestToken : null,
      idempotencyKey: `checkout:${body.checkoutSessionId}`,
    });
    if (idemRecordId) await completeIdempotency(prisma, idemRecordId, 201);
    return jsonOk(toClient(intent), { status: 201, requestId });
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

function toClient(intent: {
  id: string;
  orderId: string | null;
  checkoutSessionId: string | null;
  provider: string;
  status: string;
  amountMinor: bigint;
  currencyCode: string;
  providerIntentId: string | null;
  createdAt: string;
}) {
  return {
    id: intent.id,
    orderId: intent.orderId,
    checkoutSessionId: intent.checkoutSessionId,
    provider: intent.provider,
    status: intent.status,
    amount: moneyFromBigInt(intent.amountMinor, intent.currencyCode),
    providerIntentId: intent.providerIntentId,
    createdAt: intent.createdAt,
  };
}
