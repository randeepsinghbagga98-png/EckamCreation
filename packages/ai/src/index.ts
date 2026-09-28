export type EckamAiCapability =
  | "product-discovery"
  | "natural-language-search"
  | "recommendations"
  | "comparison"
  | "product-qa"
  | "order-assistance"
  | "shipping-information"
  | "support-assistance";

export type AiTurnResult = {
  conversationId: string;
  assistantMessage: string;
  toolCalls: Array<{ toolName: string; success: boolean }>;
};

export interface EckamAiService {
  readonly name: "eckam-ai";
  isConfigured(): boolean;
  createConversation(input?: { channel?: string; title?: string; userId?: string }): Promise<{ id: string }>;
  sendMessage(input: { conversationId: string; content: string; userId?: string }): Promise<AiTurnResult>;
}

export class NotImplementedAiError extends Error {
  readonly code = "NOT_IMPLEMENTED" as const;
  constructor(method: string) {
    super(`EckamAiService.${method} is not implemented yet`);
    this.name = "NotImplementedAiError";
  }
}

export function createEckamAiService(apiKey?: string): EckamAiService {
  return {
    name: "eckam-ai",
    isConfigured() {
      return Boolean(apiKey);
    },
    async createConversation() {
      throw new NotImplementedAiError("createConversation");
    },
    async sendMessage() {
      throw new NotImplementedAiError("sendMessage");
    },
  };
}
