import { resolveCustomer } from "../auth/guards";
import { readGuestToken, type CartIdentity } from "./cart-service";

export async function resolveCartIdentity(request: Request): Promise<CartIdentity | null> {
  const customer = await resolveCustomer(request);
  if (customer) return { kind: "customer", userId: customer.userId };
  const guestToken = readGuestToken(request);
  if (guestToken) return { kind: "guest", guestToken };
  return null;
}
