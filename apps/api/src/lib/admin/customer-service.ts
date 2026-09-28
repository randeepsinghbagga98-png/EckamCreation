import { writeAuditLog } from "@eckamcreation/auth";
import type { Prisma, PrismaClient } from "@eckamcreation/database";
import type { AdminCustomerDetailDto, AdminCustomerSummaryDto } from "@eckamcreation/api-contracts";
import { notFound } from "../errors";

const SENSITIVE_META_KEYS = /password|token|secret|hash|credential|signature|cvv|card/i;

function sanitizeMetadata(meta: unknown): Record<string, unknown> | null {
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return null;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(meta as Record<string, unknown>)) {
    if (SENSITIVE_META_KEYS.test(key)) continue;
    if (typeof value === "string" && SENSITIVE_META_KEYS.test(value)) continue;
    out[key] = value;
  }
  return out;
}

export class AdminCustomerService {
  constructor(private readonly prisma: PrismaClient) {}

  async list(input: {
    cursor?: string;
    limit: number;
    q?: string;
    includeDeleted?: boolean;
  }): Promise<{
    items: AdminCustomerSummaryDto[];
    pagination: { nextCursor: string | null; hasMore: boolean };
  }> {
    const take = Math.min(input.limit, 100);
    const where: Prisma.UserWhereInput = {
      profile: { isNot: null },
      ...(input.includeDeleted ? {} : { deletedAt: null }),
    };
    if (input.q) {
      where.OR = [
        { email: { contains: input.q, mode: "insensitive" } },
        { name: { contains: input.q, mode: "insensitive" } },
        { profile: { phone: { contains: input.q, mode: "insensitive" } } },
      ];
    }

    const rows = await this.prisma.user.findMany({
      where,
      take: take + 1,
      ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: {
        id: true,
        email: true,
        name: true,
        emailVerified: true,
        deletedAt: true,
        createdAt: true,
        profile: { select: { phone: true, locale: true } },
        _count: { select: { orders: true } },
      },
    });

    const hasMore = rows.length > take;
    const page = hasMore ? rows.slice(0, take) : rows;
    return {
      items: page.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        phone: u.profile?.phone ?? null,
        locale: u.profile?.locale ?? null,
        emailVerified: Boolean(u.emailVerified),
        deletedAt: u.deletedAt?.toISOString() ?? null,
        createdAt: u.createdAt.toISOString(),
        orderCount: u._count.orders,
      })),
      pagination: {
        nextCursor: hasMore ? page[page.length - 1]!.id : null,
        hasMore,
      },
    };
  }

  async getById(id: string): Promise<AdminCustomerDetailDto> {
    const user = await this.prisma.user.findFirst({
      where: { id, profile: { isNot: null } },
      select: {
        id: true,
        email: true,
        name: true,
        emailVerified: true,
        deletedAt: true,
        createdAt: true,
        profile: {
          select: {
            phone: true,
            locale: true,
            notes: true,
            defaultCurrencyCode: true,
            defaultCountryId: true,
          },
        },
        addresses: {
          select: {
            id: true,
            type: true,
            fullName: true,
            city: true,
            countryId: true,
            isDefault: true,
          },
          orderBy: { createdAt: "desc" },
          take: 50,
        },
        orders: {
          select: { placedAt: true },
          orderBy: { placedAt: "desc" },
          take: 1,
        },
        _count: { select: { orders: true } },
      },
    });
    if (!user || !user.profile) throw notFound("Customer not found");

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.profile.phone,
      locale: user.profile.locale,
      emailVerified: Boolean(user.emailVerified),
      deletedAt: user.deletedAt?.toISOString() ?? null,
      createdAt: user.createdAt.toISOString(),
      orderCount: user._count.orders,
      notes: user.profile.notes,
      defaultCurrencyCode: user.profile.defaultCurrencyCode,
      defaultCountryId: user.profile.defaultCountryId,
      addresses: user.addresses.map((a) => ({
        id: a.id,
        type: a.type,
        fullName: a.fullName,
        city: a.city,
        countryId: a.countryId,
        isDefault: a.isDefault,
      })),
      orderSummary: {
        total: user._count.orders,
        lastOrderAt: user.orders[0]?.placedAt.toISOString() ?? null,
      },
    };
  }

  async update(
    id: string,
    input: {
      name?: string | null;
      phone?: string | null;
      locale?: string | null;
      notes?: string | null;
      deleted?: boolean;
    },
    staffUserId: string,
  ) {
    const existing = await this.prisma.user.findFirst({
      where: { id, profile: { isNot: null } },
      include: { profile: true },
    });
    if (!existing?.profile) throw notFound("Customer not found");

    await this.prisma.$transaction(async (tx) => {
      if (input.name !== undefined || input.deleted !== undefined) {
        await tx.user.update({
          where: { id },
          data: {
            ...(input.name !== undefined ? { name: input.name } : {}),
            ...(input.deleted === true
              ? { deletedAt: existing.deletedAt ?? new Date() }
              : input.deleted === false
                ? { deletedAt: null }
                : {}),
          },
        });
      }
      if (
        input.phone !== undefined ||
        input.locale !== undefined ||
        input.notes !== undefined
      ) {
        await tx.customerProfile.update({
          where: { userId: id },
          data: {
            ...(input.phone !== undefined ? { phone: input.phone } : {}),
            ...(input.locale !== undefined ? { locale: input.locale } : {}),
            ...(input.notes !== undefined ? { notes: input.notes } : {}),
          },
        });
      }
    });

    await writeAuditLog(this.prisma, {
      action: "customer.updated",
      entityType: "User",
      entityId: id,
      staffUserId,
      metadata: {
        fields: Object.keys(input).filter((k) => input[k as keyof typeof input] !== undefined),
        deleted: input.deleted,
      },
    });

    return this.getById(id);
  }
}

export class AuditLogService {
  constructor(private readonly prisma: PrismaClient) {}

  async list(input: {
    cursor?: string;
    limit: number;
    actorStaffUserId?: string;
    action?: string;
    entityType?: string;
    entityId?: string;
    from?: string;
    to?: string;
  }) {
    const take = Math.min(input.limit, 100);
    const where: Prisma.AuditLogWhereInput = {};
    if (input.actorStaffUserId) where.staffUserId = input.actorStaffUserId;
    if (input.action) where.action = { contains: input.action, mode: "insensitive" };
    if (input.entityType) where.entityType = input.entityType;
    if (input.entityId) where.entityId = input.entityId;
    if (input.from || input.to) {
      where.createdAt = {
        ...(input.from ? { gte: new Date(input.from) } : {}),
        ...(input.to ? { lte: new Date(input.to) } : {}),
      };
    }

    const rows = await this.prisma.auditLog.findMany({
      where,
      take: take + 1,
      ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    });

    const hasMore = rows.length > take;
    const page = hasMore ? rows.slice(0, take) : rows;
    return {
      items: page.map((row) => ({
        id: row.id,
        staffUserId: row.staffUserId,
        actorUserId: row.actorUserId,
        action: row.action,
        entityType: row.entityType,
        entityId: row.entityId,
        metadata: sanitizeMetadata(row.metadata),
        ipAddress: row.ipAddress,
        createdAt: row.createdAt.toISOString(),
      })),
      pagination: {
        nextCursor: hasMore ? page[page.length - 1]!.id : null,
        hasMore,
      },
    };
  }
}
