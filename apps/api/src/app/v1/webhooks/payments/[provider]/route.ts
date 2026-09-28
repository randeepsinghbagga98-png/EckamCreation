import { getPaymentService } from "../../../../../lib/payments";
import { jsonOk, withApiHandler } from "../../../../../lib/http";

type Ctx = { params: Promise<{ provider: string }> };

export const POST = withApiHandler(async (request, requestId, context: Ctx) => {
  const { provider } = await context.params;
  const rawBody = await request.text();
  let payload: unknown = {};
  try {
    payload = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    payload = {};
  }

  const result = await getPaymentService().handleWebhook({
    provider,
    headers: request.headers,
    rawBody,
    payload,
  });

  return jsonOk(
    {
      received: true as const,
      duplicate: result.duplicate,
      eventId: result.eventId,
      processed: result.processed,
    },
    { requestId },
  );
});
