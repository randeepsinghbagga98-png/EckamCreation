import {
  PaymentProviderRegistry,
  PaymentService,
  TestPaymentAdapter,
  TEST_PAYMENT_PROVIDER_ID,
  assertTestProviderAllowed,
} from "@eckamcreation/payments";
import { prisma } from "@eckamcreation/database";
import { getOrderService } from "../orders";

let registry: PaymentProviderRegistry | null = null;
let paymentService: PaymentService | null = null;
let testAdapter: TestPaymentAdapter | null = null;

export function getPaymentRegistry(): PaymentProviderRegistry {
  if (!registry) {
    registry = new PaymentProviderRegistry();
    // Production providers (PhonePe/Cashfree/etc.) are NOT registered in Phase 4.1.
    // Test adapter is registered only outside production when explicitly allowed.
    const nodeEnv = process.env.NODE_ENV;
    const allowTest =
      process.env.ALLOW_TEST_PAYMENT_PROVIDER === "1" || nodeEnv === "test";
    if (allowTest && nodeEnv !== "production") {
      assertTestProviderAllowed(nodeEnv);
      testAdapter = new TestPaymentAdapter();
      registry.register(testAdapter);
    }
  }
  return registry;
}

export function getTestPaymentAdapter(): TestPaymentAdapter | null {
  getPaymentRegistry();
  return testAdapter;
}

export function getPaymentService(): PaymentService {
  if (!paymentService) {
    const allowTest =
      process.env.ALLOW_TEST_PAYMENT_PROVIDER === "1" ||
      process.env.NODE_ENV === "test";
    paymentService = new PaymentService({
      prisma,
      registry: getPaymentRegistry(),
      allowTestProvider: allowTest,
      nodeEnv: process.env.NODE_ENV,
      onPaymentSucceeded: async (paymentIntentId) => {
        await getOrderService().createFromPaidCheckout({ paymentIntentId });
      },
    });
  }
  return paymentService;
}

/** Test hook */
export function resetPaymentServices(): void {
  registry = null;
  paymentService = null;
  testAdapter = null;
}

export { TEST_PAYMENT_PROVIDER_ID };
