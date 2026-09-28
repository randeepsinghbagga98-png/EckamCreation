export type WhatsAppEvent =
  | "order-confirmation"
  | "payment-confirmation"
  | "shipping-update"
  | "delivery-update"
  | "cancellation"
  | "refund"
  | "support";

export interface WhatsAppOutbound {
  event: WhatsAppEvent;
  toPhone: string;
  templateCode?: string;
  variables?: Record<string, string>;
}

export interface WhatsAppService {
  isConfigured(): boolean;
  enqueue?(message: WhatsAppOutbound): Promise<{ outboxId: string }>;
  handleInboundWebhook?(payload: unknown): Promise<{ duplicate: boolean }>;
}

export class NotImplementedWhatsAppError extends Error {
  readonly code = "NOT_IMPLEMENTED" as const;
  constructor(method: string) {
    super(`WhatsAppService.${method} is not implemented yet`);
    this.name = "NotImplementedWhatsAppError";
  }
}

export function createWhatsAppService(apiKey?: string): WhatsAppService {
  return {
    isConfigured() {
      return Boolean(apiKey);
    },
    async enqueue() {
      throw new NotImplementedWhatsAppError("enqueue");
    },
    async handleInboundWebhook() {
      throw new NotImplementedWhatsAppError("handleInboundWebhook");
    },
  };
}
