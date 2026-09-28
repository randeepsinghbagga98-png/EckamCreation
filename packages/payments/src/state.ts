import { PaymentConflictError, PaymentValidationError } from "./errors";

export type PaymentIntentStatusValue =
  | "REQUIRES_PAYMENT"
  | "PROCESSING"
  | "SUCCEEDED"
  | "FAILED"
  | "CANCELLED";

const ALLOWED: Record<PaymentIntentStatusValue, PaymentIntentStatusValue[]> = {
  REQUIRES_PAYMENT: ["PROCESSING", "FAILED", "CANCELLED"],
  PROCESSING: ["SUCCEEDED", "FAILED", "CANCELLED"],
  SUCCEEDED: [],
  FAILED: [],
  CANCELLED: [],
};

export class PaymentStateService {
  assertTransition(from: string, to: string): void {
    const allowed = ALLOWED[from as PaymentIntentStatusValue];
    if (!allowed) throw new PaymentValidationError(`Unknown payment status: ${from}`);
    if (!allowed.includes(to as PaymentIntentStatusValue)) {
      throw new PaymentConflictError(`Invalid payment status transition ${from} → ${to}`);
    }
  }

  isTerminal(status: string): boolean {
    return status === "SUCCEEDED" || status === "FAILED" || status === "CANCELLED";
  }
}
