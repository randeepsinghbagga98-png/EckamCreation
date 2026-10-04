export type EckamAiCapability =
  | "product-discovery"
  | "natural-language-search"
  | "recommendations"
  | "comparison"
  | "product-qa"
  | "order-assistance"
  | "shipping-information"
  | "support-assistance";

export type AiMessageRole = "system" | "user" | "assistant" | "tool";

export type AiToolCallStatus = "pending" | "success" | "error";

export type AiToolCallRequest = {
  id?: string;
  toolName: string;
  arguments: Record<string, unknown>;
};

export type AiToolCallResult = {
  toolName: string;
  arguments?: Record<string, unknown>;
  result?: unknown;
  status: AiToolCallStatus;
  durationMs?: number;
  error?: string;
};

export type AiChatMessage = {
  role: AiMessageRole;
  content: string;
  toolCalls?: AiToolCallRequest[];
};

export type AiUsageMetadata = {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
};

export type AiProviderKind = "development" | "production";

export type AiProviderTurnInput = {
  conversationId: string;
  messages: AiChatMessage[];
  systemInstruction: string;
  tools?: Array<{ name: string; description?: string }>;
};

export type AiProviderTurnResult = {
  text: string;
  toolCalls?: AiToolCallRequest[];
  usage?: AiUsageMetadata;
  provider: string;
  model?: string;
};

export type AiTurnRequest = {
  conversationId: string;
  userId?: string;
  messages: AiChatMessage[];
  tools?: Array<{ name: string; description?: string }>;
};

export type AiTurnResult = {
  assistantMessage: string;
  toolCalls: AiToolCallResult[];
  usage?: AiUsageMetadata;
  provider: string;
  model?: string;
};
