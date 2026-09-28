import type { PrismaClient } from "@eckamcreation/database";
import { availableUnits } from "../catalogue/pricing";

export type InventoryCheckResult = {
  ok: boolean;
  variantId: string;
  available: number;
  requested: number;
};

/**
 * Inventory validation boundary only — does not reserve or decrement stock.
 */
export class InventoryValidationService {
  constructor(private readonly prisma: PrismaClient) {}

  async checkVariants(
    lines: Array<{ variantId: string; quantity: number }>,
  ): Promise<InventoryCheckResult[]> {
    const ids = [...new Set(lines.map((l) => l.variantId))];
    const items = await this.prisma.inventoryItem.findMany({
      where: { variantId: { in: ids }, location: { isActive: true } },
    });

    const byVariant = new Map<string, number>();
    for (const row of items) {
      const prev = byVariant.get(row.variantId) ?? 0;
      byVariant.set(row.variantId, prev + availableUnits(row.onHand, row.reserved));
    }

    return lines.map((line) => {
      // If no inventory rows exist, treat as unconstrained (catalogue-only markets).
      const hasRows = items.some((i) => i.variantId === line.variantId);
      const available = hasRows ? (byVariant.get(line.variantId) ?? 0) : line.quantity;
      return {
        ok: available >= line.quantity,
        variantId: line.variantId,
        available,
        requested: line.quantity,
      };
    });
  }
}
