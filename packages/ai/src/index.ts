export type { EckamAiCapability } from "./types";
export type {
  AiChatMessage,
  AiMessageRole,
  AiProviderKind,
  AiProviderTurnInput,
  AiProviderTurnResult,
  AiToolCallRequest,
  AiToolCallResult,
  AiToolCallStatus,
  AiTurnRequest,
  AiTurnResult,
  AiUsageMetadata,
} from "./types";

export { ECKAM_AI_SYSTEM_INSTRUCTION } from "./system-prompt";
export type { AiProvider } from "./provider";
export { AiProviderRegistry } from "./registry";
export {
  createAiProviderRegistryFromEnv,
  preferredAiProviderId,
  resolveAiProviderFromEnv,
} from "./providers/from-env";
export type { AiProviderEnv, CreateAiProvidersFromEnvOptions } from "./providers/from-env";
export {
  OPENAI_AI_PROVIDER_ID,
  OPENAI_DEFAULT_TIMEOUT_MS,
  OpenAiProvider,
  createOpenAiProvider,
  fromOpenAiResponse,
  mapOpenAiError,
  toOpenAiRequest,
} from "./providers/openai";
export type {
  OpenAiProviderConfig,
  OpenAiTransport,
  OpenAiTransportRequest,
  OpenAiTransportResponse,
} from "./providers/openai";
export {
  DEVELOPMENT_AI_MESSAGE,
  DEVELOPMENT_AI_MODEL,
  DEVELOPMENT_AI_PROVIDER_ID,
  DevelopmentAiProvider,
  assertDevelopmentAiProviderAllowed,
} from "./development-provider";
export { AI_MAX_TOOL_ITERATIONS, DefaultEckamAiService, createEckamAiService } from "./service";
export type { CreateEckamAiServiceOptions, EckamAiService } from "./service";
export { AI_TOOL_ARGS_MAX_BYTES, AI_TOOL_NAME_PATTERN, AiToolRegistry, normalizeToolArgs } from "./tools";
export type { AiTool, AiToolContext, AiToolResult } from "./tools";
export {
  AI_TOOL_PERMISSIONS,
  AI_TOOL_PERMISSION_MUTATION,
  AI_TOOL_PERMISSION_READ_ONLY,
  isMutationAiTool,
} from "./tool-permissions";
export type { AiToolPermission } from "./tool-permissions";

export {
  AiConversationForbiddenError,
  AiConversationNotFoundError,
  AiError,
  AiInvalidMessageError,
  AiProviderAuthFailedError,
  AiProviderError,
  AiProviderInvalidRequestError,
  AiProviderNotConfiguredError,
  AiProviderRateLimitedError,
  AiProviderTimeoutError,
  AiProviderUnavailableError,
  AiToolExecutionFailedError,
  AiToolInvalidArgumentsError,
  AiToolLoopLimitError,
  AiToolNotFoundError,
  toSanitizedAiProviderError,
  toSanitizedAiToolError,
} from "./errors";
export type { AiErrorCode } from "./errors";
