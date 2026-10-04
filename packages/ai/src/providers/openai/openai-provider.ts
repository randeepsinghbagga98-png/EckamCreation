import OpenAI, {
  APIConnectionTimeoutError,
  APIError,
  APIUserAbortError,
  AuthenticationError,
  PermissionDeniedError,
  RateLimitError,
} from "openai";
import {
  AiError,
  AiProviderAuthFailedError,
  AiProviderInvalidRequestError,
  AiProviderNotConfiguredError,
  AiProviderRateLimitedError,
  AiProviderTimeoutError,
  AiProviderUnavailableError,
  toSanitizedAiProviderError,
} from "../../errors";
import type { AiProvider } from "../../provider";
import type {
  AiChatMessage,
  AiProviderTurnInput,
  AiProviderTurnResult,
  AiToolCallRequest,
} from "../../types";

export const OPENAI_AI_PROVIDER_ID = "openai" as const;
export const OPENAI_DEFAULT_TIMEOUT_MS = 20_000;

export type OpenAiTransportRequest = {
  model: string;
  messages: Array<Record<string, unknown>>;
  tools?: Array<Record<string, unknown>>;
};

export type OpenAiTransportResponse = {
  model?: string;
  choices?: Array<{
    message?: {
      content?: string | null;
      tool_calls?: Array<{
        id?: string;
        function?: {
          name?: string;
          arguments?: string;
        };
      }>;
    };
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
};

export type OpenAiTransport = (
  request: OpenAiTransportRequest,
  options: { signal: AbortSignal },
) => Promise<OpenAiTransportResponse>;

export type OpenAiProviderConfig = {
  apiKey?: string;
  model?: string;
  baseUrl?: string;
  timeoutMs?: number;
  transport?: OpenAiTransport;
};

export class OpenAiProvider implements AiProvider {
  readonly id = OPENAI_AI_PROVIDER_ID;
  readonly kind = "production" as const;
  private readonly apiKey: string;
  private readonly model: string;
  private readonly timeoutMs: number;
  private readonly transport: OpenAiTransport;

  constructor(config: OpenAiProviderConfig) {
    this.apiKey = config.apiKey?.trim() ?? "";
    this.model = config.model?.trim() ?? "";
    this.timeoutMs = config.timeoutMs ?? OPENAI_DEFAULT_TIMEOUT_MS;
    this.transport = config.transport ?? createOfficialOpenAiTransport(config, this.timeoutMs);
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey && this.model);
  }

  async completeTurn(input: AiProviderTurnInput): Promise<AiProviderTurnResult> {
    if (!this.isConfigured()) {
      throw new AiProviderNotConfiguredError("AI provider \"openai\" is not configured");
    }

    const request = toOpenAiRequest(this.model, input);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await this.transport(request, { signal: controller.signal });
      return fromOpenAiResponse(response);
    } catch (error) {
      throw mapOpenAiError(error);
    } finally {
      clearTimeout(timer);
    }
  }
}

export function createOpenAiProvider(config: OpenAiProviderConfig): OpenAiProvider {
  return new OpenAiProvider(config);
}

export function toOpenAiRequest(model: string, input: AiProviderTurnInput): OpenAiTransportRequest {
  const messages: Array<Record<string, unknown>> = [
    { role: "system", content: input.systemInstruction },
    ...input.messages.map(toOpenAiMessage),
  ];

  const tools = (input.tools ?? []).map((tool) => ({
    type: "function",
    function: {
      name: tool.name,
      description: tool.description,
      parameters: {
        type: "object",
        additionalProperties: true,
      },
    },
  }));

  return {
    model,
    messages,
    ...(tools.length > 0 ? { tools } : {}),
  };
}

export function fromOpenAiResponse(response: OpenAiTransportResponse): AiProviderTurnResult {
  const message = response.choices?.[0]?.message;
  const toolCalls = (message?.tool_calls ?? [])
    .map((call): AiToolCallRequest | null => {
      const toolName = call.function?.name?.trim();
      if (!toolName) {
        return null;
      }
      return {
        id: call.id,
        toolName,
        arguments: parseToolArguments(call.function?.arguments),
      };
    })
    .filter((call): call is AiToolCallRequest => Boolean(call));

  return {
    text: message?.content ?? "",
    toolCalls,
    usage: response.usage
      ? {
          promptTokens: response.usage.prompt_tokens,
          completionTokens: response.usage.completion_tokens,
          totalTokens: response.usage.total_tokens,
        }
      : undefined,
    provider: OPENAI_AI_PROVIDER_ID,
    model: response.model,
  };
}

function toOpenAiMessage(message: AiChatMessage): Record<string, unknown> {
  if (message.role === "tool") {
    return {
      role: "tool",
      tool_call_id: message.toolCalls?.[0]?.id ?? "tool_call",
      content: message.content,
    };
  }

  if (message.role === "assistant" && message.toolCalls?.length) {
    return {
      role: "assistant",
      content: message.content || null,
      tool_calls: message.toolCalls.map((call, index) => ({
        id: call.id ?? `tool_call_${index}`,
        type: "function",
        function: {
          name: call.toolName,
          arguments: JSON.stringify(call.arguments ?? {}),
        },
      })),
    };
  }

  return {
    role: message.role === "system" ? "system" : message.role,
    content: message.content,
  };
}

function parseToolArguments(raw: string | undefined): Record<string, unknown> {
  if (!raw?.trim()) {
    return {};
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return {};
  } catch {
    return {};
  }
}

function createOfficialOpenAiTransport(
  config: OpenAiProviderConfig,
  timeoutMs: number,
): OpenAiTransport {
  return async (request, options) => {
    const client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
      timeout: timeoutMs,
      maxRetries: 0,
    });

    const completion = await client.chat.completions.create(
      {
        model: request.model,
        messages: request.messages as never,
        tools: request.tools as never,
      },
      { signal: options.signal, timeout: timeoutMs },
    );

    return {
      model: completion.model,
      choices: completion.choices.map((choice) => ({
        message: {
          content: choice.message.content,
          tool_calls: choice.message.tool_calls?.map((call) =>
            "function" in call
              ? {
                  id: call.id,
                  function: {
                    name: call.function.name,
                    arguments: call.function.arguments,
                  },
                }
              : { id: call.id },
          ),
        },
      })),
      usage: completion.usage
        ? {
            prompt_tokens: completion.usage.prompt_tokens,
            completion_tokens: completion.usage.completion_tokens,
            total_tokens: completion.usage.total_tokens,
          }
        : undefined,
    };
  };
}

export function mapOpenAiError(error: unknown): AiError {
  if (error instanceof AiError) {
    return error;
  }
  if (error instanceof AuthenticationError || error instanceof PermissionDeniedError) {
    return new AiProviderAuthFailedError();
  }
  if (error instanceof RateLimitError) {
    return new AiProviderRateLimitedError();
  }
  if (error instanceof APIConnectionTimeoutError || error instanceof APIUserAbortError) {
    return new AiProviderTimeoutError();
  }
  if (error instanceof APIError) {
    if (error.status === 400 || error.status === 422) {
      return new AiProviderInvalidRequestError();
    }
    if (error.status === 401 || error.status === 403) {
      return new AiProviderAuthFailedError();
    }
    if (error.status === 408) {
      return new AiProviderTimeoutError();
    }
    if (error.status === 429) {
      return new AiProviderRateLimitedError();
    }
    if (error.status && error.status >= 500) {
      return new AiProviderUnavailableError();
    }
  }
  if (error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError")) {
    return new AiProviderTimeoutError();
  }
  return toSanitizedAiProviderError(error);
}
