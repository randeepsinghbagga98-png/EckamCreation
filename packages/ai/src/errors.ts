export type AiErrorCode =
  | "AI_PROVIDER_NOT_CONFIGURED"
  | "AI_CONVERSATION_NOT_FOUND"
  | "AI_CONVERSATION_FORBIDDEN"
  | "AI_INVALID_MESSAGE"
  | "AI_PROVIDER_ERROR"
  | "AI_PROVIDER_AUTH_FAILED"
  | "AI_PROVIDER_RATE_LIMITED"
  | "AI_PROVIDER_TIMEOUT"
  | "AI_PROVIDER_UNAVAILABLE"
  | "AI_PROVIDER_INVALID_REQUEST"
  | "AI_TOOL_NOT_FOUND"
  | "AI_TOOL_INVALID_ARGUMENTS"
  | "AI_TOOL_EXECUTION_FAILED"
  | "AI_TOOL_LOOP_LIMIT";

export class AiError extends Error {
  readonly code: AiErrorCode;

  constructor(code: AiErrorCode, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "AiError";
    this.code = code;
  }
}

export class AiProviderNotConfiguredError extends AiError {
  constructor(message = "No AI provider is configured") {
    super("AI_PROVIDER_NOT_CONFIGURED", message);
    this.name = "AiProviderNotConfiguredError";
  }
}

export class AiConversationNotFoundError extends AiError {
  constructor(message = "Conversation not found") {
    super("AI_CONVERSATION_NOT_FOUND", message);
    this.name = "AiConversationNotFoundError";
  }
}

export class AiConversationForbiddenError extends AiError {
  constructor(message = "Conversation access denied") {
    super("AI_CONVERSATION_FORBIDDEN", message);
    this.name = "AiConversationForbiddenError";
  }
}

export class AiInvalidMessageError extends AiError {
  constructor(message = "Message is invalid") {
    super("AI_INVALID_MESSAGE", message);
    this.name = "AiInvalidMessageError";
  }
}

/** Public message is always generic — never include provider payloads or secrets. */
export class AiProviderError extends AiError {
  constructor(message = "The AI provider failed to complete this request", options?: { cause?: unknown }) {
    super("AI_PROVIDER_ERROR", message, options);
    this.name = "AiProviderError";
  }
}

export class AiProviderAuthFailedError extends AiError {
  constructor(message = "The AI provider rejected the request") {
    super("AI_PROVIDER_AUTH_FAILED", message);
    this.name = "AiProviderAuthFailedError";
  }
}

export class AiProviderRateLimitedError extends AiError {
  constructor(message = "The AI provider is rate limited") {
    super("AI_PROVIDER_RATE_LIMITED", message);
    this.name = "AiProviderRateLimitedError";
  }
}

export class AiProviderTimeoutError extends AiError {
  constructor(message = "The AI provider timed out") {
    super("AI_PROVIDER_TIMEOUT", message);
    this.name = "AiProviderTimeoutError";
  }
}

export class AiProviderUnavailableError extends AiError {
  constructor(message = "The AI provider is unavailable") {
    super("AI_PROVIDER_UNAVAILABLE", message);
    this.name = "AiProviderUnavailableError";
  }
}

export class AiProviderInvalidRequestError extends AiError {
  constructor(message = "The AI provider rejected the request as invalid") {
    super("AI_PROVIDER_INVALID_REQUEST", message);
    this.name = "AiProviderInvalidRequestError";
  }
}

export class AiToolNotFoundError extends AiError {
  constructor(message = "Requested AI tool is not available") {
    super("AI_TOOL_NOT_FOUND", message);
    this.name = "AiToolNotFoundError";
  }
}

export class AiToolInvalidArgumentsError extends AiError {
  constructor(message = "AI tool arguments are invalid") {
    super("AI_TOOL_INVALID_ARGUMENTS", message);
    this.name = "AiToolInvalidArgumentsError";
  }
}

export class AiToolExecutionFailedError extends AiError {
  constructor(message = "The catalogue tool failed to complete this request") {
    super("AI_TOOL_EXECUTION_FAILED", message);
    this.name = "AiToolExecutionFailedError";
  }
}

export class AiToolLoopLimitError extends AiError {
  constructor(message = "The AI tool loop limit was reached") {
    super("AI_TOOL_LOOP_LIMIT", message);
    this.name = "AiToolLoopLimitError";
  }
}

export function toSanitizedAiToolError(error: unknown): AiError {
  if (error instanceof AiError) {
    return error;
  }
  return new AiToolExecutionFailedError();
}

export function toSanitizedAiProviderError(error: unknown): AiProviderError {
  if (error instanceof AiProviderError) {
    return error;
  }
  return new AiProviderError("The AI provider failed to complete this request", { cause: error });
}
