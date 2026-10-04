import { CONTRACT_VERSION, contractGroups } from "@eckamcreation/api-contracts";
import { jsonOk, withApiHandler } from "../../lib/http";

export const GET = withApiHandler(async (_request, requestId) => {
  return jsonOk(
    {
      service: "eckamcreation-api",
      contractVersion: CONTRACT_VERSION,
      phase: "phase-3.3-catalogue",
      groups: contractGroups.map((name) => ({
        name,
        handlers:
          name === "health" ||
          name === "auth" ||
          name === "catalogue" ||
          name === "admin" ||
          name === "ai"
            ? "ready"
            : "not_implemented",
      })),
    },
    { requestId },
  );
});
