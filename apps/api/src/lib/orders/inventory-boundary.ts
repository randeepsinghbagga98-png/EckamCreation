import type { Prisma } from "@eckamcreation/database";

/**
 * Inventory boundary for order placement.
 * Decrements onHand and records SALE movements when inventory rows exist.
 * Does not invent stock when no InventoryItem rows are present.
 */
export class OrderInventoryService {
  async applySaleForOrder(
    tx: Prisma.TransactionClient,
    input: {
      orderId: string;
      lines: Array<{ variantId: string | null; quantity: number }>;
    },
  ): Promise<void> {
    for (const line of input.lines) {
      if (!line.variantId || line.quantity <= 0) continue;

      const items = await tx.inventoryItem.findMany({
        where: { variantId: line.variantId, location: { isActive: true } },
        orderBy: { updatedAt: "desc" },
      });
      if (items.length === 0) continue;

      let remaining = line.quantity;
      for (const item of items) {
        if (remaining <= 0) break;
        const available = Math.max(0, item.onHand - item.reserved);
        if (available <= 0) continue;
        const take = Math.min(available, remaining);
        await tx.inventoryItem.update({
          where: { id: item.id },
          data: { onHand: item.onHand - take },
        });
        await tx.inventoryMovement.create({
          data: {
            inventoryItemId: item.id,
            type: "SALE",
            quantityDelta: -take,
            reason: "order_placed",
            referenceType: "Order",
            referenceId: input.orderId,
          },
        });
        remaining -= take;
      }
    }
  }
}
