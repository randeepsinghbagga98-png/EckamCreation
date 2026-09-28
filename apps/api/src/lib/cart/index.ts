import { prisma } from "@eckamcreation/database";
import { CartService } from "./cart-service";

let service: CartService | null = null;

export function getCartService(): CartService {
  if (!service) service = new CartService(prisma);
  return service;
}

/** Test hook */
export function resetCartServices(): void {
  service = null;
}

export { CartService, readGuestToken, type CartIdentity, type CartContext } from "./cart-service";
export { resolveCartIdentity } from "./identity";
