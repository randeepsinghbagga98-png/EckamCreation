import {
  AiConversationForbiddenError,
  AiConversationNotFoundError,
  AiInvalidMessageError,
  AiProviderNotConfiguredError,
  type AiChatMessage,
  type AiTurnResult,
  type EckamAiService,
} from "@eckamcreation/ai";
import type {
  AiCancellationResultDto,
  AiCommerceActionDto,
  AiComparisonDto,
  AiConversationDto,
  AiConversationProductDto,
  AiMessageDto,
  AiOrderStatusDto,
  AiOrderSummaryDto,
  AiTrackingResultDto,
} from "@eckamcreation/api-contracts";
import type { Prisma, PrismaClient } from "@eckamcreation/database";

const HISTORY_LIMIT = 20;

type ConversationRow = {
  id: string;
  channel: string;
  title: string | null;
  userId: string | null;
  metadata: Prisma.JsonValue;
  messages: Array<{
    id: string;
    role: "USER" | "ASSISTANT" | "SYSTEM" | "TOOL";
    content: string;
    createdAt: Date;
    metadata: Prisma.JsonValue;
  }>;
};

export class AiConversationService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly ai: EckamAiService,
  ) {}

  async createConversation(input: {
    userId: string;
    channel?: string;
    title?: string;
    content?: string;
  }): Promise<AiConversationDto> {
    this.assertProviderReady();
    const channel = input.channel?.trim() || "web";
    const title = input.title?.trim() || null;
    const content = input.content ? normalizeMessage(input.content) : null;

    const conversation = await this.prisma.aiConversation.create({
      data: {
        userId: input.userId,
        channel,
        title,
      },
    });

    if (!content) {
      return toConversationDto(conversation, []);
    }

    try {
      const turn = await this.ai.completeTurn({
        conversationId: conversation.id,
        userId: input.userId,
        messages: [{ role: "user", content }],
      });
      await this.persistTurn(conversation.id, content, turn);
      return this.getConversation(input.userId, conversation.id);
    } catch (error) {
      await this.prisma.aiConversation.delete({ where: { id: conversation.id } }).catch(() => undefined);
      throw error;
    }
  }

  async sendMessage(input: {
    userId: string;
    conversationId: string;
    content: string;
  }): Promise<AiConversationDto> {
    this.assertProviderReady();
    const content = normalizeMessage(input.content);
    const conversation = await this.requireOwnedConversation(input.userId, input.conversationId);
    const history = await this.loadHistory(conversation.id);
    const turn = await this.ai.completeTurn({
      conversationId: conversation.id,
      userId: input.userId,
      messages: [...history, { role: "user", content }],
    });
    await this.persistTurn(conversation.id, content, turn);
    return this.getConversation(input.userId, conversation.id);
  }

  async getConversation(userId: string, conversationId: string): Promise<AiConversationDto> {
    const conversation = await this.requireOwnedConversation(userId, conversationId);
    const messages = await this.prisma.aiMessage.findMany({
      where: {
        conversationId: conversation.id,
        role: { in: ["USER", "ASSISTANT"] },
      },
      orderBy: { createdAt: "asc" },
    });
    return toConversationDto(conversation, messages);
  }

  private assertProviderReady(): void {
    if (!this.ai.isConfigured()) {
      throw new AiProviderNotConfiguredError();
    }
  }

  private async requireOwnedConversation(userId: string, conversationId: string) {
    if (!conversationId || conversationId.length > 80) {
      throw new AiConversationNotFoundError();
    }
    const conversation = await this.prisma.aiConversation.findUnique({
      where: { id: conversationId },
    });
    if (!conversation) {
      throw new AiConversationNotFoundError();
    }
    if (conversation.userId !== userId) {
      throw new AiConversationForbiddenError();
    }
    return conversation;
  }

  private async loadHistory(conversationId: string): Promise<AiChatMessage[]> {
    const rows = await this.prisma.aiMessage.findMany({
      where: {
        conversationId,
        role: { in: ["USER", "ASSISTANT"] },
      },
      orderBy: { createdAt: "desc" },
      take: HISTORY_LIMIT,
    });

    return rows
      .reverse()
      .map((row) => ({
        role: row.role === "ASSISTANT" ? "assistant" : "user",
        content: row.content,
      }));
  }

  private async persistTurn(conversationId: string, userContent: string, turn: AiTurnResult) {
    await this.prisma.$transaction(async (tx) => {
      await tx.aiMessage.create({
        data: {
          conversationId,
          role: "USER",
          content: redactKnownSecrets(userContent),
        },
      });

      const assistant = await tx.aiMessage.create({
        data: {
          conversationId,
          role: "ASSISTANT",
          content: redactKnownSecrets(turn.assistantMessage),
          metadata: publicTurnMetadata(turn),
        },
      });

      await tx.aiConversation.update({
        where: { id: conversationId },
        data: {
          metadata: publicTurnMetadata(turn),
        },
      });

      if (turn.toolCalls.length > 0) {
        await tx.aiToolCall.createMany({
          data: turn.toolCalls.map((call) => ({
            conversationId,
            messageId: assistant.id,
            toolName: call.toolName,
            argsJson: sanitizeJson(call.arguments),
            resultSummary: summarizeToolResult(call),
            durationMs: call.durationMs,
            success: call.status !== "error",
          })),
        });
      }
    });
  }
}

function normalizeMessage(content: string): string {
  const trimmed = content.trim();
  if (!trimmed) {
    throw new AiInvalidMessageError();
  }
  if (trimmed.length > 8000) {
    throw new AiInvalidMessageError("Message is too long");
  }
  return trimmed;
}

const SECRET_PATTERN = /AI_API_KEY|sk-[a-zA-Z0-9]{16,}|Bearer\s+[A-Za-z0-9._-]+|postgresql:\/\/\S+/gi;

function redactKnownSecrets(text: string): string {
  const secrets = [
    process.env.AI_API_KEY,
    process.env.AI_API_BASE_URL,
    process.env.AUTH_SECRET,
    process.env.PAYMENT_PROVIDER_SECRET,
    process.env.PAYMENT_WEBHOOK_SECRET,
    process.env.PAYMENT_PROVIDER_KEY,
    process.env.DATABASE_URL,
  ].filter((value): value is string => Boolean(value && value.length >= 8));

  const redacted = secrets.reduce((out, secret) => out.split(secret).join("[redacted]"), text);
  return redacted.replace(SECRET_PATTERN, "[redacted]");
}

function summarizeToolResult(call: AiTurnResult["toolCalls"][number]): string {
  if (call.error) {
    return redactKnownSecrets(call.error).slice(0, 200);
  }
  if (!call.result || typeof call.result !== "object") {
    return "ok";
  }
  const record = call.result as Record<string, unknown>;
  if (Array.isArray(record.products)) {
    return `products:${record.products.length}`;
  }
  if (Array.isArray(record.categories)) {
    return `categories:${record.categories.length}`;
  }
  if (record.product && typeof record.product === "object") {
    const slug = (record.product as { slug?: string }).slug;
    return slug ? `product:${slug}` : "product";
  }
  if (typeof record.kind === "string") {
    return record.kind.startsWith("order") || record.kind === "profile"
      ? `customer:${record.kind}`
      : `commerce:${record.kind}`;
  }
  return "ok";
}

function publicTurnMetadata(turn: AiTurnResult): Prisma.JsonObject {
  const products = productsFromTurn(turn);
  const commerce = commerceFromTurn(turn);
  const comparison = comparisonFromTurn(turn);
  const orders = ordersFromTurn(turn);
  const orderStatus = orderStatusFromTurn(turn);
  const tracking = trackingFromTurn(turn);
  const cancellation = cancellationFromTurn(turn);
  return {
    provider: turn.provider,
    model: turn.model ?? null,
    ...(products.length > 0 ? { products } : {}),
    ...(commerce ? { commerce } : {}),
    ...(comparison ? { comparison } : {}),
    ...(orders && orders.length > 0 ? { orders } : {}),
    ...(orderStatus ? { orderStatus } : {}),
    ...(tracking ? { tracking } : {}),
    ...(cancellation ? { cancellation } : {}),
  };
}

function productsFromTurn(turn: AiTurnResult): AiConversationProductDto[] {
  const collected: AiConversationProductDto[] = [];
  for (const call of turn.toolCalls) {
    if (
      call.toolName.startsWith("commerce.") ||
      call.toolName.startsWith("customer.") ||
      call.toolName === "catalogue.compare_products"
    ) {
      continue;
    }
    if (call.status === "error" || !call.result || typeof call.result !== "object") {
      continue;
    }
    const record = call.result as Record<string, unknown>;
    if (Array.isArray(record.products)) {
      for (const item of record.products) {
        const product = toPublicProduct(item);
        if (product) {
          collected.push(product);
        }
      }
    }
    if (record.product) {
      const product = toPublicProduct(record.product);
      if (product) {
        collected.push(product);
      }
    }
  }

  const seen = new Set<string>();
  return collected.filter((product) => {
    if (seen.has(product.slug)) {
      return false;
    }
    seen.add(product.slug);
    return true;
  });
}

function commerceFromTurn(turn: AiTurnResult): AiCommerceActionDto | undefined {
  const calls = turn.toolCalls.filter((call) => call.toolName.startsWith("commerce."));
  const last = calls.at(-1);
  if (!last || !last.result || typeof last.result !== "object") {
    if (last?.status === "error") {
      return {
        kind: kindFromToolName(last.toolName),
        success: false,
        message: last.error,
      };
    }
    return undefined;
  }

  const record = last.result as Record<string, unknown>;
  const kind = kindFromToolName(last.toolName);
  const product = record.product ? toPublicProduct(record.product) : undefined;
  const href = kind.startsWith("wishlist") ? "/account/wishlist" : "/cart";

  return {
    kind,
    success: last.status === "success" && record.success !== false,
    message: typeof record.message === "string" ? record.message : undefined,
    product: product ?? undefined,
    quantity: typeof record.quantity === "number" ? record.quantity : undefined,
    href,
  };
}

function comparisonFromTurn(turn: AiTurnResult): AiComparisonDto | undefined {
  const call = turn.toolCalls.find(
    (item) => item.toolName === "catalogue.compare_products" && item.status === "success",
  );
  if (!call || !call.result || typeof call.result !== "object") {
    return undefined;
  }
  const record = call.result as Record<string, unknown>;
  if (!Array.isArray(record.products)) {
    return undefined;
  }
  const products = record.products
    .map((item) => toPublicComparisonProduct(item))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
  if (products.length < 2) {
    return undefined;
  }
  return { products };
}

function ordersFromTurn(turn: AiTurnResult): AiOrderSummaryDto[] | undefined {
  const collected: AiOrderSummaryDto[] = [];
  for (const call of turn.toolCalls) {
    if (call.status === "error" || !call.result || typeof call.result !== "object") {
      continue;
    }
    if (
      call.toolName !== "customer.get_recent_orders" &&
      call.toolName !== "customer.get_order"
    ) {
      continue;
    }
    const record = call.result as Record<string, unknown>;
    if (Array.isArray(record.orders)) {
      for (const item of record.orders) {
        const order = toPublicOrder(item);
        if (order) {
          collected.push(order);
        }
      }
    }
    if (record.order) {
      const order = toPublicOrder(record.order);
      if (order) {
        collected.push(order);
      }
    }
  }
  const seen = new Set<string>();
  const unique = collected.filter((order) => {
    if (seen.has(order.orderNumber)) {
      return false;
    }
    seen.add(order.orderNumber);
    return true;
  });
  return unique.length > 0 ? unique : undefined;
}

function orderStatusFromTurn(turn: AiTurnResult): AiOrderStatusDto | undefined {
  const last = [...turn.toolCalls]
    .reverse()
    .find((call) => call.toolName === "customer.get_order_status");
  if (!last) {
    return undefined;
  }
  if (last.status === "error") {
    return {
      success: false,
      message: last.error ?? "I couldn't find that order.",
    };
  }
  if (!last.result || typeof last.result !== "object") {
    return undefined;
  }
  const record = last.result as Record<string, unknown>;
  const orderNumber =
    typeof record.orderNumber === "string"
      ? record.orderNumber
      : typeof (record.order as { orderNumber?: unknown } | undefined)?.orderNumber === "string"
        ? (record.order as { orderNumber: string }).orderNumber
        : undefined;
  return {
    success: true,
    orderNumber,
    status: typeof record.status === "string" ? record.status : undefined,
    createdAt: typeof record.createdAt === "string" ? record.createdAt : undefined,
    href: orderNumber ? orderHref(orderNumber) : undefined,
  };
}

function trackingFromTurn(turn: AiTurnResult): AiTrackingResultDto | undefined {
  const last = [...turn.toolCalls]
    .reverse()
    .find((call) => call.toolName === "customer.get_order_tracking");
  if (!last) {
    return undefined;
  }
  if (last.status === "error") {
    return {
      success: false,
      message: last.error ?? "Tracking information isn't available for this order yet.",
    };
  }
  if (!last.result || typeof last.result !== "object") {
    return undefined;
  }
  const record = last.result as Record<string, unknown>;
  const orderNumber = typeof record.orderNumber === "string" ? record.orderNumber : undefined;
  const shipment =
    record.tracking && typeof record.tracking === "object"
      ? (record.tracking as Record<string, unknown>)
      : Array.isArray(record.shipments) && record.shipments[0] && typeof record.shipments[0] === "object"
        ? (record.shipments[0] as Record<string, unknown>)
        : {};
  const events = Array.isArray(shipment.events)
    ? shipment.events
        .map((event) => {
          if (!event || typeof event !== "object") {
            return null;
          }
          const row = event as Record<string, unknown>;
          if (typeof row.status !== "string") {
            return null;
          }
          return {
            status: row.status,
            description: typeof row.description === "string" ? row.description : null,
            location: typeof row.location === "string" ? row.location : null,
            occurredAt: typeof row.occurredAt === "string" ? row.occurredAt : undefined,
          };
        })
        .filter((event): event is NonNullable<typeof event> => Boolean(event))
    : undefined;

  return {
    success: true,
    orderNumber,
    carrier: typeof shipment.carrier === "string" ? shipment.carrier : null,
    trackingNumber: typeof shipment.trackingNumber === "string" ? shipment.trackingNumber : null,
    status: typeof shipment.status === "string" ? shipment.status : undefined,
    shippedAt: typeof shipment.shippedAt === "string" ? shipment.shippedAt : null,
    deliveredAt: typeof shipment.deliveredAt === "string" ? shipment.deliveredAt : null,
    events,
    href: orderNumber ? orderHref(orderNumber) : undefined,
  };
}

function cancellationFromTurn(turn: AiTurnResult): AiCancellationResultDto | undefined {
  const last = [...turn.toolCalls]
    .reverse()
    .find((call) => call.toolName === "customer.cancel_order");
  if (!last) {
    return undefined;
  }
  if (last.status === "error") {
    return {
      success: false,
      message: last.error ?? "This order can no longer be cancelled.",
    };
  }
  if (!last.result || typeof last.result !== "object") {
    return undefined;
  }
  const record = last.result as Record<string, unknown>;
  const orderNumber = typeof record.orderNumber === "string" ? record.orderNumber : undefined;
  return {
    success: last.status === "success" && record.success !== false,
    orderNumber,
    status: typeof record.status === "string" ? record.status : undefined,
    message: typeof record.message === "string" ? record.message : undefined,
    href: orderNumber ? orderHref(orderNumber) : undefined,
  };
}

function toPublicOrder(value: unknown): AiOrderSummaryDto | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const item = value as Record<string, unknown>;
  if (typeof item.orderNumber !== "string" || typeof item.status !== "string") {
    return null;
  }
  const items = Array.isArray(item.items)
    ? item.items
        .map((row) => {
          if (!row || typeof row !== "object") {
            return null;
          }
          const line = row as Record<string, unknown>;
          if (typeof line.productName !== "string" || typeof line.quantity !== "number") {
            return null;
          }
          return {
            productName: line.productName,
            quantity: line.quantity,
            variantName: typeof line.variantName === "string" ? line.variantName : null,
          };
        })
        .filter((row): row is NonNullable<typeof row> => Boolean(row))
    : undefined;

  let total: AiOrderSummaryDto["total"];
  if (
    item.total &&
    typeof item.total === "object" &&
    typeof (item.total as { amountMinor?: unknown }).amountMinor === "string" &&
    typeof (item.total as { currencyCode?: unknown }).currencyCode === "string"
  ) {
    total = {
      amountMinor: (item.total as { amountMinor: string }).amountMinor,
      currencyCode: (item.total as { currencyCode: string }).currencyCode,
    };
  } else {
    total = null;
  }

  return {
    orderNumber: item.orderNumber,
    status: item.status,
    createdAt: typeof item.createdAt === "string" ? item.createdAt : "",
    total,
    currency: typeof item.currency === "string" ? item.currency : total?.currencyCode,
    itemCount: typeof item.itemCount === "number" ? item.itemCount : items?.length,
    items,
    paymentStatus: typeof item.paymentStatus === "string" ? item.paymentStatus : null,
    href: orderHref(item.orderNumber),
  };
}

function orderHref(orderNumber: string): string {
  return `/account/orders/${encodeURIComponent(orderNumber)}`;
}

function kindFromToolName(name: string): AiCommerceActionDto["kind"] {
  if (name === "commerce.remove_from_cart") return "cart_remove";
  if (name === "commerce.update_cart_quantity") return "cart_update";
  if (name === "commerce.add_to_wishlist") return "wishlist_add";
  if (name === "commerce.remove_from_wishlist") return "wishlist_remove";
  return "cart_add";
}

function toPublicComparisonProduct(value: unknown) {
  const product = toPublicProduct(value);
  if (!product) {
    return null;
  }
  const item = value as Record<string, unknown>;
  const variants = Array.isArray(item.variants)
    ? item.variants
        .map((variant) => {
          if (!variant || typeof variant !== "object") {
            return null;
          }
          const row = variant as Record<string, unknown>;
          if (typeof row.id !== "string") {
            return null;
          }
          return {
            id: row.id,
            name: typeof row.name === "string" ? row.name : null,
            inStock: typeof row.inStock === "boolean" ? row.inStock : undefined,
            price:
              row.price && typeof row.price === "object"
                ? toPublicProduct({ id: row.id, slug: product.slug, name: product.name, price: row.price })?.price
                : typeof row.price === "string" && typeof row.currency === "string"
                  ? { amountMinor: row.price, currencyCode: row.currency }
                  : null,
          };
        })
        .filter((variant): variant is NonNullable<typeof variant> => Boolean(variant))
    : undefined;

  return {
    ...product,
    description: typeof item.description === "string" ? item.description : null,
    variants,
  };
}

function toPublicProduct(value: unknown): AiConversationProductDto | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const item = value as Record<string, unknown>;
  if (typeof item.id !== "string" || typeof item.slug !== "string" || typeof item.name !== "string") {
    return null;
  }

  let price: AiConversationProductDto["price"];
  if (
    item.price &&
    typeof item.price === "object" &&
    typeof (item.price as { amountMinor?: unknown }).amountMinor === "string" &&
    typeof (item.price as { currencyCode?: unknown }).currencyCode === "string"
  ) {
    price = {
      amountMinor: (item.price as { amountMinor: string }).amountMinor,
      currencyCode: (item.price as { currencyCode: string }).currencyCode,
    };
  } else if (typeof item.price === "string" && typeof item.currency === "string") {
    price = { amountMinor: item.price, currencyCode: item.currency };
  } else {
    price = null;
  }

  return {
    id: item.id,
    slug: item.slug,
    name: item.name,
    price,
    inStock: typeof item.inStock === "boolean" ? item.inStock : undefined,
    primaryMediaUrl: typeof item.primaryMediaUrl === "string" ? item.primaryMediaUrl : null,
    category: typeof item.category === "string" ? item.category : null,
  };
}

function sanitizeJson(value: unknown): Prisma.InputJsonValue | undefined {
  const cleaned = sanitizeJsonValue(value);
  if (cleaned === undefined || cleaned === null || typeof cleaned !== "object") {
    return undefined;
  }
  return cleaned as Prisma.InputJsonValue;
}

function sanitizeJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeJsonValue(item));
  }
  if (!value || typeof value !== "object") {
    return typeof value === "string" ? redactKnownSecrets(value) : value;
  }
  const out: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    const lower = key.toLowerCase();
    if (
      lower.includes("secret") ||
      lower.includes("password") ||
      lower.includes("token") ||
      lower.includes("apikey") ||
      lower.includes("api_key") ||
      lower.includes("cookie") ||
      lower === "userid" ||
      lower === "customerid" ||
      lower === "accountid"
    ) {
      continue;
    }
    out[key] = sanitizeJsonValue(item);
  }
  return out;
}

function toConversationDto(
  conversation: Pick<ConversationRow, "id" | "channel" | "title" | "metadata">,
  messages: ConversationRow["messages"],
): AiConversationDto {
  const meta = asRecord(conversation.metadata);
  return {
    id: conversation.id,
    channel: conversation.channel,
    title: conversation.title,
    messages: messages.map(toMessageDto),
    provider: typeof meta.provider === "string" ? meta.provider : null,
    model: typeof meta.model === "string" ? meta.model : null,
  };
}

function toMessageDto(row: ConversationRow["messages"][number]): AiMessageDto {
  const meta = asRecord(row.metadata);
  const products = Array.isArray(meta.products)
    ? meta.products
        .map((item) => toPublicProduct(item))
        .filter((item): item is AiConversationProductDto => Boolean(item))
    : undefined;
  const commerce = isCommerce(meta.commerce) ? meta.commerce : undefined;
  const comparison = isComparison(meta.comparison) ? meta.comparison : undefined;
  const orders = Array.isArray(meta.orders)
    ? meta.orders
        .map((item) => toPublicOrder(item))
        .filter((item): item is AiOrderSummaryDto => Boolean(item))
    : undefined;
  const orderStatus = isOrderStatus(meta.orderStatus) ? meta.orderStatus : undefined;
  const tracking = isTracking(meta.tracking) ? meta.tracking : undefined;
  const cancellation = isCancellation(meta.cancellation) ? meta.cancellation : undefined;

  return {
    id: row.id,
    role: row.role,
    content: row.content,
    createdAt: row.createdAt.toISOString(),
    ...(products && products.length > 0 ? { products } : {}),
    ...(commerce ? { commerce } : {}),
    ...(comparison ? { comparison } : {}),
    ...(orders && orders.length > 0 ? { orders } : {}),
    ...(orderStatus ? { orderStatus } : {}),
    ...(tracking ? { tracking } : {}),
    ...(cancellation ? { cancellation } : {}),
  };
}

function isCommerce(value: unknown): value is AiCommerceActionDto {
  return Boolean(value && typeof value === "object" && "kind" in value && "success" in value);
}

function isComparison(value: unknown): value is AiComparisonDto {
  return Boolean(
    value &&
      typeof value === "object" &&
      Array.isArray((value as { products?: unknown }).products) &&
      (value as { products: unknown[] }).products.length >= 2,
  );
}

function isOrderStatus(value: unknown): value is AiOrderStatusDto {
  return Boolean(value && typeof value === "object" && "success" in value);
}

function isTracking(value: unknown): value is AiTrackingResultDto {
  return Boolean(value && typeof value === "object" && "success" in value);
}

function isCancellation(value: unknown): value is AiCancellationResultDto {
  return Boolean(value && typeof value === "object" && "success" in value);
}

function asRecord(value: Prisma.JsonValue): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}
