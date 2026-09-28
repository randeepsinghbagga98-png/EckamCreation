import { type ApiEnv, validateApiEnv } from "@eckamcreation/config";
import { loadRootEnvLocal } from "./load-root-env";

let cached: ApiEnv | null = null;

/** Validated API env. Requires DATABASE_URL; provider keys remain optional. */
export function getApiEnv(): ApiEnv {
  if (cached) return cached;
  loadRootEnvLocal();
  cached = validateApiEnv(process.env);
  return cached;
}

export function resetApiEnvCache(): void {
  cached = null;
}
