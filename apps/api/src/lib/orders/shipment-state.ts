import { conflict, validationError } from "../errors";

export type ShipmentStatusValue =
  | "PENDING"
  | "LABEL_CREATED"
  | "IN_TRANSIT"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "FAILED"
  | "RETURNED"
  | "CANCELLED";

const ALLOWED: Record<ShipmentStatusValue, ShipmentStatusValue[]> = {
  PENDING: ["LABEL_CREATED", "IN_TRANSIT", "CANCELLED"],
  LABEL_CREATED: ["IN_TRANSIT", "CANCELLED"],
  IN_TRANSIT: ["OUT_FOR_DELIVERY", "DELIVERED", "FAILED", "RETURNED"],
  OUT_FOR_DELIVERY: ["DELIVERED", "FAILED", "RETURNED"],
  DELIVERED: [],
  FAILED: ["RETURNED", "IN_TRANSIT"],
  RETURNED: [],
  CANCELLED: [],
};

export class ShipmentStateService {
  assertTransition(from: string, to: string): void {
    const allowed = ALLOWED[from as ShipmentStatusValue];
    if (!allowed) throw validationError(`Unknown shipment status: ${from}`);
    if (!allowed.includes(to as ShipmentStatusValue)) {
      throw conflict(`Invalid shipment status transition ${from} → ${to}`);
    }
  }
}
