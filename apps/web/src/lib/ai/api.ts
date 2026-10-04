import { paths, type AiConversationDto } from '@eckamcreation/api-contracts';
import { apiRequest } from '@/lib/api/client';

export function createAiConversation(content: string, idempotencyKey: string) {
  return apiRequest<AiConversationDto>(paths.ai.conversations, {
    method: 'POST',
    idempotencyKey,
    body: {
      channel: 'web',
      content,
    },
  });
}

export function sendAiMessage(conversationId: string, content: string, idempotencyKey: string) {
  return apiRequest<AiConversationDto>(paths.ai.messages(conversationId), {
    method: 'POST',
    idempotencyKey,
    body: { content },
  });
}

export function getAiConversation(conversationId: string) {
  return apiRequest<AiConversationDto>(paths.ai.conversation(conversationId));
}
