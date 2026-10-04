import { aiCreateConversationSchema } from "@eckamcreation/api-contracts";
import { prisma } from "@eckamcreation/database";
import { getAiConversationService } from "../../../../lib/ai";
import { requireAuthenticatedUser } from "../../../../lib/auth/guards";
import { conflict } from "../../../../lib/errors";
import { jsonOk, withApiHandler } from "../../../../lib/http";
import {
  beginIdempotency,
  completeIdempotency,
  hashRequestBody,
  readIdempotencyKey,
} from "../../../../lib/idempotency";
import { parseJsonBody } from "../../../../lib/parse-json";
import { enforceAiConversationRateLimit, enforceAiMessageRateLimit } from "../../../../lib/ai/rate-limit";

export const POST = withApiHandler(async (request, requestId) => {
  const user = await requireAuthenticatedUser(request);
  const body = await parseJsonBody(request, aiCreateConversationSchema);
  await enforceAiConversationRateLimit(user.userId);
  if (body.content) {
    await enforceAiMessageRateLimit(user.userId);
  }
  const service = getAiConversationService();
  const idemKey = readIdempotencyKey(request);
  let idemRecordId: string | null = null;

  if (idemKey) {
    const begun = await beginIdempotency(prisma, {
      scope: `ai.conversations.create:${user.userId}`,
      key: idemKey,
      requestHash: hashRequestBody(body),
    });
    if (begun.replay) {
      if (!begun.responseHash) {
        throw conflict("Idempotent request is already in progress");
      }
      const replayed = await service.getConversation(user.userId, begun.responseHash);
      return jsonOk(replayed, { status: begun.statusCode, requestId });
    }
    idemRecordId = begun.recordId;
  }

  try {
    const conversation = await service.createConversation({
      userId: user.userId,
      channel: body.channel,
      title: body.title,
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
