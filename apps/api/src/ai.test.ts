import "./lib/preload-env";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import {
  AiProviderAuthFailedError,
  AiProviderNotConfiguredError,
  AiProviderRateLimitedError,
  AiProviderRegistry,
  AiProviderTimeoutError,
  DEVELOPMENT_AI_MESSAGE,
  DEVELOPMENT_AI_PROVIDER_ID,
  DevelopmentAiProvider,
  createEckamAiService,
  resolveAiProviderFromEnv,
} from "@eckamcreation/ai";
import { prisma } from "@eckamcreation/database";
import { POST as register } from "./app/v1/auth/register/route";
import { POST as createConversation } from "./app/v1/ai/conversations/route";
import { GET as getConversation } from "./app/v1/ai/conversations/[id]/route";
import { POST as sendMessage } from "./app/v1/ai/conversations/[id]/messages/route";
import { CUSTOMER_SESSION_COOKIE } from "./lib/auth/cookies";
import { resetAuthServices } from "./lib/auth/services";
import {
  AiConversationService,
  resetAiServices,
  setAiConversationServiceForTest,
} from "./lib/ai";
import { createAuthRateLimiter } from "./lib/auth/rate-limit-auth";
import { setRateLimiter } from "./lib/rate-limit";
import { toApiError } from "./lib/errors";

const hasDb = Boolean(process.env.DATABASE_URL);
const describeDb = hasDb ? describe : describe.skip;

function cookieFrom(response: Response, name: string): string {
  const headers = response.headers.getSetCookie?.() ?? [];
  for (const row of headers) {
    if (row.startsWith(`${name}=`)) return row.split(";")[0]!.slice(name.length + 1);
  }
  const single = response.headers.get("set-cookie") ?? "";
  const match = single.match(new RegExp(`${name}=([^;]+)`));
  return match?.[1] ?? "";
}

function authed(cookie: string, init?: RequestInit): HeadersInit {
  return {
    ...(init?.headers ?? {}),
    cookie: `${CUSTOMER_SESSION_COOKIE}=${cookie}`,
    "content-type": "application/json",
  };
}

describe("AI provider foundation", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    resetAiServices();
  });

  it("resolves the development provider outside production", () => {
    const registry = new AiProviderRegistry();
    registry.register(new DevelopmentAiProvider());
    expect(registry.resolve().id).toBe(DEVELOPMENT_AI_PROVIDER_ID);
    expect(createEckamAiService(registry).isConfigured()).toBe(true);
  });

  it("returns a controlled error when no production provider is configured", () => {
    const registry = new AiProviderRegistry();
    expect(() => registry.resolve()).toThrow(AiProviderNotConfiguredError);
    const mapped = toApiError(new AiProviderNotConfiguredError());
    expect(mapped.code).toBe("AI_PROVIDER_NOT_CONFIGURED");
    expect(mapped.status).toBe(503);
  });

  it("sanitizes provider errors so secrets never leave the envelope", async () => {
    const adapter = new DevelopmentAiProvider();
    adapter.failNext(new Error("AI_API_KEY=sk-super-secret"));
    const registry = new AiProviderRegistry();
    registry.register(adapter);
    const service = createEckamAiService(registry);

    try {
      await service.completeTurn({
        conversationId: "conv_secret",
        messages: [{ role: "user", content: "hello" }],
      });
      throw new Error("expected provider failure");
    } catch (error) {
      const mapped = toApiError(error);
      const serialized = JSON.stringify({
        code: mapped.code,
        message: mapped.message,
      });
      expect(mapped.code).toBe("AI_PROVIDER_ERROR");
      expect(mapped.message).toBe("The AI provider failed to complete this request");
      expect(serialized).not.toContain("sk-super-secret");
      expect(serialized).not.toContain("AI_API_KEY");
    }
  });

  it("maps OpenAI configuration and provider failures to safe API errors", () => {
    expect(() =>
      resolveAiProviderFromEnv({
        NODE_ENV: "production",
        AI_PROVIDER: "openai",
      }),
    ).toThrow(AiProviderNotConfiguredError);

    expect(toApiError(new AiProviderNotConfiguredError()).status).toBe(503);
    expect(toApiError(new AiProviderAuthFailedError()).code).toBe("AI_PROVIDER_AUTH_FAILED");
    expect(toApiError(new AiProviderAuthFailedError()).status).toBe(502);
    expect(toApiError(new AiProviderRateLimitedError()).status).toBe(429);
    expect(toApiError(new AiProviderTimeoutError()).status).toBe(504);
  });
});

describeDb("AI conversation API", () => {
  const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const emailA = `ai_a_${suffix}@example.com`;
  const emailB = `ai_b_${suffix}@example.com`;
  const password = "Secret123";
  let cookieA = "";
  let cookieB = "";
  let conversationId = "";

  beforeAll(async () => {
    resetAuthServices();
    resetAiServices();
    setRateLimiter(createAuthRateLimiter());

    const regA = await register(
      new Request("http://localhost:3002/v1/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: emailA, password, name: "AI Customer A" }),
      }),
    );
    const bodyA = await regA.json();
    expect(regA.status).toBe(201);
    cookieA = cookieFrom(regA, CUSTOMER_SESSION_COOKIE);
    expect(cookieA).toBeTruthy();
    expect(bodyA.data.userId).toBeTruthy();

    const regB = await register(
      new Request("http://localhost:3002/v1/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: emailB, password, name: "AI Customer B" }),
      }),
    );
    expect(regB.status).toBe(201);
    cookieB = cookieFrom(regB, CUSTOMER_SESSION_COOKIE);
  });

  afterAll(async () => {
    if (conversationId) {
      await prisma.aiToolCall.deleteMany({ where: { conversationId } });
      await prisma.aiMessage.deleteMany({ where: { conversationId } });
      await prisma.aiConversation.deleteMany({ where: { id: conversationId } });
    }
    resetAiServices();
  });

  it("creates a conversation, persists the user message, and stores the assistant reply", async () => {
    const response = await createConversation(
      new Request("http://localhost:3002/v1/ai/conversations", {
        method: "POST",
        headers: authed(cookieA),
        body: JSON.stringify({
          channel: "web",
          content: "Are you connected?",
        }),
      }),
    );
    const body = await response.json();
    expect(response.status).toBe(201);
    expect(body.ok).toBe(true);
    conversationId = body.data.id;
    expect(conversationId).toBeTruthy();
    expect(body.data.provider).toBe(DEVELOPMENT_AI_PROVIDER_ID);
    expect(body.data.messages).toHaveLength(2);
    expect(body.data.messages[0].role).toBe("USER");
    expect(body.data.messages[0].content).toBe("Are you connected?");
    expect(body.data.messages[1].role).toBe("ASSISTANT");
    expect(body.data.messages[1].content).toBe(DEVELOPMENT_AI_MESSAGE);

    const stored = await prisma.aiMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
    });
    expect(stored).toHaveLength(2);
    expect(stored[0]?.role).toBe("USER");
    expect(stored[1]?.role).toBe("ASSISTANT");
    expect(JSON.stringify(body)).not.toContain("AI_API_KEY");
    expect(JSON.stringify(body)).not.toMatch(/sk-/);
    expect(JSON.stringify(body)).not.toContain("You are Eckam AI");
  });

  it("loads conversation history for the owner", async () => {
    const response = await getConversation(
      new Request(`http://localhost:3002/v1/ai/conversations/${conversationId}`, {
        headers: authed(cookieA),
      }),
      { params: Promise.resolve({ id: conversationId }) },
    );
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.data.messages).toHaveLength(2);
    expect(body.data.messages[1].content).toBe(DEVELOPMENT_AI_MESSAGE);
  });

  it("persists a follow-up user message and another assistant reply", async () => {
    const response = await sendMessage(
      new Request(`http://localhost:3002/v1/ai/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: authed(cookieA),
        body: JSON.stringify({ content: "Still there?" }),
      }),
      { params: Promise.resolve({ id: conversationId }) },
    );
    const body = await response.json();
    expect(response.status).toBe(201);
    expect(body.data.messages).toHaveLength(4);
    expect(body.data.messages[2].role).toBe("USER");
    expect(body.data.messages[2].content).toBe("Still there?");
    expect(body.data.messages[3].role).toBe("ASSISTANT");
    expect(body.data.messages[3].content).toBe(DEVELOPMENT_AI_MESSAGE);
  });

  it("rejects unauthorized conversation access", async () => {
    const other = await getConversation(
      new Request(`http://localhost:3002/v1/ai/conversations/${conversationId}`, {
        headers: authed(cookieB),
      }),
      { params: Promise.resolve({ id: conversationId }) },
    );
    const otherBody = await other.json();
    expect(other.status).toBe(403);
    expect(otherBody.error.code).toBe("AI_CONVERSATION_FORBIDDEN");

    const anon = await getConversation(
      new Request(`http://localhost:3002/v1/ai/conversations/${conversationId}`),
      { params: Promise.resolve({ id: conversationId }) },
    );
    const anonBody = await anon.json();
    expect(anon.status).toBe(401);
    expect(anonBody.error.code).toBe("UNAUTHORIZED");
  });

  it("rejects an invalid message", async () => {
    const response = await sendMessage(
      new Request(`http://localhost:3002/v1/ai/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: authed(cookieA),
        body: JSON.stringify({ content: "   " }),
      }),
      { params: Promise.resolve({ id: conversationId }) },
    );
    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.error.code).toBe("AI_INVALID_MESSAGE");
  });

  it("rejects an invalid conversation id", async () => {
    const response = await getConversation(
      new Request("http://localhost:3002/v1/ai/conversations/does-not-exist", {
        headers: authed(cookieA),
      }),
      { params: Promise.resolve({ id: "does-not-exist" }) },
    );
    const body = await response.json();
    expect(response.status).toBe(404);
    expect(body.error.code).toBe("AI_CONVERSATION_NOT_FOUND");
  });

  it("does not persist a conversation when the provider cannot be resolved", async () => {
    const empty = new AiProviderRegistry();
    setAiConversationServiceForTest(new AiConversationService(prisma, createEckamAiService(empty)));

    const before = await prisma.aiConversation.count({
      where: { title: `blocked-${suffix}` },
    });
    const response = await createConversation(
      new Request("http://localhost:3002/v1/ai/conversations", {
        method: "POST",
        headers: authed(cookieA),
        body: JSON.stringify({
          title: `blocked-${suffix}`,
          content: "This should not persist",
        }),
      }),
    );
    const body = await response.json();
    expect(response.status).toBe(503);
    expect(body.error.code).toBe("AI_PROVIDER_NOT_CONFIGURED");
    const after = await prisma.aiConversation.count({
      where: { title: `blocked-${suffix}` },
    });
    expect(after).toBe(before);
    resetAiServices();
  });
});
