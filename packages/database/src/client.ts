import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  __eckamPrisma?: PrismaClient;
};

function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

/** Shared Prisma client — reuse across requests (hot-reload safe). */
export const prisma = globalForPrisma.__eckamPrisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.__eckamPrisma = prisma;
}

export type DatabaseHealth = {
  ready: boolean;
  schema: "phase-1";
  latencyMs: number;
  error?: "unreachable";
};

/** Live connectivity check. Does not expose connection strings or secrets. */
export async function checkDatabaseHealth(): Promise<DatabaseHealth> {
  const started = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return {
      ready: true,
      schema: "phase-1",
      latencyMs: Date.now() - started,
    };
  } catch {
    return {
      ready: false,
      schema: "phase-1",
      latencyMs: Date.now() - started,
      error: "unreachable",
    };
  }
}
