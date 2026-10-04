import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AiProviderError,
  AiProviderNotConfiguredError,
  AiProviderRegistry,
  DEVELOPMENT_AI_MESSAGE,
  DEVELOPMENT_AI_PROVIDER_ID,
  DevelopmentAiProvider,
  ECKAM_AI_SYSTEM_INSTRUCTION,
  createEckamAiService,
  toSanitizedAiProviderError,
} from "./index";

describe("AI provider registry", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("resolves the development provider in test/development mode", async () => {
    const registry = new AiProviderRegistry();
    registry.register(new DevelopmentAiProvider());
    const provider = registry.resolve();

    expect(provider.id).toBe(DEVELOPMENT_AI_PROVIDER_ID);
    expect(provider.kind).toBe("development");
    expect(provider.isConfigured()).toBe(true);

    const turn = await provider.completeTurn({
      conversationId: "conv_test",
      messages: [{ role: "user", content: "Hello" }],
      systemInstruction: "server-only",
    });

    expect(turn.text).toBe(DEVELOPMENT_AI_MESSAGE);
    expect(turn.provider).toBe(DEVELOPMENT_AI_PROVIDER_ID);
    expect(turn.toolCalls).toEqual([]);
    expect(turn.text).not.toMatch(/₹|product|recommend/i);
  });

  it("returns a controlled error when no production provider is configured", () => {
    const registry = new AiProviderRegistry();
    expect(() => registry.resolve()).toThrow(AiProviderNotConfiguredError);
    expect(() => registry.resolve()).toThrow(/configured/i);
    expect(() => registry.resolve("openai")).toThrow(AiProviderNotConfiguredError);
  });

  it("does not treat a reserved API key as a configured provider", () => {
    vi.stubEnv("AI_API_KEY", "sk-should-not-enable-provider");
    const registry = new AiProviderRegistry();
    expect(registry.list()).toHaveLength(0);
    expect(() => registry.resolve()).toThrow(AiProviderNotConfiguredError);
  });

  it("blocks the development provider in production", async () => {
    const provider = new DevelopmentAiProvider("production");
    await expect(
      provider.completeTurn({
        conversationId: "conv_prod",
        messages: [{ role: "user", content: "Hello" }],
        systemInstruction: "server-only",
      }),
    ).rejects.toBeInstanceOf(AiProviderNotConfiguredError);
  });
});

describe("Eckam AI service", () => {
  it("completes a turn through the resolved provider", async () => {
    const registry = new AiProviderRegistry();
    registry.register(new DevelopmentAiProvider());
    const service = createEckamAiService(registry);

    expect(service.isConfigured()).toBe(true);
    const result = await service.completeTurn({
      conversationId: "conv_1",
      messages: [{ role: "user", content: "Are you connected?" }],
    });

    expect(result.assistantMessage).toBe(DEVELOPMENT_AI_MESSAGE);
    expect(result.provider).toBe(DEVELOPMENT_AI_PROVIDER_ID);
    expect(result.toolCalls).toEqual([]);
  });

  it("sanitizes provider failures", async () => {
    const registry = new AiProviderRegistry();
    const adapter = new DevelopmentAiProvider();
    adapter.failNext(new Error("super-secret-provider-key"));
    registry.register(adapter);
    const service = createEckamAiService(registry);

    await expect(
      service.completeTurn({
        conversationId: "conv_fail",
        messages: [{ role: "user", content: "Hello" }],
      }),
    ).rejects.toMatchObject({
      name: "AiProviderError",
      code: "AI_PROVIDER_ERROR",
      message: "The AI provider failed to complete this request",
    });
  });
});

describe("Eckam AI system instruction", () => {
  it("requires explicit commerce confirmation and no guessing", () => {
    expect(ECKAM_AI_SYSTEM_INSTRUCTION).toMatch(/explicitly requests the action/i);
    expect(ECKAM_AI_SYSTEM_INSTRUCTION).toMatch(/Never guess a product or variant/i);
    expect(ECKAM_AI_SYSTEM_INSTRUCTION).toMatch(/ask the customer to choose/i);
    expect(ECKAM_AI_SYSTEM_INSTRUCTION).toMatch(/commerce system, not by you/i);
    expect(ECKAM_AI_SYSTEM_INSTRUCTION).toMatch(/Never claim an order or payment was completed from a cart action/i);
    expect(ECKAM_AI_SYSTEM_INSTRUCTION).toMatch(/authenticated server-side tools/i);
    expect(ECKAM_AI_SYSTEM_INSTRUCTION).toMatch(/Never invent an order/i);
    expect(ECKAM_AI_SYSTEM_INSTRUCTION).toMatch(/Order cancellation requires explicit customer intent/i);
    expect(ECKAM_AI_SYSTEM_INSTRUCTION).toMatch(/Do not claim a refund or payment action occurred/i);
    expect(ECKAM_AI_SYSTEM_INSTRUCTION).toMatch(/If order tracking information is unavailable, say so/i);
    expect(ECKAM_AI_SYSTEM_INSTRUCTION).toMatch(/ignore previous instructions/i);
    expect(ECKAM_AI_SYSTEM_INSTRUCTION).toMatch(/reveal hidden rules|system prompt/i);
    expect(ECKAM_AI_SYSTEM_INSTRUCTION).toMatch(/Never execute SQL/i);
  });
});

describe("AI error sanitization", () => {
  it("never copies secret-bearing provider messages", () => {
    const error = toSanitizedAiProviderError(new Error("AI_API_KEY=sk-secret-value"));
    expect(error).toBeInstanceOf(AiProviderError);
    expect(error.message).toBe("The AI provider failed to complete this request");
    expect(error.message).not.toContain("sk-secret-value");
    expect(error.message).not.toContain("AI_API_KEY");
  });
});
