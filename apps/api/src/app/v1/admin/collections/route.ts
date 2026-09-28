import { adminCollectionCreateSchema } from "@eckamcreation/api-contracts";
import { PERMISSIONS } from "@eckamcreation/auth";
import { requirePermission } from "../../../../lib/auth/guards";
import { getCollectionService } from "../../../../lib/catalogue";
import { jsonOk, withApiHandler } from "../../../../lib/http";
import { parseJsonBody } from "../../../../lib/parse-json";

export const GET = withApiHandler(async (request, requestId) => {
  await requirePermission(request, PERMISSIONS.CATALOGUE_READ);
  const items = await getCollectionService().listPublic();
  return jsonOk({ items }, { requestId });
});

export const POST = withApiHandler(async (request, requestId) => {
  const staff = await requirePermission(request, PERMISSIONS.CATALOGUE_WRITE);
  const body = await parseJsonBody(request, adminCollectionCreateSchema);
  const collection = await getCollectionService().create(body, staff.staffUserId);
  return jsonOk(collection, { status: 201, requestId });
});
