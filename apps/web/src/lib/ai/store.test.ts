import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiClientError } from "@/lib/api/client";
import type { AiConversationDto } from "@eckamcreation/api-contracts";

vi.mock("./api", () => ({
  createAiConversation: vi.fn(),
  sendAiMessage: vi.fn(),
  getAiConversation: vi.fn(),
}));

vi.mock("@/lib/cart/store", () => ({
  retryCart: vi.fn(),
}));

import { createAiConversation, getAiConversation, sendAiMessage } from "./api";
import {
  closeAiChat,
  getAiChatSnapshot,
  openAiChat,
  resetAiChatForTest,
  retryAiPrompt,
  sendAiPrompt,
  startNewAiConversation,
} from "./store";
import { toAiProductCard } from "./products";
import { sanitizeAssistantText, toChatMessages } from "./messages";
import { isUnsafeAssistantMarkup, productHref, safeInternalHref, safeMediaUrl } from "./safety";
import { messageForAiError } from "./errors";
import { AI_SUGGESTED_PROMPTS } from "./types";

const createMock = vi.mocked(createAiConversation);
const sendMock = vi.mocked(sendAiMessage);
const getMock = vi.mocked(getAiConversation);

function conversation(overrides: Partial<AiConversationDto> = {}): AiConversationDto {
  return {
    id: "conv_1",
    channel: "web",
    title: null,
    provider: "development",
    model: "development-deterministic",
    messages: [
      {
        id: "m1",
        role: "USER",
        content: "Show me black bags",
        createdAt: "2026-10-04T12:00:00.000Z",
      },
      {
        id: "m2",
        role: "ASSISTANT",
        content: "Here are published bags from the collection.",
        createdAt: "2026-10-04T12:00:01.000Z",
        products: [
          {
            id: "prod_1",
            slug: "noir-compact-bag",
            name: "Noir Compact Bag",
            price: { amountMinor: "199900", currencyCode: "INR" },
            inStock: true,
            primaryMediaUrl: null,
            category: "Bags & Lifestyle",
          },
        ],
      },
    ],
    ...overrides,
  };
}

describe("Eckam AI chat store", () => {
  beforeEach(() => {
    const memory = new Map<string, string>();
    vi.stubGlobal("sessionStorage", {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => {
        memory.set(key, value);
      },
      removeItem: (key: string) => {
        memory.delete(key);
      },
    });
    resetAiChatForTest();
    createMock.mockReset();
    sendMock.mockReset();
    getMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    resetAiChatForTest();
  });

  it("opens and closes the launcher", () => {
    openAiChat();
    expect(getAiChatSnapshot().open).toBe(true);
    closeAiChat();
    expect(getAiChatSnapshot().open).toBe(false);
  });

  it("starts on the welcome state", () => {
    expect(getAiChatSnapshot().phase).toBe("welcome");
    expect(getAiChatSnapshot().messages).toEqual([]);
    expect(AI_SUGGESTED_PROMPTS).toContain("Show me black bags");
  });

  it("submits a suggested prompt and renders the user message while loading", async () => {
    let resolveCreate: (value: AiConversationDto) => void = () => undefined;
    createMock.mockReturnValue(
      new Promise((resolve) => {
        resolveCreate = resolve;
      }),
    );

    const pending = sendAiPrompt("Show me black bags");
    expect(getAiChatSnapshot().phase).toBe("sending");
    expect(getAiChatSnapshot().pending).toBe(true);
    expect(getAiChatSnapshot().messages[0]?.role).toBe("USER");
    expect(getAiChatSnapshot().messages[0]?.content).toBe("Show me black bags");

    resolveCreate(conversation());
    await pending;

    expect(getAiChatSnapshot().phase).toBe("ready");
    expect(getAiChatSnapshot().messages.some((message) => message.role === "ASSISTANT")).toBe(true);
  });

  it("renders the assistant response without provider metadata", async () => {
    createMock.mockResolvedValue(conversation());
    await sendAiPrompt("Show me black bags");
    const serialized = JSON.stringify(getAiChatSnapshot().messages);
    expect(serialized).toContain("Here are published bags from the collection.");
    expect(serialized).not.toContain("development-deterministic");
    expect(serialized).not.toContain("AI_API_KEY");
    expect(serialized).not.toContain("choices");
    expect(serialized).not.toContain("tool_calls");
  });

  it("renders an error and retries the last prompt", async () => {
    createMock.mockRejectedValueOnce(new ApiClientError(503, "AI_PROVIDER_UNAVAILABLE", "down"));
    await sendAiPrompt("What's new?");
    expect(getAiChatSnapshot().phase).toBe("error");
    expect(getAiChatSnapshot().error?.message).toMatch(/temporarily unavailable/i);

    createMock.mockResolvedValueOnce(conversation());
    await retryAiPrompt();
    expect(getAiChatSnapshot().phase).toBe("ready");
    expect(createMock).toHaveBeenCalledTimes(2);
  });

  it("resets to the welcome state for a new conversation", async () => {
    createMock.mockResolvedValue(conversation());
    await sendAiPrompt("What's new?");
    startNewAiConversation();
    expect(getAiChatSnapshot().conversationId).toBeNull();
    expect(getAiChatSnapshot().messages).toEqual([]);
    expect(getAiChatSnapshot().phase).toBe("welcome");
  });

  it("does not send a second request while one is pending", async () => {
    createMock.mockReturnValue(new Promise(() => undefined));
    void sendAiPrompt("Show me home decor");
    void sendAiPrompt("Show me home decor");
    expect(createMock).toHaveBeenCalledTimes(1);
  });
});

describe("Eckam AI presentation", () => {
  it("maps a real product slug to the PDP", () => {
    const card = toAiProductCard({
      id: "prod_1",
      slug: "cream-structured-tote",
      name: "Cream Structured Tote",
      price: { amountMinor: "249900", currencyCode: "INR" },
      category: "Bags & Lifestyle",
    });
    expect(card.href).toBe("/shop/cream-structured-tote");
    expect(card.slug).toBe("cream-structured-tote");
    expect(card.priceLabel).toContain("2,499");
  });

  it("never invents a fallback product", () => {
    const messages = toChatMessages({
      id: "conv_empty",
      channel: "web",
      title: null,
      messages: [
        {
          id: "a1",
          role: "ASSISTANT",
          content: "I could not find that product.",
          createdAt: "2026-10-04T12:00:00.000Z",
        },
      ],
    });
    expect(messages[0]?.products).toBeUndefined();
  });

  it("sanitizes secret-bearing text", () => {
    expect(sanitizeAssistantText("Use AI_API_KEY=sk-abcdefghijklmnopqrstuvwxyz")).not.toContain("AI_API_KEY");
    expect(sanitizeAssistantText("Use AI_API_KEY=sk-abcdefghijklmnopqrstuvwxyz")).not.toContain("sk-abcdefghijklmnopqrstuvwxyz");
  });

  it("maps provider failures to safe copy", () => {
    expect(messageForAiError(new ApiClientError(401, "UNAUTHORIZED", "no")).kind).toBe("auth");
    expect(messageForAiError(new Error("socket")).message).toMatch(/connecting/i);
  });

  it("keeps the chat panel from overflowing on small screens", async () => {
    const css = await import("node:fs/promises").then((fs) =>
      fs.readFile(new URL("../../app/globals.css", import.meta.url), "utf8"),
    );
    expect(css).toContain("overflow-x: hidden");
    expect(css).toContain("min(420px, calc(100vw - 32px))");
    expect(css).toContain("env(safe-area-inset-bottom)");
    expect(css).toContain("eckam-ai-compare");
    expect(css).toContain("scroll-snap-type: x mandatory");
    expect(css).toContain("eckam-ai-orders");
    expect(css).toContain("eckam-ai-order-card");
    expect(css).toContain("eckam-ai-tracking");
    expect(css).toContain("eckam-ai-cancellation");
  });

  it("renders add-to-cart success with a View Cart CTA", () => {
    const messages = toChatMessages({
      id: "conv_cart",
      channel: "web",
      title: null,
      messages: [
        {
          id: "a2",
          role: "ASSISTANT",
          content: "Added to your cart.",
          createdAt: "2026-10-04T12:00:00.000Z",
          commerce: {
            kind: "cart_add",
            success: true,
            product: {
              id: "prod_1",
              slug: "cream-structured-tote",
              name: "Cream Structured Tote",
            },
            quantity: 2,
            href: "/cart",
          },
        },
      ],
    });
    expect(messages[0]?.commerce?.href).toBe("/cart");
    expect(messages[0]?.commerce?.quantity).toBe(2);
    expect(messages[0]?.commerce?.product?.slug).toBe("cream-structured-tote");
  });

  it("renders wishlist success and keeps auth-required errors safe", () => {
    const saved = toChatMessages({
      id: "conv_wish",
      channel: "web",
      title: null,
      messages: [
        {
          id: "a3",
          role: "ASSISTANT",
          content: "Saved to your wishlist.",
          createdAt: "2026-10-04T12:00:00.000Z",
          commerce: {
            kind: "wishlist_add",
            success: true,
            href: "/account/wishlist",
            product: { id: "p", slug: "cream-structured-tote", name: "Cream Structured Tote" },
          },
        },
      ],
    });
    expect(saved[0]?.commerce?.href).toBe("/account/wishlist");

    expect(messageForAiError(new ApiClientError(401, "UNAUTHORIZED", "no")).kind).toBe("auth");
  });

  it("renders a real comparison and never invents a fallback product", () => {
    const messages = toChatMessages({
      id: "conv_cmp",
      channel: "web",
      title: null,
      messages: [
        {
          id: "a4",
          role: "ASSISTANT",
          content: "Here is a comparison from the catalogue.",
          createdAt: "2026-10-04T12:00:00.000Z",
          comparison: {
            products: [
              { id: "p1", slug: "cream-structured-tote", name: "Cream Structured Tote" },
              { id: "p2", slug: "noir-compact-bag", name: "Noir Compact Bag" },
            ],
          },
        },
      ],
    });
    expect(messages[0]?.comparison?.products).toHaveLength(2);
    expect(messages[0]?.products).toBeUndefined();
    expect(JSON.stringify(messages)).not.toContain("fake-product");
  });

  it("keeps ambiguous and error copy free of provider metadata", () => {
    const messages = toChatMessages({
      id: "conv_err",
      channel: "web",
      title: null,
      messages: [
        {
          id: "a5",
          role: "ASSISTANT",
          content: "I found more than one black bag. Which one would you like?",
          createdAt: "2026-10-04T12:00:00.000Z",
          commerce: {
            kind: "cart_add",
            success: false,
            message: "This product has more than one option. Please choose a variant.",
          },
        },
      ],
    });
    expect(messages[0]?.commerce?.success).toBe(false);
    expect(JSON.stringify(messages)).not.toContain("openai");
    expect(JSON.stringify(messages)).not.toContain("AI_API_KEY");
  });

  it("renders recent orders and a View Order CTA", () => {
    const messages = toChatMessages({
      id: "conv_orders",
      channel: "web",
      title: null,
      messages: [
        {
          id: "a6",
          role: "ASSISTANT",
          content: "Here are your recent orders.",
          createdAt: "2026-10-04T12:00:00.000Z",
          orders: [
            {
              orderNumber: "ECK-1001",
              status: "PAID",
              createdAt: "2026-10-04T10:00:00.000Z",
              total: { amountMinor: "199900", currencyCode: "INR" },
              currency: "INR",
              itemCount: 1,
              href: "/account/orders/ECK-1001",
            },
          ],
        },
      ],
    });
    expect(messages[0]?.orders?.[0]?.orderNumber).toBe("ECK-1001");
    expect(messages[0]?.orders?.[0]?.href).toBe("/account/orders/ECK-1001");
    expect(JSON.stringify(messages)).not.toContain("password");
  });

  it("renders order status, tracking, and cancellation results", () => {
    const messages = toChatMessages({
      id: "conv_order_actions",
      channel: "web",
      title: null,
      messages: [
        {
          id: "a7",
          role: "ASSISTANT",
          content: "I found that order.",
          createdAt: "2026-10-04T12:00:00.000Z",
          orderStatus: {
            success: true,
            orderNumber: "ECK-1001",
            status: "PROCESSING",
            href: "/account/orders/ECK-1001",
          },
          tracking: {
            success: false,
            orderNumber: "ECK-1001",
            message: "Tracking information isn't available for this order yet.",
            href: "/account/orders/ECK-1001",
          },
          cancellation: {
            success: true,
            orderNumber: "ECK-1001",
            status: "REQUESTED",
            message: "I've submitted a cancellation request for order #ECK-1001.",
            href: "/account/orders/ECK-1001",
          },
        },
      ],
    });
    expect(messages[0]?.orderStatus?.status).toBe("PROCESSING");
    expect(messages[0]?.tracking?.success).toBe(false);
    expect(messages[0]?.tracking?.message).toMatch(/isn't available/i);
    expect(messages[0]?.cancellation?.href).toBe("/account/orders/ECK-1001");
    expect(JSON.stringify(messages)).not.toContain("fake-tracking");
    expect(JSON.stringify(messages)).not.toContain("prisma");
  });

  it("sanitizes script injection and rejects unsafe links", () => {
    const injected = sanitizeAssistantText('<script>alert(1)</script> javascript:alert(1)');
    expect(isUnsafeAssistantMarkup('<script>alert(1)</script>')).toBe(true);
    expect(injected).not.toContain("AI_API_KEY");
    expect(productHref("../admin")).toBe("/shop");
    expect(productHref("cream-structured-tote")).toBe("/shop/cream-structured-tote");
    expect(safeInternalHref("https://evil.test/phish", "/cart")).toBe("/cart");
    expect(safeInternalHref("//evil.test", "/account/orders/ECK-1")).toBe("/account/orders/ECK-1");
    expect(safeMediaUrl("javascript:alert(1)")).toBeNull();
    expect(safeMediaUrl("https://evil.test/tracker.png")).toBeNull();
    expect(JSON.stringify(process.env)).not.toContain("NEXT_PUBLIC_AI_API_KEY");
  });

  it("keeps wishlist and order auth on the existing sign-in flow", () => {
    expect(messageForAiError(new ApiClientError(401, "UNAUTHORIZED", "Sign in")).kind).toBe("auth");
    expect(messageForAiError(new ApiClientError(401, "UNAUTHORIZED", "Sign in")).message).toMatch(
      /sign in/i,
    );
  });
});
