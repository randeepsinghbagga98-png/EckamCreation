import { getCategoryService } from "../../../../../lib/catalogue";
import { jsonOk, withApiHandler } from "../../../../../lib/http";

type RouteContext = { params: Promise<{ idOrSlug: string }> };

export const GET = withApiHandler(async (_request, requestId, context: RouteContext) => {
  const { idOrSlug } = await context.params;
  const category = await getCategoryService().getPublicBySlugOrId(idOrSlug);
  return jsonOk(category, { requestId });
});
