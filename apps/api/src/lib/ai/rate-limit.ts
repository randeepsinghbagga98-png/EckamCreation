import { prisma } from "@eckamcreation/database";
import { ApiError } from "../errors";

export const AI_RATE_WINDOW_MS = 15 * 60 * 1000;
export const AI_CONVERSATION_LIMIT = 10;
export const AI_MESSAGE_LIMIT = 30;

/**
 * Database-backed AI rate limits keyed by authenticated user.
 * Shared across API instances because counts use PostgreSQL, not process memory.
 * Production still benefits from REDIS_URL for auth/cart memory buckets;
 * AI conversation/message limits do not depend on Redis.
 */
export async function enforceAiConversationRateLimit(userId: string): Promise<void> {
  const since = new Date(Date.now() - AI_RATE_WINDOW_MS);
  const count = await prisma.aiConversation.count({
    where: { userId, createdAt: { gte: since } },
  });
  if (count >= AI_CONVERSATION_LIMIT) {
    throw new ApiError("RATE_LIMITED", "Too many Eckam AI conversations. Please try again shortly.", {
      status: 429,
    });
  }
}

export async function enforceAiMessageRateLimit(userId: string): Promise<void> {
  const since = new Date(Date.now() - AI_RATE_WINDOW_MS);
  const count = await prisma.aiMessage.count({
    where: {
      role: "USER",
      createdAt: { gte: since },
      conversation: { userId },
    },
  });
  if (count >= AI_MESSAGE_LIMIT) {
    throw new ApiError("RATE_LIMITED", "Too many Eckam AI messages. Please try again shortly.", {
      status: 429,
    });
  }
}
