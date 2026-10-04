import type {
  AiCancellationResultDto,
  AiCommerceActionDto,
  AiComparisonDto,
  AiConversationProductDto,
  AiOrderStatusDto,
  AiOrderSummaryDto,
  AiTrackingResultDto,
} from '@eckamcreation/api-contracts';

export type AiChatRole = 'USER' | 'ASSISTANT';

export type AiChatProduct = AiConversationProductDto;
export type AiChatCommerce = AiCommerceActionDto;
export type AiChatComparison = AiComparisonDto;
export type AiChatOrder = AiOrderSummaryDto;
export type AiChatOrderStatus = AiOrderStatusDto;
export type AiChatTracking = AiTrackingResultDto;
export type AiChatCancellation = AiCancellationResultDto;

export type AiChatMessage = {
  id: string;
  role: AiChatRole;
  content: string;
  products?: AiChatProduct[];
  commerce?: AiChatCommerce;
  comparison?: AiChatComparison;
  orders?: AiChatOrder[];
  orderStatus?: AiChatOrderStatus;
  tracking?: AiChatTracking;
  cancellation?: AiChatCancellation;
};

export type AiChatErrorKind = 'unavailable' | 'invalid' | 'network' | 'auth';

export type AiChatError = {
  kind: AiChatErrorKind;
  message: string;
};

export type AiChatPhase = 'welcome' | 'ready' | 'sending' | 'error';

export type AiChatSnapshot = {
  open: boolean;
  phase: AiChatPhase;
  conversationId: string | null;
  messages: AiChatMessage[];
  error: AiChatError | null;
  lastPrompt: string | null;
  pending: boolean;
};

export const AI_SUGGESTED_PROMPTS = [
  'Show me black bags',
  'Find jewellery under ₹3,000',
  "What's new?",
  'Show me home decor',
] as const;
