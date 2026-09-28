import { prisma } from "@eckamcreation/database";
import { jsonOk, withApiHandler } from "../../../../../lib/http";
import { notFound } from "../../../../../lib/errors";
import {
  availableUnits,
  moneyFromMinor,
  resolveCountryId,
  resolvePrice,
  type PriceRow,
} from "../../../../../lib/catalogue/pricing";

type RouteContext = { params: Promise<{ id: string }> };

export const GET = withApiHandler(async (request, requestId, context: RouteContext) => {
  const { id } = await context.params;
  const url = new URL(request.url);
  const currency = (url.searchParams.get("currency") ?? "INR").toUpperCase();
  const countryId = await resolveCountryId(prisma, url.searchParams.get("country"));

  const variant = await prisma.productVariant.findFirst({
    where: {
      id,
      deletedAt: null,
      isActive: true,
      product: { deletedAt: null, status: "ACTIVE" },
    },
    include: {
      prices: true,
      inventoryItems: { select: { onHand: true, reserved: true } },
      attributeValues: {
        include: { attributeValue: { include: { attribute: true } } },
      },
    },
  });
  if (!variant) throw notFound("Variant not found");

  const resolved = resolvePrice(variant.prices as PriceRow[], {
    currencyCode: currency,
    countryId,
  });

  return jsonOk(
    {
      id: variant.id,
      productId: variant.productId,
      sku: variant.sku,
      name: variant.name,
      isDefault: variant.isDefault,
      isActive: variant.isActive,
      attributes: variant.attributeValues.map((row) => ({
        code: row.attributeValue.attribute.code,
        name: row.attributeValue.attribute.name,
        value: row.attributeValue.value,
      })),
      price: resolved ? moneyFromMinor(resolved.amountMinor, resolved.currencyCode) : null,
      compareAtPrice: resolved?.compareAtMinor
        ? moneyFromMinor(resolved.compareAtMinor, resolved.currencyCode)
        : null,
      inStock: variant.inventoryItems.some((i) => availableUnits(i.onHand, i.reserved) > 0),
    },
    { requestId },
  );
});
