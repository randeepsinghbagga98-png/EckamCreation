import { getPricingService } from "../../../../../../lib/catalogue";
import { jsonOk, withApiHandler } from "../../../../../../lib/http";
import { fromZodError, notFound } from "../../../../../../lib/errors";
import { resolvePriceQuerySchema } from "@eckamcreation/api-contracts";
import { prisma } from "@eckamcreation/database";

type RouteContext = { params: Promise<{ id: string }> };

export const GET = withApiHandler(async (request, requestId, context: RouteContext) => {
  const { id } = await context.params;
  const variant = await prisma.productVariant.findFirst({
    where: { id, deletedAt: null, isActive: true, product: { deletedAt: null, status: "ACTIVE" } },
    select: { id: true },
  });
  if (!variant) throw notFound("Variant not found");

  const url = new URL(request.url);
  const parsed = resolvePriceQuerySchema.safeParse(Object.fromEntries(url.searchParams.entries()));
  if (!parsed.success) throw fromZodError(parsed.error);

  const priced = await getPricingService().getVariantPrice(id, {
    currencyCode: parsed.data.currency,
    countryCode: parsed.data.country,
  });
  if (!priced) throw notFound("Price not found for currency");

  return jsonOk(
    {
      variantId: id,
      price: priced.price,
      compareAtPrice: priced.compareAtPrice,
    },
    { requestId },
  );
});
