import { createHash } from "node:crypto";
import type { PrismaClient } from "@eckamcreation/database";
import { conflict } from "./errors";

/**
 * Simple IdempotencyRecord helper for mutating checkout operations.
 * Replays stored status when the same scope+key is seen again.
 * Does not store response bodies (avoids large JSON / secrets).
 */
export async function beginIdempotency(
  prisma: PrismaClient,
  input: { scope: string; key: string; requestHash?: string; ttlMs?: number },
): Promise<
  | { replay: true; statusCode: number; responseHash?: string | null }
  | { replay: false; recordId: string }
> {
  const existing = await prisma.idempotencyRecord.findUnique({
    where: { scope_key: { scope: input.scope, key: input.key } },
  });
  if (existing) {
    if (existing.requestHash && input.requestHash && existing.requestHash !== input.requestHash) {
      throw conflict("Idempotency-Key reused with a different request body");
    }
    if (existing.statusCode != null) {
      return {
        replay: true,
        statusCode: existing.statusCode,
        responseHash: existing.responseHash,
      };
    }
  }

  const expiresAt = new Date(Date.now() + (input.ttlMs ?? 24 * 60 * 60 * 1000));
  try {
    const row = await prisma.idempotencyRecord.create({
      data: {
        scope: input.scope,
        key: input.key,
        requestHash: input.requestHash,
        expiresAt,
      },
    });
    return { replay: false, recordId: row.id };
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code: string }).code === "P2002"
    ) {
      const raced = await prisma.idempotencyRecord.findUnique({
        where: { scope_key: { scope: input.scope, key: input.key } },
      });
      if (raced?.statusCode != null) {
        return {
          replay: true,
          statusCode: raced.statusCode,
          responseHash: raced.responseHash,
        };
      }
      throw conflict("Idempotent request is already in progress");
    }
    throw error;
  }
}

export async function completeIdempotency(
  prisma: PrismaClient,
  recordId: string,
  statusCode: number,
  responseHash?: string,
): Promise<void> {
  await prisma.idempotencyRecord.update({
    where: { id: recordId },
    data: { statusCode, responseHash },
  });
}

export function hashRequestBody(body: unknown): string {
  return createHash("sha256").update(JSON.stringify(body ?? {})).digest("hex");
}

export function readIdempotencyKey(request: Request): string | null {
  const key = request.headers.get("idempotency-key")?.trim();
  return key || null;
}
