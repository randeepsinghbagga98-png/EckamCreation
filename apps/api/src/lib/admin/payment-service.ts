import { moneyFromBigInt, type AdminPaymentIntentDto } from "@eckamcreation/api-contracts";
import type { Prisma, PrismaClient } from "@eckamcreation/database";
import { notFound } from "../errors";

export class AdminPaymentService {
  constructor(private readonly prisma: PrismaClient) {}

  async list(input: {
    cursor?: string;
    limit: number;
    status?: string;
    orderId?: string;
    provider?: string;
  }): Promise<{
    items: AdminPaymentIntentDto[];
    pagination: { nextCursor: string | null; hasMore: boolean };
  }> {
    const take = Math.min(input.limit, 100);
    const where: Prisma.PaymentIntentWhereInput = {
      ...(input.status ? { status: input.status as "REQUIRES_PAYMENT" } : {}),
      ...(input.orderId ? { orderId: input.orderId } : {}),
      ...(input.provider ? { provider: input.provider } : {}),
    };

    const rows = await this.prisma.paymentIntent.findMany({
      where,
      take: take + 1,
      ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: {
        id: true,
        orderId: true,
        provider: true,
        status: true,
        amountMinor: true,
        currencyCode: true,
        providerIntentId: true,
        metadata: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const hasMore = rows.length > take;
    const page = hasMore ? rows.slice(0, take) : rows;
    return {
      items: page.map((row) => this.toDto(row)),
      pagination: {
        nextCursor: hasMore ? page[page.length - 1]!.id : null,
        hasMore,
      },
    };
  }

  async getById(id: string): Promise<AdminPaymentIntentDto> {
    const row = await this.prisma.paymentIntent.findUnique({
      where: { id },
      select: {
        id: true,
        orderId: true,
        provider: true,
        status: true,
        amountMinor: true,
        currencyCode: true,
        providerIntentId: true,
        metadata: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!row) throw notFound("Payment intent not found");
    return this.toDto(row);
  }

  private toDto(row: {
    id: string;
    orderId: string | null;
    provider: string;
    status: string;
    amountMinor: bigint;
    currencyCode: string;
    providerIntentId: string | null;
    metadata: Prisma.JsonValue | null;
    createdAt: Date;
    updatedAt: Date;
  }): AdminPaymentIntentDto {
    const checkoutSessionId =
      row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
        ? typeof (row.metadata as { checkoutSessionId?: unknown }).checkoutSessionId === "string"
          ? (row.metadata as { checkoutSessionId: string }).checkoutSessionId
          : null
        : null;

    return {
      id: row.id,
      orderId: row.orderId,
      checkoutSessionId,
      provider: row.provider,
      status: row.status,
      amount: moneyFromBigInt(row.amountMinor, row.currencyCode),
      providerIntentId: row.providerIntentId,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
