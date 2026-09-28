export { PrismaClient } from "@prisma/client";
export type { Prisma } from "@prisma/client";
export { prisma, checkDatabaseHealth } from "./client";
export type { DatabaseHealth } from "./client";

export type CacheStatus = {
  ready: false;
  reason: "redis-not-configured";
};

export function getCacheStatus(): CacheStatus {
  return {
    ready: false,
    reason: "redis-not-configured",
  };
}
