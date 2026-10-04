import { getAiConversationService } from "../../../../../lib/ai";
import { requireAuthenticatedUser } from "../../../../../lib/auth/guards";
import { jsonOk, withApiHandler } from "../../../../../lib/http";

type Ctx = { params: Promise<{ id: string }> };

export const GET = withApiHandler(async (request, requestId, context: Ctx) => {
  const user = await requireAuthenticatedUser(request);
  const { id } = await context.params;
  const conversation = await getAiConversationService().getConversation(user.userId, id);
  return jsonOk(conversation, { requestId });
});
