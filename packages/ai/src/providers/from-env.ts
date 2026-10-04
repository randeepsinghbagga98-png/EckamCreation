import { AiProviderNotConfiguredError } from "../errors";
import { DevelopmentAiProvider } from "../development-provider";
import type { AiProvider } from "../provider";
import { AiProviderRegistry } from "../registry";
import {
  OPENAI_AI_PROVIDER_ID,
  createOpenAiProvider,
  type OpenAiProviderConfig,
  type OpenAiTransport,
} from "./openai/openai-provider";

export type AiProviderEnv = {
  NODE_ENV?: string;
  AI_PROVIDER?: string;
  AI_API_KEY?: string;
  AI_MODEL?: string;
  AI_API_BASE_URL?: string;
};

export type CreateAiProvidersFromEnvOptions = {
  openaiTransport?: OpenAiTransport;
  openaiTimeoutMs?: number;
};

export function preferredAiProviderId(source: AiProviderEnv): string | null {
  return source.AI_PROVIDER?.trim() || null;
}

/**
 * Builds a registry from server env.
 * OpenAI is registered only when AI_PROVIDER=openai.
 * Development is registered only outside production.
 */
export function createAiProviderRegistryFromEnv(
  source: AiProviderEnv,
  options: CreateAiProvidersFromEnvOptions = {},
): AiProviderRegistry {
  const registry = new AiProviderRegistry();
  const nodeEnv = source.NODE_ENV;
  const preferred = preferredAiProviderId(source);

  if (nodeEnv !== "production") {
    registry.register(new DevelopmentAiProvider(nodeEnv));
  }

  if (preferred === OPENAI_AI_PROVIDER_ID) {
    const config: OpenAiProviderConfig = {
      apiKey: source.AI_API_KEY,
      model: source.AI_MODEL,
      baseUrl: source.AI_API_BASE_URL,
      timeoutMs: options.openaiTimeoutMs,
      transport: options.openaiTransport,
    };
    registry.register(createOpenAiProvider(config));
  }

  return registry;
}

export function resolveAiProviderFromEnv(
  source: AiProviderEnv,
  options: CreateAiProvidersFromEnvOptions = {},
): AiProvider {
  const preferred = preferredAiProviderId(source);
  if (!preferred) {
    throw new AiProviderNotConfiguredError("AI_PROVIDER is not configured");
  }
  return createAiProviderRegistryFromEnv(source, options).resolve(preferred);
}
