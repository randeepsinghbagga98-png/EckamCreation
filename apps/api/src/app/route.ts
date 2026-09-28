import { CONTRACT_VERSION } from "@eckamcreation/api-contracts";
import { jsonOk, withApiHandler } from "../lib/http";

export const GET = withApiHandler(async (_request, requestId) => {
  return jsonOk(
    {
      service: "eckamcreation-api",
      status: "foundation-ready",
      contractVersion: CONTRACT_VERSION,
      docs: "/v1",
    },
    { requestId },
  );
});
