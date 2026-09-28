import { writeAuditLog } from "@eckamcreation/auth";
import type { Prisma, PrismaClient } from "@eckamcreation/database";
import type { AdminInventoryItemDto } from "@eckamcreation/api-contracts";
import { conflict, notFound, validationError } from "../errors";

function toItemDto(row: {
  id: string;
  variantId: string;
  locationId: string;
  onHand: number;
  reserved: number;
  updatedAt: Date;
  variant: { sku: string; productId: string; product: { name: string } };
  location: { code: string; name: string };
}): AdminInventoryItemDto {
  return {
    id: row.id,
    variantId: row.variantId,
    sku: row.variant.sku,
    productId: row.variant.productId,
    productName: row.variant.product.name,
    locationId: row.locationId,
    locationCode: row.location.code,
    locationName: row.location.name,
    onHand: row.onHand,
    reserved: row.reserved,
    available: Math.max(0, row.onHand - row.reserved),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export class InventoryService {
  constructor(private readonly prisma: PrismaClient) {}

  async list(input: {
    cursor?: string;
    limit: number;
    locationId?: string;
    variantId?: string;
    sku?: string;
    lowStock?: boolean;
  }) {
    const where: Prisma.InventoryItemWhereInput = {};
    if (input.locationId) where.locationId = input.locationId;
    if (input.variantId) where.variantId = input.variantId;
    if (input.sku) where.variant = { sku: { contains: input.sku, mode: "insensitive" } };
    if (input.lowStock) where.onHand = { lte: 5 };

    const take = Math.min(input.limit, 100);
    const rows = await this.prisma.inventoryItem.findMany({
      where,
      take: take + 1,
      ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      include: {
        variant: { select: { sku: true, productId: true, product: { select: { name: true } } } },
        location: { select: { code: true, name: true } },
      },
    });

    const items = rows.map(toItemDto);
    const hasMore = items.length > take;
    const page = hasMore ? items.slice(0, take) : items;
    return {
      items: page,
      pagination: {
        nextCursor: hasMore ? page[page.length - 1]!.id : null,
        hasMore,
      },
    };
  }

  async getById(id: string) {
    const row = await this.prisma.inventoryItem.findUnique({
      where: { id },
      include: {
        variant: { select: { sku: true, productId: true, product: { select: { name: true } } } },
        location: { select: { code: true, name: true } },
      },
    });
    if (!row) throw notFound("Inventory item not found");
    return toItemDto(row);
  }

  async listMovements(inventoryItemId: string, input: { cursor?: string; limit: number }) {
    const item = await this.prisma.inventoryItem.findUnique({ where: { id: inventoryItemId } });
    if (!item) throw notFound("Inventory item not found");

    const take = Math.min(input.limit, 100);
    const rows = await this.prisma.inventoryMovement.findMany({
      where: { inventoryItemId },
      take: take + 1,
      ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    });

    const hasMore = rows.length > take;
    const page = hasMore ? rows.slice(0, take) : rows;
    return {
      items: page.map((m) => ({
        id: m.id,
        inventoryItemId: m.inventoryItemId,
        type: m.type,
        quantityDelta: m.quantityDelta,
        reason: m.reason,
        referenceType: m.referenceType,
        referenceId: m.referenceId,
        staffUserId: m.staffUserId,
        createdAt: m.createdAt.toISOString(),
      })),
      pagination: {
        nextCursor: hasMore ? page[page.length - 1]!.id : null,
        hasMore,
      },
    };
  }

  /**
   * Transactional stock adjustment with InventoryMovement + audit.
   * Rejects resulting negative onHand unless allowNegative is true.
   */
  async adjust(input: {
    variantId: string;
    locationId: string;
    quantityDelta: number;
    reason: string;
    allowNegative?: boolean;
    staffUserId: string;
  }) {
    if (input.quantityDelta === 0) {
      throw validationError("quantityDelta must be non-zero");
    }

    const variant = await this.prisma.productVariant.findFirst({
      where: { id: input.variantId, deletedAt: null },
    });
    if (!variant) throw notFound("Variant not found");

    const location = await this.prisma.inventoryLocation.findFirst({
      where: { id: input.locationId, isActive: true },
    });
    if (!location) throw notFound("Inventory location not found");

    const result = await this.prisma.$transaction(async (tx) => {
      let item = await tx.inventoryItem.findUnique({
        where: {
          variantId_locationId: {
            variantId: input.variantId,
            locationId: input.locationId,
          },
        },
      });

      if (!item) {
        if (input.quantityDelta < 0 && !input.allowNegative) {
          throw conflict("Cannot reduce stock below zero for a new inventory row");
        }
        item = await tx.inventoryItem.create({
          data: {
            variantId: input.variantId,
            locationId: input.locationId,
            onHand: 0,
            reserved: 0,
          },
        });
      }

      const nextOnHand = item.onHand + input.quantityDelta;
      if (nextOnHand < 0 && !input.allowNegative) {
        throw conflict("Adjustment would result in negative stock");
      }

      const updated = await tx.inventoryItem.update({
        where: { id: item.id },
        data: { onHand: nextOnHand },
        include: {
          variant: { select: { sku: true, productId: true, product: { select: { name: true } } } },
          location: { select: { code: true, name: true } },
        },
      });

      const movement = await tx.inventoryMovement.create({
        data: {
          inventoryItemId: item.id,
          type: input.quantityDelta > 0 ? "RECEIPT" : "ADJUSTMENT",
          quantityDelta: input.quantityDelta,
          reason: input.reason,
          referenceType: "AdminAdjustment",
          referenceId: item.id,
          staffUserId: input.staffUserId,
        },
      });

      return { item: updated, movement };
    });

    await writeAuditLog(this.prisma, {
      action: "inventory.adjusted",
      entityType: "InventoryItem",
      entityId: result.item.id,
      staffUserId: input.staffUserId,
      metadata: {
        variantId: input.variantId,
        locationId: input.locationId,
        quantityDelta: input.quantityDelta,
        reason: input.reason,
        onHand: result.item.onHand,
      },
    });

    return {
      item: toItemDto(result.item),
      movement: {
        id: result.movement.id,
        inventoryItemId: result.movement.inventoryItemId,
        type: result.movement.type,
        quantityDelta: result.movement.quantityDelta,
        reason: result.movement.reason,
        referenceType: result.movement.referenceType,
        referenceId: result.movement.referenceId,
        staffUserId: result.movement.staffUserId,
        createdAt: result.movement.createdAt.toISOString(),
      },
    };
  }
}
