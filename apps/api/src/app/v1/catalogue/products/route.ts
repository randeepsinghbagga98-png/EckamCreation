import { productListQuerySchema } from "@eckamcreation/api-contracts";
import { getProductService } from "../../../../lib/catalogue";
import { jsonOk, withApiHandler } from "../../../../lib/http";
import { fromZodError } from "../../../../lib/errors";

export const GET = withApiHandler(async (request, requestId) => {
  const url = new URL(request.url);
  const parsed = productListQuerySchema.safeParse(Object.fromEntries(url.searchParams.entries()));
  if (!parsed.success) throw fromZodError(parsed.error);

  const result = await getProductService().listPublic(parsed.data);
  return jsonOk(
    { items: result.items },
    { requestId, pagination: result.pagination },
  );
});
