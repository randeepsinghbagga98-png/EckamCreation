import { conflict, validationError } from "../errors";

export type OrderStatusValue =
  | "PENDING_PAYMENT"
  | "PAID"
  | "PROCESSING"
  | "PARTIALLY_SHIPPED"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED"
  | "REFUNDED"
  | "PARTIALLY_REFUNDED";

const ALLOWED: Record<OrderStatusValue, OrderStatusValue[]> = {
  PENDING_PAYMENT: ["PAID", "CANCELLED"],
  PAID: ["PROCESSING", "CANCELLED", "REFUNDED"],
  PROCESSING: ["PARTIALLY_SHIPPED", "SHIPPED", "CANCELLED", "REFUNDED"],
  PARTIALLY_SHIPPED: ["SHIPPED", "DELIVERED", "CANCELLED"],
  SHIPPED: ["DELIVERED", "REFUNDED", "PARTIALLY_REFUNDED"],
  DELIVERED: ["REFUNDED", "PARTIALLY_REFUNDED"],
  CANCELLED: [],
  REFUNDED: [],
  PARTIALLY_REFUNDED: ["REFUNDED"],
};

export class OrderStateService {
  assertTransition(from: string, to: string): void {
    const allowed = ALLOWED[from as OrderStatusValue];
    if (!allowed) throw validationError(`Unknown order status: ${from}`);
    if (!allowed.includes(to as OrderStatusValue)) {
      throw conflict(`Invalid order status transition ${from} → ${to}`);
    }
  }

  canCancel(status: string): boolean {
    return ["PENDING_PAYMENT", "PAID", "PROCESSING", "PARTIALLY_SHIPPED"].includes(status);
  }
}
