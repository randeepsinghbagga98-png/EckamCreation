import { prisma } from "@eckamcreation/database";
import { CheckoutService } from "./checkout-service";

let service: CheckoutService | null = null;

export function getCheckoutService(): CheckoutService {
  if (!service) service = new CheckoutService(prisma);
  return service;
}

export function resetCheckoutServices(): void {
  service = null;
}

export { CheckoutService };
export { TaxService } from "./tax-service";
export { ShippingService } from "./shipping-service";
export { DiscountService } from "./discount-service";
