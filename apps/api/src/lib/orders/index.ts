import { prisma } from "@eckamcreation/database";
import { CheckoutPaymentIntentService, OrderService } from "./order-service";

let orderService: OrderService | null = null;
let paymentIntentService: CheckoutPaymentIntentService | null = null;

export function getOrderService(): OrderService {
  if (!orderService) orderService = new OrderService(prisma);
  return orderService;
}

export function getCheckoutPaymentIntentService(): CheckoutPaymentIntentService {
  if (!paymentIntentService) paymentIntentService = new CheckoutPaymentIntentService(prisma);
  return paymentIntentService;
}

export function resetOrderServices(): void {
  orderService = null;
  paymentIntentService = null;
}

export { OrderService, CheckoutPaymentIntentService } from "./order-service";
export { testFixtureMarkPaymentSucceeded } from "./test-payment-fixture";
