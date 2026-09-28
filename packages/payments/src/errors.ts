export class PaymentError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "PaymentError";
    this.code = code;
  }
}

export class PaymentProviderNotConfiguredError extends PaymentError {
  constructor(providerId?: string) {
    super(
      "PAYMENT_PROVIDER_NOT_CONFIGURED",
      providerId
        ? `Payment provider "${providerId}" is not configured`
        : "No payment provider is configured",
    );
    this.name = "PaymentProviderNotConfiguredError";
  }
}

export class PaymentConflictError extends PaymentError {
  constructor(message: string) {
    super("CONFLICT", message);
    this.name = "PaymentConflictError";
  }
}

export class PaymentValidationError extends PaymentError {
  constructor(message: string) {
    super("VALIDATION_ERROR", message);
    this.name = "PaymentValidationError";
  }
}

export class PaymentNotFoundError extends PaymentError {
  constructor(message = "Payment intent not found") {
    super("NOT_FOUND", message);
    this.name = "PaymentNotFoundError";
  }
}

export class PaymentUnauthorizedWebhookError extends PaymentError {
  constructor(message = "Webhook signature verification failed") {
    super("UNAUTHORIZED", message);
    this.name = "PaymentUnauthorizedWebhookError";
  }
}
