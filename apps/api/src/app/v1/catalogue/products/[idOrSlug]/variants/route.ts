import { getProductService } from "../../../../../../lib/catalogue";
import { jsonOk, withApiHandler } from "../../../../../../lib/http";

type RouteContext = { params: Promise<{ idOrSlug: string }> };

export const GET = withApiHandler(async (request, requestId, context: RouteContext) => {
  const { idOrSlug } = await context.params;
  const url = new URL(request.url);
  const product = await getProductService().getPublicBySlugOrId(idOrSlug, {
    currency: url.searchParams.get("currency") ?? undefined,
    country: url.searchParams.get("country") ?? undefined,
  });
  return jsonOk(
    {
      items: product.variants,
      defaultVariantId: product.defaultVariantId,
    },
    { requestId },
  );
});
