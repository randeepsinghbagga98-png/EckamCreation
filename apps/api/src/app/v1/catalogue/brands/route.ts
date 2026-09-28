import { getBrandService } from "../../../../lib/catalogue";
import { jsonOk, withApiHandler } from "../../../../lib/http";

export const GET = withApiHandler(async (_request, requestId) => {
  const items = await getBrandService().listPublic();
  return jsonOk({ items }, { requestId });
});
