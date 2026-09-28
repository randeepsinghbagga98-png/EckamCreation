export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  // Skip during `next build` — env is enforced at runtime.
  if (process.env.NEXT_PHASE === "phase-production-build") return;

  const { loadRootEnvLocal } = await import("./lib/load-root-env");
  const { getApiEnv } = await import("./lib/env");
  const { logger } = await import("./lib/logger");

  loadRootEnvLocal();
  try {
    getApiEnv();
    logger.info("api.env_validated", { hasDatabaseUrl: true });
  } catch (error) {
    logger.error("api.env_invalid", {
      name: error instanceof Error ? error.name : "unknown",
    });
    // Fail fast when serving production traffic without a database URL.
    if (process.env.NODE_ENV === "production") {
      throw error;
    }
  }
}
