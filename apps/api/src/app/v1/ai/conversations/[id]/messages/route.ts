import { aiMessageCreateSchema } from "@eckamcreation/api-contracts";
import { prisma } from "@eckamcreation/database";
import { getAiConversationService } from "../../../../../../lib/ai";
import { requireAuthenticatedUser } from "../../../../../../lib/auth/guards";
import { jsonOk, withApiHandler } from "../../../../../../lib/http";
import {
  beginIdempotency,
  completeIdempotency,
  hashRequestBody,
  readIdempotencyKey,
} from "../../../../../../lib/idempotency";
import { parseJsonBody } from "../../../../../../lib/parse-json";
import { enforceAiMessageRateLimit } from "../../../../../../lib/ai/rate-limit";

type Ctx = { params: Promise<{ id: string }> };

export const POST = withApiHandler(async (request, requestId, context: Ctx) => {
  const user = await requireAuthenticatedUser(request);
  const { id } = await context.params;
  await enforceAiMessageRateLimit(user.userId);
  const body = await parseJsonBody(request, aiMessageCreateSchema);
  const service = getAiConversationService();
  const idemKey = readIdempotencyKey(request);
  let idemRecordId: string | null = null;

  if (idemKey) {
    const begun = await beginIdempotency(prisma, {
      scope: `ai.conversations.messages:${user.userId}:${id}`,
      key: idemKey,
      requestHash: hashRequestBody(body),
    });
    if (begun.replay) {
      const replayed = await service.getConversation(user.userId, id);
      return jsonOk(replayed, { status: begun.statusCode, requestId });
    }
    idemRecordId = begun.recordId;
  }

  try {
    const conversation = await service.sendMessage({
      userId: user.userId,
      conversationId: id,
      content: body.content,
    });
    if (idemRecordId) {
      await completeIdempotency(prisma, idemRecordId, 201, conversation.id);
    }
    return jsonOk(conversation, { status: 201, requestId });
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
