import { AiProviderNotConfiguredError, toSanitizedAiProviderError } from "./errors";
import type { AiProvider } from "./provider";
import type { AiProviderTurnInput, AiProviderTurnResult, AiToolCallRequest } from "./types";

export const DEVELOPMENT_AI_PROVIDER_ID = "development" as const;
export const DEVELOPMENT_AI_MODEL = "development-deterministic" as const;
export const DEVELOPMENT_AI_MESSAGE = "Eckam AI development provider is connected.";

/**
 * Development-only deterministic adapter.
 * Verifies conversation flow. Must never be registered in production.
 * Does not invent products, prices, or recommendations.
 */
export class DevelopmentAiProvider implements AiProvider {
  readonly id = DEVELOPMENT_AI_PROVIDER_ID;
  readonly kind = "development" as const;
  private nextFailure: unknown = null;
  private queuedToolCalls: AiToolCallRequest[] = [];

  constructor(private readonly nodeEnv?: string) {}

  isConfigured(): boolean {
    return true;
  }

  /** Test hook — next completeTurn fails with a sanitized provider error. */
  failNext(error: unknown): void {
    this.nextFailure = error;
  }

  /** Test hook — next completeTurn emits these tool calls, then a text reply. */
  queueToolCalls(calls: AiToolCallRequest[]): void {
    this.queuedToolCalls = [...calls];
  }

  async completeTurn(_input: AiProviderTurnInput): Promise<AiProviderTurnResult> {
    assertDevelopmentAiProviderAllowed(this.nodeEnv);

    if (this.nextFailure) {
      const failure = this.nextFailure;
      this.nextFailure = null;
      throw toSanitizedAiProviderError(failure);
    }

    if (this.queuedToolCalls.length > 0) {
      const toolCalls = this.queuedToolCalls;
      this.queuedToolCalls = [];
      return {
        text: "",
        toolCalls,
        provider: DEVELOPMENT_AI_PROVIDER_ID,
        model: DEVELOPMENT_AI_MODEL,
      };
    }

    return {
      text: DEVELOPMENT_AI_MESSAGE,
      toolCalls: [],
      provider: DEVELOPMENT_AI_PROVIDER_ID,
      model: DEVELOPMENT_AI_MODEL,
    };
  }
}

export function assertDevelopmentAiProviderAllowed(nodeEnv: string | undefined): void {
  if (nodeEnv === "production") {
    throw new AiProviderNotConfiguredError("Development AI provider is not allowed in production");
  }
}
