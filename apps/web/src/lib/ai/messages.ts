import type { AiConversationDto, AiMessageDto } from '@eckamcreation/api-contracts';
import type { AiChatMessage } from './types';

const SECRET_PATTERN = /AI_API_KEY|sk-[a-zA-Z0-9]{16,}|Bearer\s+[A-Za-z0-9._-]+/g;

export function toChatMessages(conversation: AiConversationDto): AiChatMessage[] {
  return (conversation.messages ?? [])
    .filter((message): message is AiMessageDto & { role: 'USER' | 'ASSISTANT' } => {
      return message.role === 'USER' || message.role === 'ASSISTANT';
    })
    .map((message) => ({
      id: message.id,
      role: message.role,
      content: sanitizeAssistantText(message.content),
      products: message.products,
      commerce: message.commerce,
      comparison: message.comparison,
      orders: message.orders,
      orderStatus: message.orderStatus,
      tracking: message.tracking,
      cancellation: message.cancellation,
    }));
}

export function sanitizeAssistantText(value: string): string {
  return value.replace(SECRET_PATTERN, '').replace(/\s{2,}/g, ' ').trim();
}

export function createLocalId(prefix: string): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}`;
}

export function splitAssistantLines(content: string): string[] {
  return content.split(/\n+/).map((line) => line.trim()).filter(Boolean);
}
