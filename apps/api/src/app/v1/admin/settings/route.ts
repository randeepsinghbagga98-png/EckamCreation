import { PERMISSIONS } from "@eckamcreation/auth";
import { requirePermission } from "../../../../lib/auth/guards";
import { getAiRegistry } from "../../../../lib/ai";
import { hasLivePaymentProvider } from "../../../../lib/payments";
import { jsonOk, withApiHandler } from "../../../../lib/http";
import { preferredAiProviderId } from "@eckamcreation/ai";

export const GET = withApiHandler(async (request, requestId) => {
  await requirePermission(request, PERMISSIONS.DASHBOARD_READ);
  const preferred = preferredAiProviderId({
    AI_PROVIDER: process.env.AI_PROVIDER,
  });
  const adapter = preferred ? getAiRegistry().get(preferred) : null;
  const aiConfigured = Boolean(adapter?.isConfigured() && preferred !== "development");

  return jsonOk(
    {
      storeName: process.env.NEXT_PUBLIC_APP_NAME?.trim() || "Eckam Creation",
      environment: process.env.NODE_ENV || "development",
      defaultCurrencyCode: "INR",
      defaultLocale: "en-IN",
      paymentProviderConfigured: hasLivePaymentProvider(),
      aiProviderConfigured: aiConfigured,
    },
    { requestId },
  );
});
