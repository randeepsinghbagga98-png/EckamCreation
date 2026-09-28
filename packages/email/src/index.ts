export type EmailTemplate =
  | "welcome"
  | "verification"
  | "order-confirmation"
  | "payment-confirmation"
  | "shipping-notification"
  | "delivery-notification"
  | "cancellation"
  | "refund"
  | "password-reset"
  | "cart-reminder"
  | "review-request"
  | "admin-notification";

export interface EmailMessage {
  template: EmailTemplate;
  to: string;
  variables?: Record<string, string>;
}

export interface EmailService {
  isConfigured(): boolean;
  enqueue?(message: EmailMessage): Promise<{ outboxId: string }>;
}

export class NotImplementedEmailError extends Error {
  readonly code = "NOT_IMPLEMENTED" as const;
  constructor(method: string) {
    super(`EmailService.${method} is not implemented yet`);
    this.name = "NotImplementedEmailError";
  }
}

export function createEmailService(apiKey?: string): EmailService {
  return {
    isConfigured() {
      return Boolean(apiKey);
    },
    async enqueue() {
      throw new NotImplementedEmailError("enqueue");
    },
  };
}
