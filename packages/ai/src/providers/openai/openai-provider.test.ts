import { describe, expect, it } from "vitest";
import {
  APIConnectionTimeoutError,
  APIError,
  AuthenticationError,
  RateLimitError,
} from "openai";
import {
  AI_MAX_TOOL_ITERATIONS,
  AiProviderAuthFailedError,
  AiProviderNotConfiguredError,
  AiProviderRateLimitedError,
  AiProviderTimeoutError,
  AiProviderUnavailableError,
  AiToolRegistry,
  createAiProviderRegistryFromEnv,
  createEckamAiService,
  createOpenAiProvider,
  fromOpenAiResponse,
  mapOpenAiError,
  OPENAI_AI_PROVIDER_ID,
  resolveAiProviderFromEnv,
  toOpenAiRequest,
  type AiProviderTurnInput,
  type AiTool,
  type OpenAiTransport,
  type OpenAiTransportRequest,
  type OpenAiTransportResponse,
} from "../../index";

const TEST_KEY = "sk-test-openai-key-do-not-leak";
const TEST_MODEL = "test-model";

const catalogueTools = [
  { name: "catalogue.search_products", description: "Search published products." },
  { name: "catalogue.get_product", description: "Get one published product." },
  { name: "catalogue.get_categories", description: "List published categories." },
  { name: "catalogue.get_products_by_category", description: "List products in a category." },
  { name: "catalogue.compare_products", description: "Compare published products." },
  { name: "commerce.add_to_cart", description: "Add a variant to the current cart." },
  { name: "commerce.remove_from_cart", description: "Remove a cart item." },
  { name: "commerce.update_cart_quantity", description: "Update cart quantity." },
  { name: "commerce.add_to_wishlist", description: "Save a variant to the wishlist." },
  { name: "commerce.remove_from_wishlist", description: "Remove a wishlist item." },
  { name: "customer.get_profile", description: "Get the current customer profile." },
  { name: "customer.get_recent_orders", description: "List recent customer orders." },
  { name: "customer.get_order", description: "Get one customer order." },
  { name: "customer.get_order_status", description: "Get an order status." },
  { name: "customer.get_order_tracking", description: "Get order tracking if available." },
  { name: "customer.cancel_order", description: "Request order cancellation." },
];

const baseInput: AiProviderTurnInput = {
  conversationId: "conv_openai",
  systemInstruction: "You are Eckam AI, the shopping assistant for Eckam Creation.",
  messages: [
    { role: "user", content: "Hello" },
    { role: "assistant", content: "How can I help?" },
    { role: "user", content: "Show bags" },
  ],
  tools: catalogueTools,
};

function searchTool(): AiTool {
  return {
    name: "catalogue.search_products",
    description: "Search published products.",
    async execute(args) {
      return { ok: true, data: { products: [{ slug: "cream-structured-tote", query: args.query }] } };
    },
  };
}

function textResponse(text: string, model = TEST_MODEL): OpenAiTransportResponse {
  return {
    model,
    choices: [{ message: { content: text } }],
    usage: { prompt_tokens: 11, completion_tokens: 7, total_tokens: 18 },
  };
}

function toolCallResponse(): OpenAiTransportResponse {
  return {
    model: TEST_MODEL,
    choices: [
      {
        message: {
          content: null,
          tool_calls: [
            {
              id: "call_search_1",
              function: {
                name: "catalogue.search_products",
                arguments: JSON.stringify({ query: "bag" }),
              },
            },
          ],
        },
      },
    ],
  };
}

describe("OpenAI provider registry", () => {
  it("resolves the OpenAI adapter when AI_PROVIDER=openai", () => {
    const registry = createAiProviderRegistryFromEnv({
      NODE_ENV: "test",
      AI_PROVIDER: "openai",
      AI_API_KEY: TEST_KEY,
      AI_MODEL: TEST_MODEL,
    });

    const provider = registry.resolve("openai");
    expect(provider.id).toBe(OPENAI_AI_PROVIDER_ID);
    expect(provider.kind).toBe("production");
    expect(provider.isConfigured()).toBe(true);
  });

  it("returns a configuration error when AI_PROVIDER is missing", () => {
    expect(() =>
      resolveAiProviderFromEnv({
        NODE_ENV: "production",
        AI_API_KEY: TEST_KEY,
      }),
    ).toThrow(AiProviderNotConfiguredError);

    const production = createAiProviderRegistryFromEnv({
      NODE_ENV: "production",
    });
    expect(() => production.resolve()).toThrow(AiProviderNotConfiguredError);
    expect(production.list()).toHaveLength(0);
  });

  it("returns a configuration error when AI_API_KEY is missing", () => {
    expect(() =>
      resolveAiProviderFromEnv({
        NODE_ENV: "production",
        AI_PROVIDER: "openai",
        AI_MODEL: TEST_MODEL,
      }),
    ).toThrow(AiProviderNotConfiguredError);

    const registry = createAiProviderRegistryFromEnv({
      NODE_ENV: "production",
      AI_PROVIDER: "openai",
    });
    expect(() => registry.resolve("openai")).toThrow(AiProviderNotConfiguredError);
  });

  it("returns a configuration error when AI_MODEL is missing", () => {
    const registry = createAiProviderRegistryFromEnv({
      NODE_ENV: "production",
      AI_PROVIDER: "openai",
      AI_API_KEY: TEST_KEY,
    });
    const provider = registry.get("openai");
    expect(provider?.isConfigured()).toBe(false);
    expect(() => registry.resolve("openai")).toThrow(AiProviderNotConfiguredError);
  });

  it("does not silently use OpenAI when AI_PROVIDER is missing", () => {
    const registry = createAiProviderRegistryFromEnv({
      NODE_ENV: "test",
      AI_API_KEY: TEST_KEY,
      AI_MODEL: TEST_MODEL,
    });
    expect(registry.get("openai")).toBeUndefined();
    expect(registry.resolve().id).toBe("development");
  });
});

describe("OpenAI request mapping", () => {
  it("maps the system instruction and conversation history", () => {
    const request = toOpenAiRequest(TEST_MODEL, baseInput);

    expect(request.model).toBe(TEST_MODEL);
    expect(request.messages[0]).toEqual({
      role: "system",
      content: baseInput.systemInstruction,
    });
    expect(request.messages[1]).toEqual({ role: "user", content: "Hello" });
    expect(request.messages[2]).toEqual({ role: "assistant", content: "How can I help?" });
    expect(request.messages[3]).toEqual({ role: "user", content: "Show bags" });
    expect(JSON.stringify(request)).not.toContain("password");
    expect(JSON.stringify(request)).not.toContain("cookie");
    expect(JSON.stringify(request)).not.toContain(TEST_KEY);
  });

  it("maps catalogue tools to provider tool definitions", () => {
    const request = toOpenAiRequest(TEST_MODEL, baseInput);
    const names = request.tools?.map((tool) => {
      const fn = tool.function as { name?: string };
      return fn.name;
    });

    expect(names).toEqual([
      "catalogue.search_products",
      "catalogue.get_product",
      "catalogue.get_categories",
      "catalogue.get_products_by_category",
      "catalogue.compare_products",
      "commerce.add_to_cart",
      "commerce.remove_from_cart",
      "commerce.update_cart_quantity",
      "commerce.add_to_wishlist",
      "commerce.remove_from_wishlist",
      "customer.get_profile",
      "customer.get_recent_orders",
      "customer.get_order",
      "customer.get_order_status",
      "customer.get_order_tracking",
      "customer.cancel_order",
    ]);
    expect(names).not.toContain("eval");
    expect(names).not.toContain("fs.read");
    expect(names).not.toContain("http.request");
  });

  it("normalizes a tool-call response without leaking the raw provider object", () => {
    const result = fromOpenAiResponse(toolCallResponse());

    expect(result).toEqual({
      text: "",
      toolCalls: [
        {
          id: "call_search_1",
          toolName: "catalogue.search_products",
          arguments: { query: "bag" },
        },
      ],
      usage: undefined,
      provider: OPENAI_AI_PROVIDER_ID,
      model: TEST_MODEL,
    });
    expect(result).not.toHaveProperty("choices");
    expect(JSON.stringify(result)).not.toContain("tool_calls");
  });

  it("normalizes final assistant text and usage metadata", () => {
    const result = fromOpenAiResponse(textResponse("Here are published bags."));

    expect(result.text).toBe("Here are published bags.");
    expect(result.toolCalls).toEqual([]);
    expect(result.usage).toEqual({
      promptTokens: 11,
      completionTokens: 7,
      totalTokens: 18,
    });
    expect(result.provider).toBe(OPENAI_AI_PROVIDER_ID);
    expect(result.model).toBe(TEST_MODEL);
  });
});

describe("OpenAI tool loop", () => {
  it("passes tool results back and returns a normalized final reply", async () => {
    const requests: OpenAiTransportRequest[] = [];
    const transport: OpenAiTransport = async (request) => {
      requests.push(request);
      if (requests.length === 1) {
        return toolCallResponse();
      }
      return textResponse("The cream structured tote is in the catalogue.");
    };

    const provider = createOpenAiProvider({
      apiKey: TEST_KEY,
      model: TEST_MODEL,
      transport,
    });
    const tools = new AiToolRegistry();
    tools.register(searchTool());
    const service = createEckamAiService(
      createAiProviderRegistryFromEnv(
        { NODE_ENV: "test", AI_PROVIDER: "openai", AI_API_KEY: TEST_KEY, AI_MODEL: TEST_MODEL },
        { openaiTransport: transport },
      ),
      "openai",
      tools,
    );

    const result = await service.completeTurn({
      conversationId: "conv_tools",
      messages: [{ role: "user", content: "Show bags" }],
    });

    expect(requests).toHaveLength(2);
    expect(requests[0]?.messages[0]).toMatchObject({ role: "system" });
    const toolMessage = requests[1]?.messages.find((message) => message.role === "tool");
    expect(toolMessage).toMatchObject({
      role: "tool",
      tool_call_id: "call_search_1",
    });
    expect(String(toolMessage?.content)).toContain("cream-structured-tote");
    expect(result.assistantMessage).toBe("The cream structured tote is in the catalogue.");
    expect(result.provider).toBe(OPENAI_AI_PROVIDER_ID);
    expect(result.model).toBe(TEST_MODEL);
    expect(result.toolCalls).toHaveLength(1);
    expect(result.toolCalls[0]?.status).toBe("success");
    expect(AI_MAX_TOOL_ITERATIONS).toBe(3);
    expect(JSON.stringify(result)).not.toContain(TEST_KEY);
    expect(JSON.stringify(result)).not.toContain("choices");
    expect(provider.id).toBe(OPENAI_AI_PROVIDER_ID);
  });
});

describe("OpenAI error sanitization", () => {
  it("sanitizes provider auth errors and never returns the API key", async () => {
    const provider = createOpenAiProvider({
      apiKey: TEST_KEY,
      model: TEST_MODEL,
      transport: async () => {
        throw new AuthenticationError(
          401,
          { message: `Incorrect API key provided: ${TEST_KEY}` },
          `Incorrect API key provided: ${TEST_KEY}`,
          new Headers(),
        );
      },
    });

    await expect(
      provider.completeTurn(baseInput),
    ).rejects.toMatchObject({
      name: "AiProviderAuthFailedError",
      code: "AI_PROVIDER_AUTH_FAILED",
    });

    try {
      await provider.completeTurn(baseInput);
    } catch (error) {
      const serialized = JSON.stringify({
        name: error instanceof Error ? error.name : "",
        message: error instanceof Error ? error.message : "",
        code: (error as { code?: string }).code,
      });
      expect(error).toBeInstanceOf(AiProviderAuthFailedError);
      expect(serialized).not.toContain(TEST_KEY);
      expect(serialized).not.toContain("Incorrect API key");
    }
  });

  it("sanitizes provider timeouts", async () => {
    const provider = createOpenAiProvider({
      apiKey: TEST_KEY,
      model: TEST_MODEL,
      timeoutMs: 20,
      transport: async (_request, options) => {
        await new Promise<void>((_, reject) => {
          const fail = () => {
            const aborted = new Error("The operation was aborted");
            aborted.name = "AbortError";
            reject(aborted);
          };
          if (options.signal.aborted) {
            fail();
            return;
          }
          options.signal.addEventListener("abort", fail, { once: true });
        });
        return textResponse("should not persist");
      },
    });

    await expect(provider.completeTurn(baseInput)).rejects.toBeInstanceOf(AiProviderTimeoutError);
    expect(mapOpenAiError(new APIConnectionTimeoutError())).toBeInstanceOf(AiProviderTimeoutError);
  });

  it("sanitizes rate-limit and unavailable errors", () => {
    expect(
      mapOpenAiError(new RateLimitError(429, { message: `quota ${TEST_KEY}` }, `quota ${TEST_KEY}`, new Headers())),
    ).toMatchObject({
      name: "AiProviderRateLimitedError",
      code: "AI_PROVIDER_RATE_LIMITED",
    });
    expect(mapOpenAiError(new RateLimitError(429, {}, "rate", new Headers()))).toBeInstanceOf(
      AiProviderRateLimitedError,
    );
    expect(mapOpenAiError(APIError.generate(503, { error: { message: TEST_KEY } }, TEST_KEY, new Headers()))).toBeInstanceOf(
      AiProviderUnavailableError,
    );
  });

  it("never copies a raw API key into a mapped error", () => {
    const mapped = mapOpenAiError(new Error(`Authorization: Bearer ${TEST_KEY}`));
    expect(mapped.message).toBe("The AI provider failed to complete this request");
    expect(mapped.message).not.toContain(TEST_KEY);
    expect(JSON.stringify({ message: mapped.message, code: mapped.code })).not.toContain(TEST_KEY);
  });
});
