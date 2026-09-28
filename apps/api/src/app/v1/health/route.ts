import { CONTRACT_VERSION } from "@eckamcreation/api-contracts";
import { checkDatabaseHealth, getCacheStatus } from "@eckamcreation/database";
import { jsonOk, withApiHandler } from "../../../lib/http";
import { loadRootEnvLocal } from "../../../lib/load-root-env";

export const GET = withApiHandler(async (_request, requestId) => {
  loadRootEnvLocal();

  const database = await checkDatabaseHealth();
  const cache = getCacheStatus();
  const apiUp = true;
  const overall = apiUp && database.ready ? "ok" : "degraded";

  return jsonOk(
    {
      status: overall,
      contractVersion: CONTRACT_VERSION,
      api: {
        status: "up" as const,
      },
      database: {
        status: database.ready ? ("up" as const) : ("down" as const),
        schema: database.schema,
        latencyMs: database.latencyMs,
      },
      cache: {
        status: cache.ready ? ("up" as const) : ("down" as const),
        reason: cache.reason,
      },
      timestamp: new Date().toISOString(),
    },
    {
      requestId,
      status: overall === "ok" ? 200 : 503,
    },
  );
});
