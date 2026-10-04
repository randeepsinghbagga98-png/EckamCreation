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
    // No live provider is registered. PAYMENT_PROVIDER / key / secret / webhook
    // env vars are reserved and do not activate an adapter by themselves.
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

/** True only when a non-test adapter is registered and configured. */
export function hasLivePaymentProvider(): boolean {
  return getPaymentRegistry()
    .list()
    .some((adapter) => adapter.id !== TEST_PAYMENT_PROVIDER_ID && adapter.isConfigured());
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
