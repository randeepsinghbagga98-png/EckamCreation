import { preferredAiProviderId } from "@eckamcreation/ai";
import { PERMISSIONS } from "@eckamcreation/auth";
import { requirePermission } from "../../../../../lib/auth/guards";
import { getAiRegistry, getAiToolRegistry } from "../../../../../lib/ai";
import {
  AI_CONVERSATION_LIMIT,
  AI_MESSAGE_LIMIT,
  AI_RATE_WINDOW_MS,
} from "../../../../../lib/ai/rate-limit";
import { jsonOk, withApiHandler } from "../../../../../lib/http";

export const GET = withApiHandler(async (request, requestId) => {
  await requirePermission(request, PERMISSIONS.DASHBOARD_READ);
  const preferred = preferredAiProviderId({
    AI_PROVIDER: process.env.AI_PROVIDER,
  });
  const adapter = preferred ? getAiRegistry().get(preferred) : null;
  const configured = Boolean(adapter?.isConfigured());
  const live = configured && preferred !== "development";

  return jsonOk(
    {
      configured: live,
      provider: preferred,
      model: process.env.AI_MODEL?.trim() || null,
      toolCount: getAiToolRegistry().list().length,
      featureStatus: live ? ("live" as const) : ("not_configured" as const),
      rateLimit: {
        conversationLimit: AI_CONVERSATION_LIMIT,
        messageLimit: AI_MESSAGE_LIMIT,
        windowMinutes: Math.round(AI_RATE_WINDOW_MS / 60_000),
      },
    },
    { requestId },
  );
});
